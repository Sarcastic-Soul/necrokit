import { describe, expect, it } from "vitest";
import type { FetchLike } from "@necrokit/core";
import { githubSlug } from "../src/live.js";
import { scanPackageLive } from "../src/run.js";

const NOW = new Date("2026-10-31T00:00:00.000Z");
type Route = { status: number; body?: unknown; headers?: Record<string, string> };

function fakeFetch(routes: Record<string, Route>): FetchLike {
  return async (url) => {
    const key = Object.keys(routes).find((prefix) => url.startsWith(prefix));
    const route = key ? routes[key]! : { status: 404 };
    const headers = route.headers ?? {};
    return { ok: route.status < 400, status: route.status, headers: { get: (n) => headers[n.toLowerCase()] ?? null }, json: async () => route.body };
  };
}

const registryDoc = {
  name: "old-shim",
  "dist-tags": { latest: "1.0.0" },
  time: { "1.0.0": "2022-01-01T00:00:00.000Z" },
  maintainers: [{ name: "solo" }],
  repository: { url: "git+https://github.com/acme/old-shim.git" },
  versions: { "1.0.0": { deprecated: "Use new-shim instead", dependencies: { tiny: "^1.0.0" } } },
};

describe("live package scan", () => {
  it("builds evidence from registry, downloads, and GitHub", async () => {
    const report = await scanPackageLive("old-shim", {
      now: NOW,
      fetch: fakeFetch({
        "https://registry.npmjs.org/old-shim": { status: 200, body: registryDoc },
        "https://api.npmjs.org/downloads": { status: 200, body: { downloads: 120 } },
        "https://api.github.com/repos/acme/old-shim": { status: 200, body: { archived: true, pushed_at: "2022-02-01T00:00:00Z" } },
      }),
    });
    expect(report.unavailable).toEqual([]);
    expect(report.findings.map((f) => f.ruleId).sort()).toEqual(
      ["deprecated", "low-downloads", "repository-archived", "single-maintainer", "stale-release"],
    );
    expect(report.findings.find((f) => f.ruleId === "deprecated")?.explanation).toContain("Use new-shim instead");
    expect(report.evidence.every((e) => e.observedAt === NOW.toISOString())).toBe(true);
    expect(report.score.band).toBe("critical");
  });

  it("returns an unscored report when the package does not exist", async () => {
    const report = await scanPackageLive("no-such-package", { now: NOW, fetch: fakeFetch({}) });
    expect(report.score.score).toBeNull();
    expect(report.unavailable[0]?.reason).toBe("Not found (HTTP 404).");
  });

  it("still scores registry evidence when GitHub is rate limited", async () => {
    const report = await scanPackageLive("old-shim", {
      now: NOW,
      fetch: fakeFetch({
        "https://registry.npmjs.org/": { status: 200, body: { ...registryDoc, versions: { "1.0.0": {} } } },
        "https://api.npmjs.org/": { status: 200, body: { downloads: 50000 } },
        "https://api.github.com/": { status: 403, headers: { "x-ratelimit-remaining": "0" } },
      }),
    });
    expect(report.unavailable.map((u) => u.source)).toEqual(["github"]);
    expect(report.unavailable[0]?.reason).toMatch(/^Rate limit reached/);
    expect(report.score.score).not.toBeNull();
  });

  it("marks repository signals unavailable when no GitHub repository is linked", async () => {
    const { repository: _omit, ...noRepo } = registryDoc;
    const report = await scanPackageLive("old-shim", {
      now: NOW,
      fetch: fakeFetch({
        "https://registry.npmjs.org/": { status: 200, body: noRepo },
        "https://api.npmjs.org/": { status: 200, body: { downloads: 120 } },
      }),
    });
    expect(report.unavailable.map((u) => u.id)).toEqual(["repository"]);
    expect(report.findings.map((f) => f.ruleId)).not.toContain("repository-archived");
    expect(report.findings.map((f) => f.ruleId)).toContain("deprecated");
  });

  it("rejects invalid package names without any request", async () => {
    let called = false;
    const report = await scanPackageLive("../etc/passwd", { now: NOW, fetch: async () => { called = true; throw new Error(); } });
    expect(called).toBe(false);
    expect(report.unavailable[0]?.reason).toContain("not a valid npm package name");
  });
});

describe("githubSlug", () => {
  it.each([
    ["git+https://github.com/a/b.git", "a/b"],
    ["github:a/b", "a/b"],
    ["a/b", "a/b"],
    ["git://github.com/a/b-c.js.git", "a/b-c.js"],
    [{ url: "https://github.com/a/b/tree/main/packages/x" }, "a/b"],
    ["https://gitlab.com/a/b", null],
    [undefined, null],
  ])("%j -> %j", (input, expected) => {
    expect(githubSlug(input)).toBe(expected);
  });
});
