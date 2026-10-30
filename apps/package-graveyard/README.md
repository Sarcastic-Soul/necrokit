# Package Graveyard

Application 1 built on `@necrokit/core`.

Demo input: a package name or fixture `package.json`.

Demo output: an evidence-backed dependency health map and a prioritized revival plan.

## Running the demo

Requires Node 22.12+ (uses `--experimental-strip-types`). From the repo root:

```sh
corepack pnpm --filter @necrokit/package-graveyard dev
corepack pnpm --filter @necrokit/package-graveyard scan src/fixtures/stable-old.json
corepack pnpm --filter @necrokit/package-graveyard test
```

The scan runs fully offline. Registry and repository facts come from the `snapshot` block in each fixture, not from the network.

## Fixtures

Both files in `src/fixtures/` are synthetic test data, not live registry results. Names and values are invented to look realistic.

- `stable-old.json`: an old package that is still maintained. Last publish 900 days ago, last commit 30 days ago, two maintainers, not deprecated, not archived. Should score healthy.
- `abandoned.json`: a deprecated package with an archived repository, one maintainer, no publish in about four years. Should score critical.
