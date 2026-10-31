---
inclusion: always
---

# Tech choices

- pnpm workspace, Node 22, TypeScript in strict mode with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`.
- Runtime validation with zod at every boundary: fixtures, registry responses, GitHub responses.
- Tests with vitest; property tests with fast-check for scoring rules.
- The demo site is plain TypeScript bundled by esbuild (`scripts/build.mjs`). No framework.
- All network calls go through `fetchJson` in `@necrokit/core`. It never throws, has a timeout, and explains rate limits.
- Icons: Phosphor only.
