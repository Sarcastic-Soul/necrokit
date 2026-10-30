import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Finding } from "../src/contracts.js";
import { scoreFindings } from "../src/scoring.js";

const severity = fc.constantFrom("info", "warning", "critical") as fc.Arbitrary<Finding["severity"]>;

const findingArb: fc.Arbitrary<Finding> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 12 }),
  ruleId: fc.string({ minLength: 1, maxLength: 12 }),
  title: fc.constant("t"),
  severity,
  weight: fc.integer({ min: 0, max: 100 }),
  explanation: fc.constant("e"),
  evidenceIds: fc.constant([]),
  suggestedAction: fc.constant("a"),
});

const findingsArb = fc.array(findingArb, { maxLength: 20 });

describe("scoreFindings properties", () => {
  it("always returns a score between 0 and 100", () => {
    fc.assert(
      fc.property(findingsArb, (findings) => {
        const { score } = scoreFindings(findings);
        return score >= 0 && score <= 100;
      }),
    );
  });

  it("adding a finding never increases the score", () => {
    fc.assert(
      fc.property(findingsArb, findingArb, (findings, extra) => {
        return scoreFindings([...findings, extra]).score <= scoreFindings(findings).score;
      }),
    );
  });

  it("adding a critical finding never improves the score", () => {
    fc.assert(
      fc.property(findingsArb, fc.integer({ min: 0, max: 100 }), (findings, weight) => {
        const critical: Finding = {
          id: "crit",
          ruleId: "crit",
          title: "t",
          severity: "critical",
          weight,
          explanation: "e",
          evidenceIds: [],
          suggestedAction: "a",
        };
        return scoreFindings([...findings, critical]).score <= scoreFindings(findings).score;
      }),
    );
  });

  it("is independent of finding order", () => {
    fc.assert(
      fc.property(findingsArb, (findings) => {
        const reversed = [...findings].reverse();
        return scoreFindings(findings).score === scoreFindings(reversed).score;
      }),
    );
  });

  it("empty findings are perfectly healthy", () => {
    expect(scoreFindings([])).toEqual({
      score: 100,
      band: "healthy",
      breakdown: { info: 0, warning: 0, critical: 0 },
    });
  });
});
