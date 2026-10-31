import { buildReport, type AdapterResult, type Evidence, type Report } from "@necrokit/core";
import { adaptRepository } from "./adapter.ts";
import { fetchRepositoryEvidence, type LiveOptions } from "./live.ts";
import { repoRules } from "./rules.ts";

/** Adds the scan time as evidence so age rules stay pure. Skipped when nothing was collected. */
function withReference(adapted: AdapterResult, generatedAt: string): AdapterResult {
  if (adapted.evidence.length === 0) return adapted;
  const reference: Evidence = {
    id: "scan:generatedAt",
    source: "scan",
    label: "generatedAt",
    value: generatedAt,
    observedAt: generatedAt,
    url: null,
  };
  return { ...adapted, evidence: [...adapted.evidence, reference] };
}

export function scanRepository(snapshot: unknown, generatedAt: string): Report {
  return buildReport(withReference(adaptRepository(snapshot), generatedAt), { rules: repoRules, generatedAt });
}

/** Live scan of a public GitHub repository. Never throws; failures land in `unavailable`. */
export async function scanRepositoryLive(input: string, options: LiveOptions = {}): Promise<Report> {
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();
  const adapted = await fetchRepositoryEvidence(input, { ...options, now });
  return buildReport(withReference(adapted, generatedAt), { rules: repoRules, generatedAt });
}
