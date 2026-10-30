import { readFileSync } from "node:fs";
import { toMarkdown } from "@necrokit/core";
import { scanPackage } from "./run.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: scan <fixture.json>");
  process.exit(1);
}

let fixture: unknown;
try {
  fixture = JSON.parse(readFileSync(path, "utf8"));
} catch {
  fixture = null;
}

process.stdout.write(toMarkdown(scanPackage(fixture, new Date().toISOString())));
