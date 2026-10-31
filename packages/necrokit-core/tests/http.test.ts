import { describe, expect, it } from "vitest";
import { buildReport, fetchJson, type FetchLike } from "../src/index.js";

const respond = (status: number, body: unknown, headers: Record<string, string> = {}): FetchLike =>
  async () => ({ ok: status < 400, status, headers: { get: (n: string) => headers[n.toLowerCase()] ?? null }, json: async () => body });

describe("fetchJson", () => {
  it("returns the parsed body on success", async () => {
    expect(await fetchJson("https://x.test", { fetch: respond(200, { a: 1 }) })).toEqual({ ok: true, status: 200, body: { a: 1 } });
  });

  it("explains a rate limit with the reset time", async () => {
    const result = await fetchJson("https://x.test", {
      fetch: respond(403, {}, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(Date.UTC(2026, 9, 31, 12, 30) / 1000) }),
    });
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(!result.ok && result.reason).toContain("Rate limit reached until 12:30 UTC");
  });

  it("turns a thrown network error into a reason", async () => {
    const result = await fetchJson("https://x.test", { fetch: async () => { throw new Error("ECONNRESET"); } });
    expect(result).toEqual({ ok: false, status: null, reason: "Network error: ECONNRESET" });
  });

  it("times out a request that never answers", async () => {
    const hang: FetchLike = (_url, init) =>
      new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
    const result = await fetchJson("https://x.test", { fetch: hang, timeoutMs: 10 });
    expect(result).toEqual({ ok: false, status: null, reason: "Request timed out." });
  });
});

describe("unscored reports", () => {
  it("does not invent a score when no evidence was collected", () => {
    const report = buildReport(
      { subject: "ghost", kind: "package", evidence: [], unavailable: [{ id: "r", source: "registry", reason: "Not found." }] },
      { rules: [], generatedAt: "2026-10-31T00:00:00.000Z" },
    );
    expect(report.score).toEqual({ score: null, band: "unknown", breakdown: { info: 0, warning: 0, critical: 0 } });
  });
});
