// Bundles the static demo site and the single-file library. Run: pnpm build:site
import { build } from "esbuild";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const common = { bundle: true, format: "esm", target: "es2022", logLevel: "info", legalComments: "none" };

await build({ ...common, entryPoints: [resolve(root, "site/src/main.ts")], outfile: resolve(root, "site/app.bundle.js"), minify: true, platform: "browser" });
await build({ ...common, entryPoints: [resolve(root, "lib/necrokit.ts")], outfile: resolve(root, "dist/necrokit.mjs"), platform: "neutral" });
