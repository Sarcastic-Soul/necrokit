import type { Evidence, Finding, Severity } from "./contracts.js";

/**
 * A rule inspects normalized evidence and returns zero or one finding.
 * Rules are pure: same evidence in, same finding out.
 */
export interface Rule {
  id: string;
  title: string;
  severity: Severity;
  weight: number;
  /** Returns the evidence ids that triggered the rule, or null when it does not apply. */
  evaluate(evidence: readonly Evidence[]): { evidenceIds: string[]; explanation: string } | null;
  suggestedAction: string;
}

export function runRules(rules: readonly Rule[], evidence: readonly Evidence[]): Finding[] {
  const findings: Finding[] = [];
  for (const rule of rules) {
    const hit = rule.evaluate(evidence);
    if (!hit) continue;
    findings.push({
      id: `${rule.id}:${[...hit.evidenceIds].sort().join(",")}`,
      ruleId: rule.id,
      title: rule.title,
      severity: rule.severity,
      weight: rule.weight,
      explanation: hit.explanation,
      evidenceIds: [...hit.evidenceIds].sort(),
      suggestedAction: rule.suggestedAction,
    });
  }
  return findings.sort((a, b) => a.id.localeCompare(b.id));
}

/** Helper: find evidence by label, returning undefined when absent. */
export function findEvidence(evidence: readonly Evidence[], label: string): Evidence | undefined {
  return evidence.find((e) => e.label === label);
}
