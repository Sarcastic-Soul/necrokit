# Core platform requirements

## Purpose

Define the reusable Skeleton Crew foundation shared by Package Graveyard and Repo Reaper.

## Requirements

1. The core shall accept source-specific evidence through typed adapters.
2. The core shall normalize evidence into findings with stable IDs and severity.
3. The core shall calculate a bounded, explainable health score.
4. The core shall preserve evidence links and unavailable states.
5. The core shall generate a prioritized revival plan without changing source code.
6. The core shall serialize reports to JSON and Markdown.
7. The core shall run entirely against fixtures with no network or secrets.
8. The core shall expose contracts usable by two independent applications.

## Verification

- Contract tests cover valid, malformed, partial, and unavailable evidence.
- Property-based tests verify score bounds and monotonic severity behavior.
- The core package remains unchanged while the second application is added.
