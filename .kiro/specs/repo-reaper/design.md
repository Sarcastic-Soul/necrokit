# Design: Repo Reaper

## Flow

```
fixture.json --adapter.ts--> AdapterResult --+
                                              +--> withReference --> core buildReport(repoRules) --> Report
owner/name --live.ts (6 GitHub calls)---------+
```

`withReference` adds a `scan:generatedAt` fact so the release rule can measure age against scan time. It is only added when other evidence exists, so a failed scan stays unscored.

## Calls per live scan

1. `GET /repos/{slug}` (required; failure ends the scan)
2. `GET /repos/{slug}/releases/latest` (404 means no release)
3. `GET /repos/{slug}/readme` (404 means no README)
4. `GET /search/issues?q=repo:{slug} is:issue is:open updated:<date` (the one search call)
5. `GET /repos/{slug}/pulls?state=open&sort=created&direction=asc&per_page=100`
6. `GET /repos/{slug}/actions/runs?per_page=1&branch={default}&status=completed`

Calls 2 to 6 run in parallel. Open issues = `open_issues_count` minus open pull requests, because GitHub counts pull requests as issues. Past 100 open pull requests both numbers are lower bounds.

## Testing

- `tests/scan.test.ts`: three fixtures with snapshots.
- `tests/live.test.ts`: mapping from fake responses, partial failure (CI, README, search), unscored on repo 404, `parseRepository` cases.
