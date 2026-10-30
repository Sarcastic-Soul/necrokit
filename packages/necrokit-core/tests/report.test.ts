import { describe, expect, it } from "vitest";
import { AdapterResultSchema, type AdapterResult, type Rule, buildReport, toMarkdown } from "../src/index.js";

const fresh: AdapterResult = {
  subject: "example",
  kind: "package",
  evidence: [
    {
      id: "e1",
      source: "fixture",
      label: "days-since-publish",
      value: 30,
      observedAt: "2026-10-31T00:00:00.000Z",
      url: null,
    },
  ],
  unavailable: [],
};

const staleRule: Rule = {
  id: "stale-release",
  title: "Release is stale",
  severity: "warning",
  weight: 60,
  suggestedAction: "Check for a maintained alternative.",
  evaluate(evidence) {
    const e = evidence.find((x) => x.label === "days-since-publish");
    if (!e || typeof e.value !== "number") return null;
    if (e.value < 365) return null;
    return { evidenceIds: [e.id], explanation: `Last publish ${e.value} days ago.` };
  },
};

describe("buildReport", () => {
  it("produces a healthy report when no rule fires", () => {
    const report = buildReport(fresh, { rules: [staleRule], generatedAt: "2026-10-31T00:00:00.000Z" });
    expect(report.findings).toEqual([]);
    expect(report.score.score).toBe(100);
    expect(report.plan.steps).toEqual([]);
  });

  it("reports stale evidence with an evidence reference and a plan step", () => {
    const stale: AdapterResult = {
      ...fresh,
      evidence: [{ ...fresh.evidence[0]!, value: 800 }],
    };
    const report = buildReport(stale, { rules: [staleRule], generatedAt: "2026-10-31T00:00:00.000Z" });
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]!.evidenceIds).toEqual(["e1"]);
    expect(report.score.score).toBeLessThan(100);
    expect(report.plan.steps[0]!.priority).toBe(1);
  });

  it("keeps unavailable evidence explicit instead of guessing", () => {
    const partial: AdapterResult = {
      ...fresh,
      evidence: [],
      unavailable: [{ id: "u1", source: "github", reason: "rate limited" }],
    };
    const report = buildReport(partial, { rules: [staleRule], generatedAt: "2026-10-31T00:00:00.000Z" });
    expect(report.unavailable).toHaveLength(1);
    expect(report.findings).toEqual([]);
  });

  it("rejects malformed adapter output at the boundary", () => {
    expect(AdapterResultSchema.safeParse({ subject: "", kind: "x", evidence: [], unavailable: [] }).success).toBe(false);
  });

  it("renders deterministic markdown", () => {
    const report = buildReport(fresh, { rules: [staleRule], generatedAt: "2026-10-31T00:00:00.000Z" });
    expect(toMarkdown(report)).toContain("# example");
    expect(toMarkdown(report)).toContain("Score: 100/100 (healthy)");
  });
});
