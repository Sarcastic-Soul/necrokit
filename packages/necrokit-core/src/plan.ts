import type { Finding, RevivalPlan } from "./contracts.js";

const RANK = { critical: 0, warning: 1, info: 2 } as const;

/** Ordered revival steps: most severe first, then heaviest weight, then id. */
export function buildRevivalPlan(findings: readonly Finding[]): RevivalPlan {
  const ordered = [...findings].sort(
    (a, b) =>
      RANK[a.severity] - RANK[b.severity] || b.weight - a.weight || a.id.localeCompare(b.id),
  );
  return {
    steps: ordered.map((f, i) => ({
      priority: i + 1,
      findingId: f.id,
      action: f.suggestedAction,
    })),
  };
}
