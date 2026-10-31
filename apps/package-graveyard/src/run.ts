import { buildReport, type Report } from "@necrokit/core";
import { adaptPackageManifest } from "./adapter.js";
import { fetchPackageEvidence, type LiveOptions } from "./live.js";
import { packageRules } from "./rules.js";

export function scanPackage(fixture: unknown, generatedAt: string): Report {
  return buildReport(adaptPackageManifest(fixture), { rules: packageRules, generatedAt });
}

/** Live scan against the public npm registry. Never throws; failures land in `unavailable`. */
export async function scanPackageLive(name: string, options: LiveOptions = {}): Promise<Report> {
  const now = options.now ?? new Date();
  const adapted = await fetchPackageEvidence(name, { ...options, now });
  return buildReport(adapted, { rules: packageRules, generatedAt: now.toISOString() });
}
