import { z } from "zod";
import { fetchJson, unavailableFrom, type AdapterResult, type Evidence, type HttpOptions, type Unavailable } from "@necrokit/core";

const DAY_MS = 86_400_000;
const KIND = "npm-package";

const RegistryDocSchema = z.object({
  name: z.string().min(1),
  "dist-tags": z.object({ latest: z.string().min(1) }),
  time: z.record(z.string()),
  maintainers: z.array(z.unknown()).default([]),
  repository: z.union([z.string(), z.object({ url: z.string() })]).optional(),
  versions: z.record(
    z.object({
      deprecated: z.union([z.string(), z.boolean()]).optional(),
      dependencies: z.record(z.string()).optional(),
    }),
  ),
});

const DownloadsSchema = z.object({ downloads: z.number().int().min(0) });
const GithubRepoSchema = z.object({ archived: z.boolean(), pushed_at: z.string() });

export interface LiveOptions extends HttpOptions {
  now?: Date;
  /** Optional GitHub token for the repository lookup. Never required. */
  githubToken?: string;
}

/** `git+https://github.com/o/r.git`, `github:o/r`, and friends -> `o/r`. */
export function githubSlug(repository: string | { url: string } | undefined): string | null {
  const raw = typeof repository === "string" ? repository : repository?.url;
  if (!raw) return null;
  const short = raw.match(/^(?:github:)?([\w.-]+)\/([\w.-]+)$/);
  const long = raw.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[#/].*)?$/);
  const m = long ?? short;
  return m ? `${m[1]}/${m[2]}` : null;
}

function encodeName(name: string): string {
  return name.startsWith("@") ? `@${encodeURIComponent(name.slice(1))}` : encodeURIComponent(name);
}

/**
 * Collects live evidence for one npm package from the public registry, the
 * downloads API, and (when the repository is on GitHub) the GitHub API.
 * Each failed source becomes an unavailable entry; the scan still completes.
 */
export async function fetchPackageEvidence(name: string, options: LiveOptions = {}): Promise<AdapterResult> {
  const now = options.now ?? new Date();
  const observedAt = now.toISOString();
  const trimmed = name.trim();
  const evidence: Evidence[] = [];
  const unavailable: Unavailable[] = [];
  const npmUrl = `https://www.npmjs.com/package/${trimmed}`;
  const fact = (label: string, value: Evidence["value"], source: string, url: string | null): Evidence => ({
    id: `${source}:${label}`,
    source,
    label,
    value,
    observedAt,
    url,
  });

  if (!/^(@[\w.-]+\/)?[\w.-]+$/.test(trimmed)) {
    return {
      subject: trimmed || "unknown-package",
      kind: KIND,
      evidence,
      unavailable: [{ id: "registry", source: "npm-registry", reason: "That is not a valid npm package name." }],
    };
  }

  const [docResult, downloadsResult] = await Promise.all([
    fetchJson(`https://registry.npmjs.org/${encodeName(trimmed)}`, options),
    fetchJson(`https://api.npmjs.org/downloads/point/last-week/${trimmed}`, options),
  ]);

  if (!docResult.ok) {
    unavailable.push(unavailableFrom("registry", "npm-registry", docResult));
    return { subject: trimmed, kind: KIND, evidence, unavailable };
  }
  const doc = RegistryDocSchema.safeParse(docResult.body);
  if (!doc.success) {
    unavailable.push({ id: "registry", source: "npm-registry", reason: "The registry returned a document in an unexpected shape." });
    return { subject: trimmed, kind: KIND, evidence, unavailable };
  }

  const d = doc.data;
  const latest = d["dist-tags"].latest;
  const latestManifest = d.versions[latest];
  const publishedAt = d.time[latest];
  const deps = Object.entries(latestManifest?.dependencies ?? {});

  evidence.push(fact("latest-version", latest, "npm-registry", `${npmUrl}/v/${latest}`));
  evidence.push(fact("dependency-count", deps.length, "npm-registry", `${npmUrl}?activeTab=dependencies`));
  for (const [dep, range] of deps) {
    evidence.push({ ...fact("declared-range", `${dep}@${range}`, "npm-registry", null), id: `npm-registry:declared:${dep}` });
  }
  if (publishedAt) {
    const days = Math.max(0, Math.floor((now.getTime() - Date.parse(publishedAt)) / DAY_MS));
    evidence.push(fact("days-since-last-publish", days, "npm-registry", `${npmUrl}?activeTab=versions`));
  } else {
    unavailable.push({ id: "publish-date", source: "npm-registry", reason: `No publish time is recorded for ${latest}.` });
  }
  evidence.push(fact("deprecated", Boolean(latestManifest?.deprecated), "npm-registry", npmUrl));
  if (typeof latestManifest?.deprecated === "string" && latestManifest.deprecated.length > 0) {
    evidence.push(fact("deprecation-notice", latestManifest.deprecated, "npm-registry", npmUrl));
  }
  evidence.push(fact("maintainer-count", d.maintainers.length, "npm-registry", npmUrl));

  if (downloadsResult.ok) {
    const parsed = DownloadsSchema.safeParse(downloadsResult.body);
    if (parsed.success) {
      evidence.push(fact("weekly-downloads", parsed.data.downloads, "npm-downloads", `https://npm-stat.com/charts.html?package=${trimmed}`));
    } else {
      unavailable.push({ id: "downloads", source: "npm-downloads", reason: "Download counts came back in an unexpected shape." });
    }
  } else {
    unavailable.push(unavailableFrom("downloads", "npm-downloads", downloadsResult));
  }

  const slug = githubSlug(d.repository);
  if (!slug) {
    unavailable.push({ id: "repository", source: "github", reason: "The package does not link a GitHub repository, so archive and commit signals are unknown." });
    return { subject: d.name, kind: KIND, evidence, unavailable };
  }

  const headers = options.githubToken ? { Authorization: `Bearer ${options.githubToken}` } : undefined;
  const repoResult = await fetchJson(`https://api.github.com/repos/${slug}`, { ...options, ...(headers ? { headers } : {}) });
  const repoUrl = `https://github.com/${slug}`;
  if (!repoResult.ok) {
    unavailable.push(unavailableFrom("repository", "github", repoResult));
  } else {
    const repo = GithubRepoSchema.safeParse(repoResult.body);
    if (repo.success) {
      const days = Math.max(0, Math.floor((now.getTime() - Date.parse(repo.data.pushed_at)) / DAY_MS));
      evidence.push(fact("repository-archived", repo.data.archived, "github", repoUrl));
      evidence.push(fact("days-since-last-commit", days, "github", `${repoUrl}/commits`));
    } else {
      unavailable.push({ id: "repository", source: "github", reason: "GitHub returned repository data in an unexpected shape." });
    }
  }

  return { subject: d.name, kind: KIND, evidence, unavailable };
}
