# Design: Package Graveyard

## Flow

```
fixture.json --adapter.ts--> AdapterResult --+
                                              +--> core buildReport(packageRules) --> Report
name --live.ts (registry, downloads, GitHub)--+
```

## Files

| File | Job |
|---|---|
| `src/adapter.ts` | zod-validate a recorded fixture and turn it into evidence |
| `src/live.ts` | `fetchPackageEvidence`: registry and downloads in parallel, then GitHub if linked |
| `src/rules.ts` | five package rules (see requirements 3) |
| `src/run.ts` | `scanPackage(fixture)` and `scanPackageLive(name)` |
| `src/cli.ts` | command line entry |
| `src/fixtures/` | `abandoned.json`, `stable-old.json` |

## Decisions

- Scoped names are encoded as `@scope%2Fname` for the registry, as npm requires.
- The deprecated rule uses the latest version only. Old deprecated versions do not matter if latest is fine.
- `stale-release` needs both signals. Packages like `left-pad` that are finished but unmaintained are flagged; packages that are old but still worked on are not.
- GitHub is optional. With no token the limit is 60 calls an hour; `GITHUB_TOKEN` raises it but is never required.

## Testing

- `tests/scan.test.ts`: fixtures, snapshots, abandoned vs stable-old.
- `tests/live.test.ts`: fake fetch by URL. Full critical case, 404 unscored, GitHub rate limit still scores, invalid name makes no request, slug parsing.
