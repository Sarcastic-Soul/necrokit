import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { toMarkdown } from "@necrokit/core";
import { adaptPackageManifest } from "../src/adapter.js";
import { scanPackage } from "../src/run.js";

const load = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../src/fixtures/${name}`, import.meta.url)), "utf8"));

const GENERATED_AT = "2026-10-31T00:00:00.000Z";

describe("package graveyard scan", () => {
  it("does not flag the stable-old fixture as critical", () => {
    const report = scanPackage(load("stable-old.json"), GENERATED_AT);
    expect(report.findings.filter((f) => f.severity === "critical")).toEqual([]);
    expect(report.findings.some((f) => f.ruleId === "stale-release")).toBe(false);
    expect(report.score.band).toBe("healthy");
  });

  it("flags the abandoned fixture as critical", () => {
    const report = scanPackage(load("abandoned.json"), GENERATED_AT);
    const ruleIds = report.findings.filter((f) => f.severity === "critical").map((f) => f.ruleId);
    expect(ruleIds).toEqual(expect.arrayContaining(["deprecated", "repository-archived"]));
    expect(report.score.band).toBe("critical");
  });

  it("returns unavailable evidence instead of throwing on malformed input", () => {
    const inputs: unknown[] = [null, 42, "not a manifest", {}, { name: "x", snapshot: { daysSinceLastPublish: "soon" } }];
    for (const input of inputs) {
      const result = adaptPackageManifest(input);
      expect(result.unavailable.length).toBeGreaterThan(0);
      expect(result.evidence).toEqual([]);
      expect(() => scanPackage(input, GENERATED_AT)).not.toThrow();
    }
  });

  it("emits dependency evidence for valid input", () => {
    const result = adaptPackageManifest(load("stable-old.json"));
    const count = result.evidence.find((e) => e.label === "dependency-count");
    expect(count?.value).toBe(3);
    expect(result.evidence.filter((e) => e.label === "declared-range")).toHaveLength(3);
  });

  it("matches the markdown snapshot for the abandoned fixture", () => {
    expect(toMarkdown(scanPackage(load("abandoned.json"), GENERATED_AT))).toMatchSnapshot();
  });
});
