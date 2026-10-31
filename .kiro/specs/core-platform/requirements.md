# Requirements: NecroKit core platform

## Introduction

The core is the shared skeleton behind Package Graveyard and Repo Reaper. It turns evidence that an app collects into findings, a score, a revival plan, and a report. It knows nothing about npm or GitHub.

## Requirement 1: Typed evidence

**User story:** As an app author, I want one evidence shape, so that any source can feed the same pipeline.

1. WHEN an adapter returns a result THEN the core SHALL validate it against `AdapterResultSchema` (subject, kind, evidence, unavailable).
2. Each evidence item SHALL carry an id, source, label, value, observedAt timestamp, and an optional source URL.
3. WHEN a source could not be read THEN the adapter SHALL return an `unavailable` entry with a plain reason instead of a guessed value.

## Requirement 2: Rules and findings

**User story:** As an app author, I want to write rules as small functions, so that each finding is easy to explain.

1. The core SHALL run every rule against the evidence and return one finding per rule that fires.
2. Each finding SHALL have a stable id, title, severity (info, warning, critical), weight (0 to 100), explanation, suggested action, and at least one evidence id.
3. IF a rule needs evidence that is missing THEN the rule SHALL NOT fire.

## Requirement 3: Bounded score

**User story:** As a reader, I want one number I can trust, so that I can compare two subjects quickly.

1. The score SHALL start at 100 and lose points per finding by severity and weight, clamped to 0 to 100.
2. Adding a finding SHALL never raise the score.
3. The score SHALL map to a band: healthy (75 or more), at-risk (40 to 74), critical (under 40).
4. WHEN no evidence at all could be collected THEN the report SHALL have `score: null` and band `unknown` rather than a perfect 100.

## Requirement 4: Revival plan

1. The core SHALL order plan steps by severity, then weight, then id, and SHALL NOT change any source code.

## Requirement 5: Reports

1. The core SHALL build a report validated by `ReportSchema` and SHALL render it as JSON and Markdown.
2. The Markdown SHALL show the score (or "unavailable"), findings with evidence, unavailable sources, and the plan.

## Requirement 6: Safe network access

1. All live calls SHALL go through `fetchJson`, which SHALL time out (8 seconds by default) and SHALL never throw.
2. WHEN a response is HTTP 429, or HTTP 403 with `x-ratelimit-remaining: 0`, THEN the reason SHALL say a rate limit was hit and when it resets.
3. The judging path SHALL work with recorded fixtures, no network, and no secrets.
