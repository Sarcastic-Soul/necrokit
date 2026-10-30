import { z } from "zod";
import type { AdapterResult, Evidence } from "@necrokit/core";

const SnapshotSchema = z.object({
  fullName: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  archived: z.boolean(),
  pushedAt: z.string().datetime(),
  latestReleaseAt: z.string().datetime().nullable(),
  openIssues: z.object({ count: z.number().int().min(0), staleCount: z.number().int().min(0) }),
  openPullRequests: z.object({ count: z.number().int().min(0), oldestDays: z.number().int().min(0) }),
  ciStatus: z.enum(["passing", "failing", "unknown"]),
  license: z.string().min(1).nullable(),
  hasReadme: z.boolean(),
});

const SOURCE = "repository-snapshot";

export function adaptRepository(input: unknown): AdapterResult {
  const parsed = SnapshotSchema.safeParse(input);
  if (!parsed.success) {
    const reason = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return {
      subject: "unknown repository",
      kind: "repository",
      evidence: [],
      unavailable: [{ id: "snapshot", source: SOURCE, reason }],
    };
  }

  const s = parsed.data;
  const fact = (
    field: string,
    value: Evidence["value"],
    observedAt: string | null = null,
    url: string | null = null,
  ): Evidence => ({ id: `repo:${field}`, source: SOURCE, label: field, value, observedAt, url });

  return {
    subject: s.fullName,
    kind: "repository",
    evidence: [
      fact("fullName", s.fullName, null, `https://github.com/${s.fullName}`),
      fact("archived", s.archived),
      fact("pushedAt", s.pushedAt, s.pushedAt),
      fact("latestReleaseAt", s.latestReleaseAt, s.latestReleaseAt),
      fact("openIssues", s.openIssues.count),
      fact("staleIssues", s.openIssues.staleCount),
      fact("openPullRequests", s.openPullRequests.count),
      fact("oldestPullRequestDays", s.openPullRequests.oldestDays),
      fact("ciStatus", s.ciStatus),
      fact("license", s.license),
      fact("hasReadme", s.hasReadme),
    ],
    unavailable: [],
  };
}
