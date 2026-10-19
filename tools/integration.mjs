import { spawnSync } from "node:child_process";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const env = { ...process.env,
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? path.join(tmpdir(), "shared-bastion-browsers") };
const args = process.argv.slice(2);
const install = args[0] === "--install";
const result = spawnSync(process.execPath,
  [path.join(root, "node_modules/@playwright/test/cli.js"), ...(install ? ["install", "chromium"] : ["test", ...args])],
  { cwd: root, env, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
