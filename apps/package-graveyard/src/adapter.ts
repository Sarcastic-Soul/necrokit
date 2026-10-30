import { z } from "zod";
import type { AdapterResult, Evidence } from "@necrokit/core";

const SnapshotSchema = z.object({
  daysSinceLastPublish: z.number().int().min(0),
  daysSinceLastCommit: z.number().int().min(0).nullable(),
  deprecated: z.boolean(),
  repositoryArchived: z.boolean(),
  maintainerCount: z.number().int().min(0),
  weeklyDownloads: z.number().int().min(0),
  observedAt: z.string().datetime().nullable(),
});

const ManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  dependencies: z.record(z.string()).default({}),
  devDependencies: z.record(z.string()).default({}),
  snapshot: SnapshotSchema,
});

const SOURCE = "registry-snapshot";
const KIND = "npm-package";

/** Turns a parsed package.json-like snapshot into raw evidence. Never throws. */
export function adaptPackageManifest(input: unknown): AdapterResult {
  const parsed = ManifestSchema.safeParse(input);
  if (!parsed.success) {
    const name = typeof input === "object" && input !== null ? (input as { name?: unknown }).name : undefined;
    return {
      subject: typeof name === "string" && name.length > 0 ? name : "unknown-package",
      kind: KIND,
      evidence: [],
      unavailable: [
        {
          id: "manifest",
          source: "package.json",
          reason: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; "),
        },
      ],
    };
  }

  const m = parsed.data;
  const observedAt = m.snapshot.observedAt;
  const fact = (label: string, value: Evidence["value"], observed: string | null = null): Evidence => ({
    id: `snapshot:${label}`,
    source: SOURCE,
    label,
    value,
    observedAt: observed,
    url: null,
  });

  const declared = [
    ...Object.entries(m.dependencies).map(([name, range]) => ({ section: "dependencies", name, range })),
    ...Object.entries(m.devDependencies).map(([name, range]) => ({ section: "devDependencies", name, range })),
  ];

  const evidence: Evidence[] = [
    {
      id: "manifest:dependency-count",
      source: "package.json",
      label: "dependency-count",
      value: declared.length,
      observedAt: null,
      url: null,
    },
    ...declared.map(
      (d): Evidence => ({
        id: `declared:${d.section}:${d.name}`,
        source: "package.json",
        label: "declared-range",
        value: `${d.name}@${d.range}`,
        observedAt: null,
        url: null,
      }),
    ),
    fact("days-since-last-publish", m.snapshot.daysSinceLastPublish, observedAt),
    fact("days-since-last-commit", m.snapshot.daysSinceLastCommit, observedAt),
    fact("deprecated", m.snapshot.deprecated, observedAt),
    fact("repository-archived", m.snapshot.repositoryArchived, observedAt),
    fact("maintainer-count", m.snapshot.maintainerCount, observedAt),
    fact("weekly-downloads", m.snapshot.weeklyDownloads, observedAt),
  ];

  return { subject: m.name, kind: KIND, evidence, unavailable: [] };
}
