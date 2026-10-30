import { buildReport, type Evidence, type Report } from "@necrokit/core";
import { adaptRepository } from "./adapter.ts";
import { repoRules } from "./rules.ts";

export function scanRepository(snapshot: unknown, generatedAt: string): Report {
  const adapted = adaptRepository(snapshot);
  const reference: Evidence = {
    id: "scan:generatedAt",
    source: "scan",
    label: "generatedAt",
    value: generatedAt,
    observedAt: generatedAt,
    url: null,
  };
  return buildReport(
    { ...adapted, evidence: [...adapted.evidence, reference] },
    { rules: repoRules, generatedAt },
  );
}
