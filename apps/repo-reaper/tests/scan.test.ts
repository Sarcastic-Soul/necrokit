import { readFileSync } from "node:fs";
import { toMarkdown } from "@necrokit/core";
import { describe, expect, it } from "vitest";
import { adaptRepository } from "../src/adapter.ts";
import { scanRepository } from "../src/run.ts";

const GENERATED_AT = "2026-10-31T00:00:00.000Z";

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../src/fixtures/${name}`, import.meta.url), "utf8"));
}

describe("active fixture", () => {
  it("scores in the healthy band with no findings", () => {
    const report = scanRepository(fixture("active.json"), GENERATED_AT);
    expect(report.score.band).toBe("healthy");
    expect(report.findings).toEqual([]);
    expect(report.unavailable).toEqual([]);
  });
});

describe("neglected fixture", () => {
  it("reports warnings and a revival plan", () => {
    const report = scanRepository(fixture("neglected.json"), GENERATED_AT);
    const ruleIds = report.findings.map((f) => f.ruleId);
    expect(ruleIds).toEqual(expect.arrayContaining(["ci-failing", "stale-issues", "old-pull-requests"]));
    expect(report.findings.some((f) => f.severity === "warning")).toBe(true);
    expect(report.plan.steps.length).toBe(report.findings.length);
    expect(report.plan.steps[0]?.priority).toBe(1);
  });
});

describe("archived fixture", () => {
  it("reports a critical finding", () => {
    const report = scanRepository(fixture("archived.json"), GENERATED_AT);
    expect(report.findings.some((f) => f.ruleId === "archived" && f.severity === "critical")).toBe(true);
    expect(report.findings.some((f) => f.ruleId === "no-license")).toBe(true);
  });
});

describe("malformed input", () => {
  it("returns an unavailable entry instead of throwing", () => {
    expect(() => adaptRepository({ fullName: 42 })).not.toThrow();
    const result = adaptRepository({ fullName: 42 });
    expect(result.evidence).toEqual([]);
    expect(result.unavailable).toHaveLength(1);
    expect(result.unavailable[0]?.source).toBe("repository-snapshot");
  });

  it("does not throw for null or primitive input", () => {
    expect(adaptRepository(null).unavailable).toHaveLength(1);
    expect(adaptRepository("nope").unavailable).toHaveLength(1);
  });
});

describe("markdown snapshot", () => {
  it("matches the neglected fixture report", () => {
    const report = scanRepository(fixture("neglected.json"), GENERATED_AT);
    expect(toMarkdown(report)).toMatchSnapshot();
  });
});
