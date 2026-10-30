# @necrokit/core

Shared Skeleton Crew foundation. Application-specific adapters live outside this package.

## Contract boundary

Every adapter converts external data into the same evidence model. The core never calls GitHub, npm, or an LLM directly.

```text
Adapter -> Finding[] -> RuleEngine -> HealthScore -> Report -> RevivalPlan
```

The second application must be buildable without changing this package. That unchanged-core proof is part of the Skeleton Crew demo.
