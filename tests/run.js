#!/usr/bin/env node
/* Runs every suite in tests/ and reports. Rebuilds first, so the DOM tests
 * always run against current source rather than a stale dist/. */
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const HERE = __dirname;
const ROOT = path.resolve(HERE, "..");

console.log(execFileSync("node", [path.join(ROOT, "tools", "build.js")], { encoding: "utf8" }).trim());
console.log("");

const suites = fs.readdirSync(HERE).filter((f) => f.endsWith(".test.js")).sort();
let failed = 0;
for (const f of suites) {
  const r = spawnSync("node", [path.join(HERE, f)], { encoding: "utf8", stdio: "inherit" });
  if (r.status !== 0) failed++;
}

console.log("");
if (failed) {
  console.error(`${failed} of ${suites.length} suites FAILED`);
  process.exit(1);
}
console.log(`all ${suites.length} suites passed`);
