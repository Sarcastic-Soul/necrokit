import type { FetchLike } from "@necrokit/core";
import { describe, expect, it } from "vitest";
import { parseRepository } from "../src/live.ts";
import { scanRepositoryLive } from "../src/run.ts";

const NOW = new Date("2026-10-31T00:00:00.000Z");
type Route = { status: number; body?: unknown };

// Longest matching prefix wins, so "/repos/a/b" does not shadow "/repos/a/b/pulls".
function fakeFetch(routes: Record<string, Route>): FetchLike {
  return async (url) => {
    const key = Object.keys(routes).filter((p) => url.startsWith(p)).sort((a, b) => b.length - a.length)[0];
    const route = key ? routes[key]! : { status: 404 };
    return { ok: route.status < 400, status: route.status, headers: { get: () => null }, json: async () => route.body };
  };
}

const API = "https://api.github.com";
const repo = { full_name: "acme/tool", archived: false, pushed_at: "2026-01-01T00:00:00Z", default_branch: "main", open_issues_count: 30, license: null };

describe("live repository scan", () => {
  it("maps GitHub responses into the same evidence the fixtures use", async () => {
    const report = await scanRepositoryLive("https://github.com/acme/tool", {
      now: NOW,
      fetch: fakeFetch({
        [`${API}/repos/acme/tool`]: { status: 200, body: repo },
        [`${API}/repos/acme/tool/releases/latest`]: { status: 404 },
        [`${API}/repos/acme/tool/readme`]: { status: 200, body: {} },
        [`${API}/search/issues`]: { status: 200, body: { total_count: 12 } },
        [`${API}/repos/acme/tool/pulls`]: { status: 200, body: [{ created_at: "2026-01-01T00:00:00Z" }, { created_at: "2026-09-01T00:00:00Z" }] },
        [`${API}/repos/acme/tool/actions/runs`]: { status: 200, body: { workflow_runs: [{ conclusion: "failure", status: "completed" }] } },
      }),
    });
    const value = (label: string) => report.evidence.find((e) => e.label === label)?.value;
    expect(value("openIssues")).toBe(28);
    expect(value("openPullRequests")).toBe(2);
    expect(value("oldestPullRequestDays")).toBe(303);
    expect(value("latestReleaseAt")).toBeNull();
    expect(report.unavailable).toEqual([]);
    expect(report.findings.map((f) => f.ruleId).sort()).toEqual(
      ["ci-failing", "no-license", "no-recent-release", "old-pull-requests", "stale-issues"],
    );
  });

  it("keeps partial evidence when some endpoints fail", async () => {
    const report = await scanRepositoryLive("acme/tool", {
      now: NOW,
      fetch: fakeFetch({
        [`${API}/repos/acme/tool`]: { status: 200, body: { ...repo, license: { spdx_id: "MIT" } } },
        [`${API}/repos/acme/tool/readme`]: { status: 500 },
        [`${API}/search/issues`]: { status: 500 },
        [`${API}/repos/acme/tool/pulls`]: { status: 200, body: [] },
        [`${API}/repos/acme/tool/actions/runs`]: { status: 502 },
      }),
    });
    expect(report.unavailable.map((u) => u.id).sort()).toEqual(["ciStatus", "hasReadme", "staleIssues"]);
    expect(report.score.score).not.toBeNull();
  });

  it("is unscored when the repository cannot be read", async () => {
    const report = await scanRepositoryLive("acme/missing", { now: NOW, fetch: fakeFetch({}) });
    expect(report.score).toMatchObject({ score: null, band: "unknown" });
    expect(report.evidence).toEqual([]);
  });
});

describe("parseRepository", () => {
  it.each([
    ["acme/tool", "acme/tool"],
    ["https://github.com/acme/tool", "acme/tool"],
    ["github.com/acme/tool.git", "acme/tool"],
    ["https://github.com/acme/tool/", "acme/tool"],
    ["not a repo", null],
  ])("%s -> %s", (input, expected) => {
    expect(parseRepository(input)).toBe(expected);
  });
});
