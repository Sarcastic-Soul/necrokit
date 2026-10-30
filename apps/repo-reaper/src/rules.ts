import { findEvidence, type Rule } from "@necrokit/core";

const DAY_MS = 86_400_000;
const STALE_ISSUE_THRESHOLD = 10;
const OLD_PULL_REQUEST_DAYS = 180;
const STALE_RELEASE_DAYS = 365;

/** Rules read only evidence. The reference date arrives as the "generatedAt" evidence item. */
export const repoRules: Rule[] = [
  {
    id: "archived",
    title: "Repository is archived",
    severity: "critical",
    weight: 80,
    evaluate(evidence) {
      const e = findEvidence(evidence, "archived");
      if (e?.value !== true) return null;
      return { evidenceIds: [e.id], explanation: "The repository is archived and accepts no new changes." };
    },
    suggestedAction: "Decide whether to unarchive the repository or document it as retired.",
  },
  {
    id: "ci-failing",
    title: "CI is failing",
    severity: "warning",
    weight: 40,
    evaluate(evidence) {
      const e = findEvidence(evidence, "ciStatus");
      if (e?.value !== "failing") return null;
      return { evidenceIds: [e.id], explanation: "The latest CI status is failing." };
    },
    suggestedAction: "Fix the failing CI pipeline before merging anything new.",
  },
  {
    id: "stale-issues",
    title: "Many stale open issues",
    severity: "warning",
    weight: 30,
    evaluate(evidence) {
      const e = findEvidence(evidence, "staleIssues");
      if (typeof e?.value !== "number" || e.value < STALE_ISSUE_THRESHOLD) return null;
      return {
        evidenceIds: [e.id],
        explanation: `${e.value} open issues are stale (threshold ${STALE_ISSUE_THRESHOLD}).`,
      };
    },
    suggestedAction: "Triage stale issues: close, relabel, or schedule them.",
  },
  {
    id: "old-pull-requests",
    title: "Pull requests left open too long",
    severity: "warning",
    weight: 30,
    evaluate(evidence) {
      const e = findEvidence(evidence, "oldestPullRequestDays");
      if (typeof e?.value !== "number" || e.value < OLD_PULL_REQUEST_DAYS) return null;
      return {
        evidenceIds: [e.id],
        explanation: `The oldest open pull request is ${e.value} days old (threshold ${OLD_PULL_REQUEST_DAYS}).`,
      };
    },
    suggestedAction: "Merge, rebase, or close the oldest open pull requests.",
  },
  {
    id: "no-license",
    title: "No license declared",
    severity: "critical",
    weight: 60,
    evaluate(evidence) {
      const e = findEvidence(evidence, "license");
      if (e?.value !== null) return null;
      return { evidenceIds: [e.id], explanation: "No license is declared, so reuse rights are unclear." };
    },
    suggestedAction: "Add a LICENSE file that matches the intended reuse terms.",
  },
  {
    id: "no-recent-release",
    title: "No recent release",
    severity: "info",
    weight: 20,
    evaluate(evidence) {
      const release = findEvidence(evidence, "latestReleaseAt");
      const reference = findEvidence(evidence, "generatedAt");
      if (!release || typeof reference?.value !== "string") return null;
      const evidenceIds = [release.id, reference.id];
      if (release.value === null) {
        return { evidenceIds, explanation: "No release has been published." };
      }
      if (typeof release.value !== "string") return null;
      const ageDays = Math.floor((Date.parse(reference.value) - Date.parse(release.value)) / DAY_MS);
      if (ageDays <= STALE_RELEASE_DAYS) return null;
      return {
        evidenceIds,
        explanation: `The latest release is ${ageDays} days old (threshold ${STALE_RELEASE_DAYS}).`,
      };
    },
    suggestedAction: "Cut a release, or state that the project is intentionally unversioned.",
  },
  {
    id: "no-readme",
    title: "No README",
    severity: "info",
    weight: 10,
    evaluate(evidence) {
      const e = findEvidence(evidence, "hasReadme");
      if (e?.value !== false) return null;
      return { evidenceIds: [e.id], explanation: "No README was found at the repository root." };
    },
    suggestedAction: "Add a README that explains what the project does and how to run it.",
  },
];
