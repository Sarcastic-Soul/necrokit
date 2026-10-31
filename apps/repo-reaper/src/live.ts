import { z } from "zod";
import { fetchJson, unavailableFrom, type AdapterResult, type Evidence, type HttpOptions, type Unavailable } from "@necrokit/core";

const DAY_MS = 86_400_000;
const STALE_ISSUE_DAYS = 180;
const SOURCE = "github";
const API = "https://api.github.com";
const PULLS_PAGE = 100;

const RepoSchema = z.object({
  full_name: z.string(),
  archived: z.boolean(),
  pushed_at: z.string(),
  default_branch: z.string(),
  open_issues_count: z.number().int().min(0),
  license: z.object({ spdx_id: z.string().nullable() }).nullable(),
});
const ReleaseSchema = z.object({ published_at: z.string().nullable() });
const SearchSchema = z.object({ total_count: z.number().int().min(0) });
const PullsSchema = z.array(z.object({ created_at: z.string() }));
const RunsSchema = z.object({ workflow_runs: z.array(z.object({ conclusion: z.string().nullable(), status: z.string() })) });

export interface LiveOptions extends HttpOptions {
  now?: Date;
  /** Optional GitHub token. Raises the rate limit; never required. */
  githubToken?: string;
}

/** Accepts `owner/repo`, `https://github.com/owner/repo`, or a `.git` clone URL. */
export function parseRepository(input: string): string | null {
  const trimmed = input.trim().replace(/\/+$/, "");
  const m = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

/**
 * Collects live evidence for one public GitHub repository. Each endpoint is
 * independent: a failed call becomes an unavailable entry and the rules that
 * need it simply do not fire.
 */
export async function fetchRepositoryEvidence(input: string, options: LiveOptions = {}): Promise<AdapterResult> {
  const now = options.now ?? new Date();
  const observedAt = now.toISOString();
  const evidence: Evidence[] = [];
  const unavailable: Unavailable[] = [];
  const slug = parseRepository(input);
  if (!slug) {
    return {
      subject: input.trim() || "unknown repository",
      kind: "repository",
      evidence,
      unavailable: [{ id: "repo", source: SOURCE, reason: "Enter a repository as owner/name or a github.com URL." }],
    };
  }

  const http: HttpOptions = { ...options, headers: { Accept: "application/vnd.github+json", ...(options.githubToken ? { Authorization: `Bearer ${options.githubToken}` } : {}) } };
  const web = `https://github.com/${slug}`;
  const fact = (field: string, value: Evidence["value"], url: string | null): Evidence => ({
    id: `repo:${field}`,
    source: SOURCE,
    label: field,
    value,
    observedAt,
    url,
  });

  const repoResult = await fetchJson(`${API}/repos/${slug}`, http);
  if (!repoResult.ok) {
    unavailable.push(unavailableFrom("repo", SOURCE, repoResult));
    return { subject: slug, kind: "repository", evidence, unavailable };
  }
  const repo = RepoSchema.safeParse(repoResult.body);
  if (!repo.success) {
    unavailable.push({ id: "repo", source: SOURCE, reason: "GitHub returned repository data in an unexpected shape." });
    return { subject: slug, kind: "repository", evidence, unavailable };
  }
  const r = repo.data;
  const license = r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION" ? r.license.spdx_id : r.license ? "Other" : null;
  evidence.push(fact("fullName", r.full_name, web));
  evidence.push(fact("archived", r.archived, web));
  evidence.push(fact("pushedAt", r.pushed_at, `${web}/commits`));
  evidence.push(fact("license", license, `${web}#license`));

  const staleBefore = new Date(now.getTime() - STALE_ISSUE_DAYS * DAY_MS).toISOString().slice(0, 10);
  const q = (query: string) => `${API}/search/issues?per_page=1&q=${encodeURIComponent(`repo:${slug} ${query}`)}`;
  // One search call per scan: unauthenticated search allows only 10 requests a minute.
  const [release, readme, stale, pulls, runs] = await Promise.all([
    fetchJson(`${API}/repos/${slug}/releases/latest`, http),
    fetchJson(`${API}/repos/${slug}/readme`, http),
    fetchJson(q(`is:issue is:open updated:<${staleBefore}`), http),
    fetchJson(`${API}/repos/${slug}/pulls?state=open&sort=created&direction=asc&per_page=${PULLS_PAGE}`, http),
    fetchJson(`${API}/repos/${slug}/actions/runs?per_page=1&branch=${encodeURIComponent(r.default_branch)}&status=completed`, http),
  ]);

  // A 404 on releases/latest or readme is evidence of absence, not a failure.
  if (release.ok) {
    const parsed = ReleaseSchema.safeParse(release.body);
    evidence.push(fact("latestReleaseAt", parsed.success ? parsed.data.published_at : null, `${web}/releases`));
  } else if (release.status === 404) {
    evidence.push(fact("latestReleaseAt", null, `${web}/releases`));
  } else {
    unavailable.push(unavailableFrom("latestReleaseAt", SOURCE, release));
  }

  if (readme.ok) evidence.push(fact("hasReadme", true, `${web}#readme`));
  else if (readme.status === 404) evidence.push(fact("hasReadme", false, web));
  else unavailable.push(unavailableFrom("hasReadme", SOURCE, readme));

  if (stale.ok) {
    const parsed = SearchSchema.safeParse(stale.body);
    if (parsed.success) evidence.push(fact("staleIssues", parsed.data.total_count, `${web}/issues?q=${encodeURIComponent(`is:issue is:open updated:<${staleBefore}`)}`));
    else unavailable.push({ id: "staleIssues", source: SOURCE, reason: "GitHub search returned an unexpected shape." });
  } else {
    unavailable.push(unavailableFrom("staleIssues", SOURCE, stale));
  }

  // GitHub counts pull requests as issues, so open issues = open_issues_count - open pulls.
  // The pull count is capped at one page; past that both numbers are lower bounds.
  const parsedPulls = pulls.ok ? PullsSchema.safeParse(pulls.body) : null;
  if (parsedPulls?.success) {
    const open = parsedPulls.data;
    const first = open[0];
    const days = first ? Math.max(0, Math.floor((now.getTime() - Date.parse(first.created_at)) / DAY_MS)) : 0;
    evidence.push(fact("openPullRequests", open.length, `${web}/pulls`));
    evidence.push(fact("oldestPullRequestDays", days, `${web}/pulls?q=is%3Apr+is%3Aopen+sort%3Acreated-asc`));
    evidence.push(fact("openIssues", Math.max(0, r.open_issues_count - open.length), `${web}/issues`));
  } else if (!pulls.ok) {
    unavailable.push(unavailableFrom("pullRequests", SOURCE, pulls));
  } else {
    unavailable.push({ id: "pullRequests", source: SOURCE, reason: "GitHub returned pull requests in an unexpected shape." });
  }

  if (runs.ok) {
    const parsed = RunsSchema.safeParse(runs.body);
    if (parsed.success) {
      const conclusion = parsed.data.workflow_runs[0]?.conclusion;
      const status = conclusion === "success" ? "passing" : conclusion === "failure" ? "failing" : "unknown";
      evidence.push(fact("ciStatus", status, `${web}/actions`));
    } else {
      unavailable.push({ id: "ciStatus", source: SOURCE, reason: "GitHub returned workflow runs in an unexpected shape." });
    }
  } else {
    unavailable.push(unavailableFrom("ciStatus", SOURCE, runs));
  }

  return { subject: r.full_name, kind: "repository", evidence, unavailable };
}
