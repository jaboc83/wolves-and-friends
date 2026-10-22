import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
  cwd: root,
  encoding: "utf8",
});
if (result.error) throw result.error;
const actualRoot = path.resolve(result.stdout.trim());
const sameRoot =
  process.platform === "win32"
    ? actualRoot.toLowerCase() === path.resolve(root).toLowerCase()
    : actualRoot === path.resolve(root);
if (result.status !== 0 || !sameRoot)
  throw new Error("Run this command from inside the repository.");

const configured = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: root,
  stdio: "inherit",
});
if (configured.error) throw configured.error;
if (configured.status !== 0) process.exit(configured.status ?? 1);
console.log("Git hooks installed from .githooks.");
