import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { toMarkdown, type Report } from "@necrokit/core";
import { scanRepository, scanRepositoryLive } from "./run.ts";

const args = process.argv.slice(2);
const live = args.indexOf("--live");
const json = args.includes("--json");
const target = live === -1 ? args.find((a) => !a.startsWith("--")) : args[live + 1];
if (!target) {
  console.error("usage: scan <fixture.json> | scan --live <owner/repo> [--json]");
  process.exit(1);
}

let report: Report;
if (live !== -1) {
  const token = process.env.GITHUB_TOKEN;
  report = await scanRepositoryLive(target, token ? { githubToken: token } : {});
} else {
  let snapshot: unknown;
  // pnpm runs the script inside the app folder; resolve paths against where the user typed the command.
  const path = resolve(process.env.INIT_CWD ?? process.cwd(), target);
  try {
    snapshot = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`Could not read ${path}: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
  report = scanRepository(snapshot, new Date().toISOString());
}

process.stdout.write(json ? `${JSON.stringify(report, null, 2)}\n` : toMarkdown(report));
