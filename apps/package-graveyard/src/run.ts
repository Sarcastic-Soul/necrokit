import { buildReport, type Report } from "@necrokit/core";
import { adaptPackageManifest } from "./adapter.js";
import { packageRules } from "./rules.js";

export function scanPackage(fixture: unknown, generatedAt: string): Report {
  return buildReport(adaptPackageManifest(fixture), { rules: packageRules, generatedAt });
}
