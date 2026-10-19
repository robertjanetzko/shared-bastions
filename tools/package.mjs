import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const checked = spawnSync(process.execPath, ["tools/check.mjs"], { cwd: root, stdio: "inherit" });
if (checked.error) throw checked.error;
if (checked.status !== 0) process.exit(checked.status ?? 1);
const manifest = JSON.parse(await readFile(path.join(root, "module.json"), "utf8"));
const staging = await mkdtemp(path.join(tmpdir(), "shared-bastion-package-"));
try {
  const destination = path.join(staging, "shared-bastion");
  await mkdir(destination);
  // Explicit allowlist prevents worlds, downloads, secrets and interview data entering a release.
  for (const entry of ["module.json", "scripts", "styles", "templates", "lang", "README.md"]) {
    await cp(path.join(root, entry), path.join(destination, entry), { recursive: true });
  }
  await mkdir(path.join(root, "dist"), { recursive: true });
  const archive = path.join(root, "dist", `shared-bastion-${manifest.version}.zip`);
  const result = spawnSync("python3", ["-c", "import shutil,sys; shutil.make_archive(sys.argv[1], 'zip', sys.argv[2], 'shared-bastion')", archive.slice(0, -4), staging], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Packaging failed; Python 3 is required.");
  console.log(`Created ${archive}`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
