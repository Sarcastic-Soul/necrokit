import type { Finding, HealthScore } from "./contracts.js";

const SEVERITY_PENALTY = { info: 3, warning: 12, critical: 30 } as const;

/**
 * Score starts at 100 and loses points per finding. Penalty depends on
 * severity and on the rule weight (0-100 scaled to 0.5x-1.5x). Result is
 * clamped to 0-100. Adding any finding never raises the score.
 */
export function scoreFindings(findings: readonly Finding[]): HealthScore {
  const breakdown = { info: 0, warning: 0, critical: 0 };
  let penalty = 0;
  for (const f of findings) {
    breakdown[f.severity] += 1;
    const scale = 0.5 + f.weight / 100;
    penalty += SEVERITY_PENALTY[f.severity] * scale;
  }
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  const band = score >= 75 ? "healthy" : score >= 40 ? "at-risk" : "critical";
  return { score, band, breakdown };
}
