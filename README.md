# NecroKit

**One shared skeleton. Two apps that find what is quietly dying in software.**

NecroKit is a Kiroween 2026 Skeleton Crew entry. A small TypeScript core collects evidence, runs named rules, scores health, and writes a revival plan. Two different apps sit on top of it:

- **Package Graveyard** checks an npm package.
- **Repo Reaper** checks a public GitHub repository.

Live demo: https://necrokit-demo.vercel.app

## Try it

The demo works with no account, no key, and no setup.

1. Open the demo. It starts on a recorded scan of an abandoned package.
2. Click a live example such as `left-pad` or `request`, or type any npm package name.
3. Switch to **Repo Reaper** and try `request/request` or paste a github.com URL.
4. Click any evidence chip to open its source. Copy the report as Markdown or download it as JSON.

If GitHub's rate limit is hit (60 calls an hour without a token), the report says so under "Could not check" and still scores what it could see. The "Recorded, offline" chips always work.

## What each app checks

### Package Graveyard

Sources: npm registry, npm downloads API, and the GitHub repository if the package links one.

| Rule | Severity | Fires when |
|---|---|---|
| `deprecated` | critical | the latest version is deprecated (the notice is quoted) |
| `repository-archived` | critical | the source repository is archived |
| `stale-release` | warning | no publish in 2 years **and** no commit in 1 year |
| `single-maintainer` | info | one maintainer or fewer |
| `low-downloads` | info | under 1,000 downloads a week |

`stale-release` needs both signals, so a finished package that is still looked after ("stable-old") is not called abandoned.

### Repo Reaper

Sources: six GitHub REST calls per scan, only one of them a search call.

| Rule | Severity | Fires when |
|---|---|---|
| `archived` | critical | the repository is archived |
| `no-license` | critical | no license is declared |
| `ci-failing` | warning | the last completed CI run on the default branch failed |
| `stale-issues` | warning | 10 or more open issues not updated in 180 days |
| `old-pull-requests` | warning | the oldest open pull request is 180 days old or more |
| `no-recent-push` | warning | no push to any branch in more than a year |
| `no-recent-release` | info | no release, or none in the last year |
| `no-readme` | info | no README |

## How the shared core works

```text
app adapter (fixture or live)
  -> evidence + unavailable sources
  -> rules -> findings (each cites evidence ids)
  -> score (0-100, band) + revival plan
  -> report (JSON, Markdown)
```

- **Evidence first.** Every finding links to the facts that caused it. Nothing is scored by a model.
- **Missing is not guessed.** A failed call becomes an "unavailable" entry with a plain reason. Rules that need it do not fire.
- **No score without evidence.** If nothing could be read (a package that does not exist), the report has no score instead of a fake 100.
- **Score rules are tested as properties:** always 0 to 100, adding a finding never raises it, order of findings does not matter.

The core (`packages/necrokit-core`) has no npm or GitHub code in it. Each app adds only an adapter, a live collector, and its own rules.

## Run it locally

Needs Node 22 or newer and pnpm.

```bash
corepack enable
pnpm install
pnpm test        # 48 tests across core and both apps
pnpm typecheck
pnpm dev         # builds the site and serves it at http://127.0.0.1:4173
```

Command line scans:

```bash
# recorded fixtures, no network
pnpm scan:package apps/package-graveyard/src/fixtures/abandoned.json
pnpm scan:repo apps/repo-reaper/src/fixtures/neglected.json

# live
pnpm scan:package --live left-pad
pnpm scan:repo --live expressjs/express --json
```

Set `GITHUB_TOKEN` to raise the GitHub rate limit. It is optional.

## Repository layout

```text
necrokit/
├── packages/necrokit-core/   shared contracts, rules runner, scoring, plan, report, safe fetch
├── apps/package-graveyard/   npm adapter, live collector, rules, CLI, fixtures
├── apps/repo-reaper/         GitHub adapter, live collector, rules, CLI, fixtures
├── lib/necrokit.ts           browser entry that re-exports both apps
├── site/                     demo page (plain TypeScript, bundled by esbuild)
├── scripts/                  build and local server
└── .kiro/                    specs, steering, hooks
```

## How Kiro was used

- **Specs** (`.kiro/specs/`): one spec per part (core, Package Graveyard, Repo Reaper), each with requirements in EARS style, a design, and a task list. The core spec was written first so both apps had to fit the same contract.
- **Steering** (`.kiro/steering/`): `project.md` holds the rules every change must follow (evidence for every finding, timeouts on every call, no secrets on the judging path, no weakening tests). `tech.md` fixes the stack.
- **Hooks** (`.kiro/hooks/`): editing a core file asks the agent to typecheck and test the core and both apps; editing an app's rules or collector asks it to run that app's tests and explain any snapshot change.
- **Property-based testing**: fast-check checks the scoring rules in `packages/necrokit-core/tests/scoring.property.test.ts`.

## Kiro Crew app

The Crew app, **Undertaker**, lives in its own repository: https://github.com/Sarcastic-Soul/necrokit-crew

## Deploy

The site is static. `vercel.json` serves `site/`. Run `pnpm build` before deploying so `site/app.bundle.js` is current.

## Data sources

- npm registry: https://registry.npmjs.org
- npm downloads API: https://api.npmjs.org
- GitHub REST API: https://api.github.com
- Fonts: Instrument Serif, IBM Plex Sans, IBM Plex Mono (Google Fonts, OFL)
- Icons: Phosphor (MIT)

## License

MIT. See [LICENSE](LICENSE).
