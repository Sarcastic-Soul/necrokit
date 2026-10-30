import { readFileSync } from "node:fs";
import { toMarkdown } from "@necrokit/core";
import { scanRepository } from "./run.ts";

const fixturePath = process.argv[2];
if (!fixturePath) {
  console.error("Usage: node --experimental-strip-types src/cli.ts <fixture-path>");
  process.exit(1);
}

const snapshot: unknown = JSON.parse(readFileSync(fixturePath, "utf8"));
process.stdout.write(toMarkdown(scanRepository(snapshot, new Date().toISOString())));
