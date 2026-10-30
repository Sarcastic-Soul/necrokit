# NecroKit

**One reusable maintenance-analysis skeleton. Two applications that find what is quietly dying in software.**

NecroKit is the Kiroween 2026 Skeleton Crew submission. It provides a shared TypeScript core for collecting evidence, applying transparent rules, scoring health, and producing actionable revival plans.

## Applications

### Package Graveyard

Scans an npm package or uploaded `package.json` and reports dependency health:

- stale releases and publish age
- deprecation and repository signals
- maintainer and download context
- transitive dependency risk
- evidence links for every finding
- upgrade, replacement, or fork plan

### Repo Reaper

Scans a public GitHub repository and reports maintenance health:

- commit and release age
- stale issues and pull requests
- CI status
- license and documentation signals
- dependency health
- evidence links for every finding
- prioritized maintenance plan

Both apps use the same `packages/necrokit-core` pipeline:

```text
source adapter -> normalized evidence -> rules -> score -> report -> revival plan
```

## Repository layout

```text
necrokit/
├── apps/
│   ├── package-graveyard/   # Application 1
│   └── repo-reaper/         # Application 2
├── packages/
│   └── necrokit-core/       # Shared template foundation
├── .kiro/
│   ├── hooks/
│   ├── specs/
│   └── steering/
├── docs/
└── LICENSE
```

## Planned stack

- TypeScript and Node.js 22+
- React 19 + Vite for the two web clients
- Fastify for a small local/API server where needed
- Zod for runtime contracts
- Vitest for unit and integration tests
- fast-check for scoring invariants
- SQLite for local scan history
- GitHub REST API for public repository metadata
- npm registry API and deps.dev API for dependency evidence
- Optional LLM summaries, disabled by default and never required by judges

The first demo path uses recorded fixtures. Judges can run it without secrets, rate-limit risk, or paid services.

## Local setup target

```bash
corepack enable
pnpm install
pnpm test
pnpm build
pnpm dev
```

Implementation starts only after the project is created during the Kiroween submission period. This repository currently contains planning and scaffold files only.

## Kiro usage plan

- **Specs:** define the shared evidence contract, scoring rules, adapters, and both application flows.
- **Steering:** enforce evidence-first scoring, safe API use, accessibility, naming, and fixture-first development.
- **Hooks:** run type checks and contract tests when shared-core files change; reject secrets and unverified findings.
- **MCP:** use authoritative documentation lookup only where it improves implementation; record the server and decision in the Kiro write-up.
- **PBT:** prove score invariants, including that adding a critical finding cannot improve a health score.

## Submission targets

- Category: **Skeleton Crew**
- Bonus: **Best Student Project: Skeleton Crew**
- Bonus: **Best Kiro Crew App** via the separate `necrokit-crew` repository
- Bonus: **Social Blitz**
- Bonus: **Bonus Blog**
- Automatic consideration: Overall and Best Demo

See [`docs/SUBMISSION_CHECKLIST.md`](docs/SUBMISSION_CHECKLIST.md) and [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md).
