# NecroKit Project Plan

## Goal

Ship a working Skeleton Crew project that demonstrates one reusable TypeScript maintenance-analysis template through two distinct applications.

## Acceptance criteria

1. `apps/package-graveyard` works independently as a package-health application.
2. `apps/repo-reaper` works independently as a repository-health application.
3. Both apps consume `packages/necrokit-core` through stable typed contracts.
4. The core package does not change while the second app is implemented.
5. Every displayed finding includes evidence or is explicitly marked unavailable.
6. The demo works with bundled fixtures without API keys.
7. Live public API adapters are optional and rate-limit safe.
8. Tests cover scoring rules, malformed inputs, unavailable evidence, and API failures.
9. The root `.kiro` directory contains real specs, steering, and hooks.
10. The final repository includes setup, test, demo, architecture, and license instructions.

## Architecture

```text
apps/package-graveyard  ─┐
                         ├─ @necrokit/core
apps/repo-reaper        ─┘
```

Core layers:

1. **Contracts:** `Source`, `Evidence`, `Finding`, `HealthScore`, `Report`, `RevivalPlan`.
2. **Adapters:** translate package-registry and GitHub responses into evidence.
3. **Rules:** deterministic rules with named IDs and explanations.
4. **Scoring:** bounded, explainable health score.
5. **Reports:** shared JSON and Markdown output.
6. **Fixtures:** deterministic offline input for judging and tests.

## Build order

### Phase 0: Project proof

- Confirm the Kiroween submission period has started.
- Record the creation date and preserve the initial Kiro session/spec history.
- Keep `.kiro` tracked from the first commit.

### Phase 1: Core contracts

- Define strict Zod schemas.
- Define adapter and rule interfaces.
- Add fixture loader.
- Add contract tests.

### Phase 2: Core scoring and reporting

- Implement deterministic rules.
- Implement bounded score calculation.
- Implement evidence links and unavailable states.
- Implement JSON and Markdown reports.
- Add property-based score tests.

### Phase 3: Package Graveyard

- Add npm and optional deps.dev adapters.
- Normalize package metadata into core findings.
- Build scan, evidence, score, and revival-plan screens.
- Add fixture-first flow and optional live mode.

### Phase 4: Repo Reaper

- Add GitHub public-repository adapter.
- Normalize commits, releases, issues, pull requests, CI, license, and dependency signals.
- Build the second app without modifying the core package.
- Capture the unchanged-core diff for the demo.

### Phase 5: Reliability and presentation

- Add request timeout, retry, and rate-limit handling.
- Add accessibility and keyboard navigation.
- Add seeded visual states for healthy, at-risk, and critical examples.
- Run full tests and build.
- Deploy a fixture-backed demo.

### Phase 6: Submission package

- Record a video under three minutes.
- Publish the blog post during the submission period.
- Publish the social post beginning with `#KiroweenHackathon26`.
- Add student details and all URLs to Devpost.
- Save a final Devpost draft before the deadline.

## Explicit non-goals

- No automatic code changes or pull requests.
- No private repository support.
- No authentication for the hackathon demo.
- No required LLM API key.
- No claim that age alone proves a package is dead.
- No deep vulnerability scanner replacement.
- No broad crawler or enterprise dashboard.

## Demo script

1. Explain the shared skeleton in 10 seconds.
2. Run Package Graveyard on a fixture and reveal evidence-backed findings.
3. Generate a revival plan.
4. Run Repo Reaper on a different fixture.
5. Show the same core pipeline and the unchanged-core diff.
6. Show Kiro specs, steering, hooks, and property-based tests.
7. End with the practical impact: maintainers see what is dying and what to do next.

## Technical decisions

- Deterministic rules are the source of truth.
- LLM summaries are optional presentation only.
- Fixtures are first-class, not mocked afterthoughts.
- Evidence is stored with each finding.
- Scores are explainable and bounded from 0 to 100.
- The two apps remain distinct in user purpose and entry point.
