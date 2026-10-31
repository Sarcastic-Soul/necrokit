// Single-file entry for consumers outside this workspace (the Undertaker Crew App
// vendors the bundle built from this). Both apps, the core, and the fixtures.
import abandoned from "../apps/package-graveyard/src/fixtures/abandoned.json" with { type: "json" };
import stableOld from "../apps/package-graveyard/src/fixtures/stable-old.json" with { type: "json" };
import active from "../apps/repo-reaper/src/fixtures/active.json" with { type: "json" };
import archived from "../apps/repo-reaper/src/fixtures/archived.json" with { type: "json" };
import neglected from "../apps/repo-reaper/src/fixtures/neglected.json" with { type: "json" };

export * from "../packages/necrokit-core/src/index.js";
export { scanPackage, scanPackageLive } from "../apps/package-graveyard/src/run.js";
export { scanRepository, scanRepositoryLive } from "../apps/repo-reaper/src/run.ts";

export const PACKAGE_FIXTURES: Record<string, unknown> = { abandoned, "stable-old": stableOld };
export const REPO_FIXTURES: Record<string, unknown> = { active, neglected, archived };
