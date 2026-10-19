import { readFile, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { OWNER_PROOF_RUNTIME } from "../scripts/constants.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const json = async file => JSON.parse(await readFile(path.join(root, file), "utf8"));
const manifest = await json("module.json");
const pkg = await json("package.json");
const fail = message => { throw new Error(message); };
if (manifest.id !== pkg.name || manifest.version !== pkg.version) fail("Manifest/package identity mismatch");
if (manifest.compatibility.verified && manifest.compatibility.verified !== OWNER_PROOF_RUNTIME.foundry) fail("Verified build must match the documented native runtime proof");
const files = [];
async function walk(directory) {
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else files.push(file);
  }
}
for (const directory of ["scripts", "tools", "test", "integration", "templates", "styles", "lang"]) await walk(directory);
files.push("playwright.config.mjs");
for (const file of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(language => language.path)]) {
  if (!(await stat(path.join(root, file))).isFile()) fail(`Missing manifest file: ${file}`);
}
function flatten(object, prefix = "") {
  return Object.entries(object).flatMap(([key, value]) => typeof value === "object" && value !== null
    ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`]);
}
const de = flatten(await json("lang/de.json")).sort();
const en = flatten(await json("lang/en.json")).sort();
if (JSON.stringify(de) !== JSON.stringify(en)) fail("German/English translation keys differ");
let checked = 0;
for (const file of files) {
  if (file.endsWith(".mjs")) {
    const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding: "utf8" });
    if (result.error) throw result.error;
    if (result.status !== 0) fail(result.stderr);
    checked++;
  }
  if (!/\.(mjs|hbs)$/.test(file)) continue;
  const content = await readFile(path.join(root, file), "utf8");
  for (const [key] of content.matchAll(/SHARED_BASTION\.[A-Za-z][A-Za-z.]+/g)) {
    const prefix = key.replace(/\.$/, "");
    if (!de.includes(key) && !de.some(candidate => candidate.startsWith(`${prefix}.`))) fail(`Missing translation ${key} in ${file}`);
  }
  for (const [, code] of content.matchAll(/new BastionError\(["']([A-Za-z]+)["']/g)) {
    if (!de.includes(`SHARED_BASTION.Errors.${code}`)) fail(`Missing error translation ${code} in ${file}`);
  }
  for (const [, relative] of content.matchAll(/(?:from\s+|import\s*\()["'](\.[^"']+)["']/g)) {
    if (!(await stat(path.resolve(root, path.dirname(file), relative))).isFile()) fail(`Missing import in ${file}`);
  }
}
console.log(`Checked manifest, ${checked} ES modules, imports and ${de.length} bilingual translation keys.`);
