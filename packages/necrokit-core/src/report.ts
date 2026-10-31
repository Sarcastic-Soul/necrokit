import { ReportSchema, type AdapterResult, type Report, type Unscored } from "./contracts.js";
import { buildRevivalPlan } from "./plan.js";
import { runRules, type Rule } from "./rules.js";
import { scoreFindings } from "./scoring.js";

export interface BuildReportOptions {
  rules: readonly Rule[];
  generatedAt: string;
}

function unscored(): Unscored {
  return { score: null, band: "unknown", breakdown: { info: 0, warning: 0, critical: 0 } };
}

/** Pipeline: adapter output -> rules -> score -> plan -> validated report. */
export function buildReport(input: AdapterResult, options: BuildReportOptions): Report {
  const findings = runRules(options.rules, input.evidence);
  const report = {
    subject: input.subject,
    kind: input.kind,
    generatedAt: options.generatedAt,
    evidence: input.evidence,
    unavailable: input.unavailable,
    findings,
    score: input.evidence.length === 0 ? unscored() : scoreFindings(findings),
    plan: buildRevivalPlan(findings),
  };
  return ReportSchema.parse(report);
}

export function toMarkdown(report: Report): string {
  const lines: string[] = [];
  lines.push(`# ${report.subject}`, "", `Kind: ${report.kind}`, report.score.score === null ? "Score: unavailable (no evidence could be collected)" : `Score: ${report.score.score}/100 (${report.score.band})`, "");
  lines.push("## Findings");
  if (report.findings.length === 0) lines.push("- None");
  for (const f of report.findings) lines.push(`- [${f.severity}] ${f.title}: ${f.explanation}`);
  lines.push("", "## Unavailable evidence");
  if (report.unavailable.length === 0) lines.push("- None");
  for (const u of report.unavailable) lines.push(`- ${u.source}: ${u.reason}`);
  lines.push("", "## Revival plan");
  if (report.plan.steps.length === 0) lines.push(report.score.score === null ? "- No plan: fix the unavailable evidence first" : "- No action needed");
  for (const s of report.plan.steps) lines.push(`${s.priority}. ${s.action}`);
  return lines.join("\n") + "\n";
}
