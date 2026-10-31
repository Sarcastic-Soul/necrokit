# Requirements: Package Graveyard

## Introduction

Package Graveyard checks whether an npm package is alive, ailing, or dying, and says what to do about it. It is the first app built on the NecroKit core.

## Requirement 1: Input

**User story:** As a developer, I want to type a package name, so that I can check it before I depend on it.

1. WHEN the user enters a valid npm name (scoped or not) THEN the app SHALL run a live scan.
2. IF the name is not a valid npm name THEN the app SHALL make no network call and SHALL report why.
3. The user SHALL be able to load a recorded fixture (`abandoned`, `stable-old`) with no network.

## Requirement 2: Evidence

1. The app SHALL read the npm registry document and SHALL record latest version, dependency count, declared ranges, days since last publish, deprecated flag, deprecation notice, and maintainer count.
2. The app SHALL read weekly downloads from the npm downloads API.
3. WHERE the package links a GitHub repository, the app SHALL record whether it is archived and days since the last push.
4. WHEN any source fails THEN the app SHALL list it under "Could not check" with the reason and SHALL still finish the scan.
5. WHEN the registry returns 404 THEN the report SHALL be unscored, not healthy.

## Requirement 3: Rules

1. `deprecated` (critical): the latest version is deprecated; the explanation SHALL quote the notice.
2. `repository-archived` (critical): the source repository is archived.
3. `stale-release` (warning): no publish in 730 days AND no commit in 365 days. A package that is old but still committed to is "stable-old", not abandoned.
4. `single-maintainer` (info): one maintainer or fewer.
5. `low-downloads` (info): under 1000 downloads a week.

## Requirement 4: Output

1. The app SHALL show the score, band, findings with linked evidence, unavailable sources, and the revival plan.
2. The user SHALL be able to copy the report as Markdown and download it as JSON.
3. The CLI SHALL accept a fixture path or `--live <name>`, and `--json`.
