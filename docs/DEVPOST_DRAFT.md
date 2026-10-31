# Devpost draft

Text to paste into the Kiroween 2026 form. Fill in the parts marked TODO.

## Tagline

One shared skeleton, two apps that find what is quietly dying in your dependencies and repositories.

## Inspiration

Most projects die quietly. A package stops getting releases, a repository gets archived, CI stays red for months, and nobody notices until something breaks. We wanted a tool that says plainly what is dying, shows the proof, and says what to do next.

## What it does

NecroKit is a small TypeScript core plus two apps built on it.

- Package Graveyard checks an npm package: deprecation (with the notice quoted), archived source, years without a release, a single maintainer, and low downloads.
- Repo Reaper checks a public GitHub repository: archived state, missing license, failing CI, stale issues, forgotten pull requests, missing releases, and a missing README.

Each scan gives a score out of 100, a verdict (Alive, Ailing, Dying), the findings with links to the exact facts behind them, the sources that could not be checked, and a revival plan. Reports can be copied as Markdown or downloaded as JSON. The demo needs no account and no key, and recorded scans work offline.

## How we built it

The core holds the contracts (zod), the rule runner, scoring, the revival plan, the report writer, and a fetch helper that times out, never throws, and explains rate limits. It knows nothing about npm or GitHub. Each app adds only an adapter, a live collector, and its own rules. The demo site is plain TypeScript bundled with esbuild.

## How we used Kiro

- Specs: one spec each for the core, Package Graveyard, and Repo Reaper, with requirements, design, and tasks. The core spec came first so both apps had to fit one contract.
- Steering: project rules every change had to follow, such as every finding must cite evidence, every network call needs a timeout, nothing on the judging path needs a secret, and tests are never weakened to pass.
- Hooks: editing a core file asks the agent to typecheck and test the core and both apps; editing an app's rules asks it to run that app's tests and explain any snapshot change.
- Property-based tests (fast-check) prove the score stays between 0 and 100, never rises when a finding is added, and does not depend on finding order.

## Challenges

- An unknown package first scored 100 and was called healthy, because no rule fired. We added an unscored report so "no evidence" never looks like "healthy".
- GitHub's search API allows 10 unauthenticated calls a minute. We cut each repository scan to one search call by counting pull requests from a list call.

## What we learned

Showing the evidence matters more than the score. People trust a verdict when they can click through to the registry page or the CI run that caused it.

## What's next

Scanning a whole package.json at once, and a scheduled watch list (started in the Undertaker Crew app).

## Links

- Repository: https://github.com/Sarcastic-Soul/necrokit
- Demo: https://necrokit-demo.vercel.app
- Crew app repository: https://github.com/Sarcastic-Soul/necrokit-crew
- Video: TODO (YouTube, under 3 minutes)
- Blog post: TODO (must say it was written for Kiroween 2026)
- Social post: TODO (must start with #KiroweenHackathon26)

## Test instructions

Open the demo. Click any "Recorded, offline" chip for a scan that needs no network, or a live chip for a real scan. If GitHub's rate limit is reached, the report says so and still scores the rest. Locally: `pnpm install && pnpm test && pnpm dev`.
