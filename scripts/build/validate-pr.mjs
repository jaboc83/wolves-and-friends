import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const pnpm = "pnpm";

function run(command, args, label, options = {}) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(pnpm, ["exec", "tsc", "--noEmit"], "TypeScript check");
run(pnpm, ["run", "build"], "Production build");

const testRoot = path.join(root, "scripts", "tests");
for (const directory of fs
  .readdirSync(testRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()) {
  const directoryPath = path.join(testRoot, directory);
  for (const file of fs
    .readdirSync(directoryPath)
    .filter((name) => /^test-.*\.mjs$/.test(name))
    .sort()) {
    const testPath = path.join(directoryPath, file);
    run(process.execPath, [testPath], `Test ${path.join(directory, file)}`);
  }
}

const base = process.env.VALIDATION_BASE_SHA;
if (base) {
  if (!/^[a-f0-9]{40}$/.test(base))
    throw new Error("VALIDATION_BASE_SHA must be a full commit SHA.");
  run(
    process.execPath,
    [path.join(root, "scripts", "build", "compare-client-assets.mjs"), base],
    "Client asset comparison",
  );
} else {
  console.log(
    "\nSkipping client asset comparison; set VALIDATION_BASE_SHA to the PR base commit.",
  );
}

console.log("\nPR validation passed.");
