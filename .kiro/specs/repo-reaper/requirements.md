# Requirements: Repo Reaper

## Introduction

Repo Reaper checks whether a public GitHub repository is still cared for. It is the second app on the NecroKit core and adds no repository logic to the core.

## Requirement 1: Input

1. WHEN the user enters `owner/name`, a github.com URL, or a `.git` clone URL THEN the app SHALL run a live scan.
2. IF the input cannot be read as a repository THEN the app SHALL make no network call and SHALL report why.
3. The user SHALL be able to load a recorded fixture (`active`, `neglected`, `archived`) with no network.

## Requirement 2: Evidence

1. The app SHALL record full name, archived flag, last push time, and license from the repository endpoint.
2. The app SHALL record latest release time, README presence, stale open issues (not updated in 180 days), open pull requests, age of the oldest open pull request, open issues, and the result of the last completed CI run on the default branch.
3. A 404 on the latest release or README SHALL count as evidence of absence, not as a failure.
4. The app SHALL use only one search call per scan, because unauthenticated search allows 10 calls a minute.
5. WHEN any endpoint fails THEN the app SHALL list it under "Could not check" and SHALL still finish the scan.
6. WHEN the repository itself cannot be read THEN the report SHALL be unscored.

## Requirement 3: Rules

1. `archived` (critical), `no-license` (critical), `ci-failing` (warning), `stale-issues` (warning, 10 or more), `old-pull-requests` (warning, oldest 180 days or more), `no-recent-push` (warning, no push to any branch in more than 365 days), `no-recent-release` (info, none or older than 365 days), `no-readme` (info).

## Requirement 4: Output

1. Same report, Markdown, JSON, and CLI behavior as Package Graveyard.
