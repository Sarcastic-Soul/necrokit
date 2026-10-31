# Design: NecroKit core platform

## Pipeline

```
adapter (app) -> AdapterResult -> runRules(rules) -> Finding[]
                                       |                |
                                       |        scoreFindings -> HealthScore | Unscored
                                       |        buildRevivalPlan -> RevivalPlan
                                       v
                                 buildReport -> Report -> toMarkdown / JSON
```

Apps own two things: an adapter (fixture or live) that produces an `AdapterResult`, and a list of `Rule` objects. Everything else lives in `packages/necrokit-core`.

## Modules

| File | Job |
|---|---|
| `contracts.ts` | zod schemas and types: Evidence, Unavailable, AdapterResult, Finding, HealthScore, Unscored, RevivalPlan, Report |
| `rules.ts` | `Rule` interface, `runRules`, `findEvidence` |
| `scoring.ts` | `scoreFindings`: penalty = severity base (info 3, warning 12, critical 30) x (0.5 + weight/100) |
| `plan.ts` | `buildRevivalPlan`: sort by severity, weight, id |
| `report.ts` | `buildReport`, `toMarkdown`; empty evidence gives an unscored report |
| `http.ts` | `fetchJson` (timeout, never throws, rate limit text) and `unavailableFrom` |

## Decisions

- **Deterministic over clever.** Every finding comes from a named rule and cites evidence ids. No model output is used to score.
- **Absence is data.** A 404 on a README is evidence (`hasReadme: false`). A timeout is not; it becomes `unavailable`.
- **No score without evidence.** An unknown package used to score 100 "healthy". The `Unscored` shape fixes that.
- **Order independent.** Scoring sorts findings first, so rule order never changes the result (checked by a property test).

## Testing

- `scoring.property.test.ts`: score bounds, monotonic penalty, order independence (fast-check).
- `report.test.ts`: schema validation, Markdown output, unavailable entries.
- `http.test.ts`: success, rate limit, network error, timeout, unscored report.
