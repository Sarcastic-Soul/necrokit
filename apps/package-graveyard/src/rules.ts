import { findEvidence, type Evidence, type Rule } from "@necrokit/core";

const STALE_PUBLISH_DAYS = 730;
const RECENT_COMMIT_DAYS = 365;
const LOW_DOWNLOADS = 1000;

function num(ev: readonly Evidence[], label: string): number | null {
  const value = findEvidence(ev, label)?.value;
  return typeof value === "number" ? value : null;
}

function flag(ev: readonly Evidence[], label: string): boolean {
  return findEvidence(ev, label)?.value === true;
}

function ids(ev: readonly Evidence[], labels: string[]): string[] {
  return labels.flatMap((label) => {
    const found = findEvidence(ev, label);
    return found ? [found.id] : [];
  });
}

export const packageRules: Rule[] = [
  {
    id: "stale-release",
    title: "No release in two or more years",
    severity: "warning",
    weight: 60,
    evaluate(ev) {
      const publish = num(ev, "days-since-last-publish");
      const commit = num(ev, "days-since-last-commit");
      if (publish === null || publish < STALE_PUBLISH_DAYS) return null;
      if (commit !== null && commit < RECENT_COMMIT_DAYS) return null;
      return {
        evidenceIds: ids(ev, ["days-since-last-publish", "days-since-last-commit"]),
        explanation: `Last publish was ${publish} days ago and the last commit was ${commit ?? "unknown"} days ago.`,
      };
    },
    suggestedAction: "Confirm the project still has an active maintainer, or plan a move to a maintained alternative.",
  },
  {
    id: "deprecated",
    title: "Package is deprecated",
    severity: "critical",
    weight: 90,
    evaluate(ev) {
      if (!flag(ev, "deprecated")) return null;
      return {
        evidenceIds: ids(ev, ["deprecated"]),
        explanation: "The registry marks this package as deprecated.",
      };
    },
    suggestedAction: "Replace the package with the successor named in its deprecation notice.",
  },
  {
    id: "repository-archived",
    title: "Source repository is archived",
    severity: "critical",
    weight: 80,
    evaluate(ev) {
      if (!flag(ev, "repository-archived")) return null;
      return {
        evidenceIds: ids(ev, ["repository-archived"]),
        explanation: "The source repository is archived, so upstream fixes are unlikely.",
      };
    },
    suggestedAction: "Fork the repository you depend on, or migrate to a package with active upstream.",
  },
  {
    id: "single-maintainer",
    title: "Single maintainer",
    severity: "info",
    weight: 30,
    evaluate(ev) {
      if (num(ev, "maintainer-count") !== 1) return null;
      return {
        evidenceIds: ids(ev, ["maintainer-count"]),
        explanation: "Only one maintainer is listed, so a single absence can stall the project.",
      };
    },
    suggestedAction: "Note the bus factor and watch for an identified backup maintainer.",
  },
  {
    id: "low-downloads",
    title: "Low weekly downloads",
    severity: "info",
    weight: 10,
    evaluate(ev) {
      const downloads = num(ev, "weekly-downloads");
      if (downloads === null || downloads >= LOW_DOWNLOADS) return null;
      return {
        evidenceIds: ids(ev, ["weekly-downloads"]),
        explanation: `The package sees about ${downloads} weekly downloads, so few eyes review it.`,
      };
    },
    suggestedAction: "Check whether the package has a broader community or a larger alternative.",
  },
];
