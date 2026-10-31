# Tasks: NecroKit core platform

- [x] 1. Define zod contracts for evidence, unavailable, adapter result, finding, score, plan, report
  - _Requirements: 1.1, 1.2, 2.2, 5.1_
- [x] 2. Implement `runRules` and `findEvidence`; skip rules whose evidence is missing
  - _Requirements: 2.1, 2.3_
- [x] 3. Implement `scoreFindings` with severity and weight penalty, clamped, with bands
  - _Requirements: 3.1, 3.3_
- [x] 4. Property tests: bounds, monotonic, order independent
  - _Requirements: 3.1, 3.2_
- [x] 5. Implement `buildRevivalPlan` ordering
  - _Requirements: 4.1_
- [x] 6. Implement `buildReport` and `toMarkdown`
  - _Requirements: 5.1, 5.2_
- [x] 7. Add `fetchJson` with timeout, rate limit reasons, never throwing; add `unavailableFrom`
  - _Requirements: 6.1, 6.2_
- [x] 8. Add `Unscored` report shape for scans with no evidence
  - _Requirements: 3.4_
- [x] 9. Tests for http and unscored reports
  - _Requirements: 3.4, 6.1, 6.2_
