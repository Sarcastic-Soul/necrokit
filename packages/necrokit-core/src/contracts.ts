import { z } from "zod";

export const SeveritySchema = z.enum(["info", "warning", "critical"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const EvidenceSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  label: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  observedAt: z.string().datetime().nullable(),
  url: z.string().url().nullable(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const UnavailableSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  reason: z.string().min(1),
});
export type Unavailable = z.infer<typeof UnavailableSchema>;

export const FindingSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  title: z.string().min(1),
  severity: SeveritySchema,
  weight: z.number().int().min(0).max(100),
  explanation: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)),
  suggestedAction: z.string().min(1),
});
export type Finding = z.infer<typeof FindingSchema>;

export const HealthScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  band: z.enum(["healthy", "at-risk", "critical"]),
  breakdown: z.object({
    info: z.number().int().min(0),
    warning: z.number().int().min(0),
    critical: z.number().int().min(0),
  }),
});
export type HealthScore = z.infer<typeof HealthScoreSchema>;

/** Used when no evidence could be collected: no number is invented. */
export const UnscoredSchema = z.object({
  score: z.null(),
  band: z.literal("unknown"),
  breakdown: HealthScoreSchema.shape.breakdown,
});
export type Unscored = z.infer<typeof UnscoredSchema>;

export const RevivalStepSchema = z.object({
  priority: z.number().int().min(1),
  findingId: z.string().min(1),
  action: z.string().min(1),
});
export type RevivalStep = z.infer<typeof RevivalStepSchema>;

export const RevivalPlanSchema = z.object({
  steps: z.array(RevivalStepSchema),
});
export type RevivalPlan = z.infer<typeof RevivalPlanSchema>;

export const ReportSchema = z.object({
  subject: z.string().min(1),
  kind: z.string().min(1),
  generatedAt: z.string().datetime(),
  evidence: z.array(EvidenceSchema),
  unavailable: z.array(UnavailableSchema),
  findings: z.array(FindingSchema),
  score: z.union([HealthScoreSchema, UnscoredSchema]),
  plan: RevivalPlanSchema,
});
export type Report = z.infer<typeof ReportSchema>;

/** Output of any source adapter: raw facts only, no judgement. */
export const AdapterResultSchema = z.object({
  subject: z.string().min(1),
  kind: z.string().min(1),
  evidence: z.array(EvidenceSchema),
  unavailable: z.array(UnavailableSchema),
});
export type AdapterResult = z.infer<typeof AdapterResultSchema>;
