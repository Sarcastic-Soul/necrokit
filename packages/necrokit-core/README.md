# @necrokit/core

Shared foundation for Package Graveyard and Repo Reaper. Application-specific adapters live outside this package.

## Contract boundary

Every adapter converts external data into the same evidence model. The core never calls GitHub, npm, or an LLM directly.

```text
Adapter -> Finding[] -> RuleEngine -> HealthScore -> Report -> RevivalPlan
```

The second application must be buildable without changing this package.
