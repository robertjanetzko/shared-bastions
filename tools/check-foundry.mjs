import { readFile } from "node:fs/promises";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";

const installation = process.argv[2];
if (!installation) throw new Error("Usage: npm run check:foundry -- /absolute/path/to/extracted/Foundry");
const root = fileURLToPath(new URL("../", import.meta.url));
const common = await import(pathToFileURL(path.resolve(installation, "common/server.mjs")));
const metadata = JSON.parse(await readFile(path.resolve(installation, "package.json"), "utf8"));
if (metadata.release.generation !== 14) throw new Error("This integration check requires Foundry V14");
const manifest = JSON.parse(await readFile(path.join(root, "module.json"), "utf8"));
const module = new common.packages.BaseModule({
  ...manifest,
  // Availability normally comes from the server release object. Test it explicitly below.
  availability: common.CONST.PACKAGE_AVAILABILITY_CODES.UNKNOWN
}, { strict: true });
if (!module.validate()) throw new Error("Foundry rejected the module schema");
const release = { ...metadata.release, version: `${metadata.release.generation}.${metadata.release.build}` };
const status = common.packages.BaseModule.testAvailability(module, { release });
const expectedStatus = manifest.compatibility.verified === release.version
  ? common.CONST.PACKAGE_AVAILABILITY_CODES.VERIFIED : common.CONST.PACKAGE_AVAILABILITY_CODES.UNKNOWN;
if (status !== expectedStatus) {
  throw new Error(`Unexpected native availability code: ${status}`);
}
const system = [...module.relationships.systems];
if (system.length !== 1 || system[0].id !== "dnd5e") throw new Error("Native system relationship is incorrect");
const require = createRequire(path.resolve(installation, "package.json"));
const handlebars = require("handlebars").create();
const translation = JSON.parse(await readFile(path.join(root, "lang/en.json"), "utf8"));
handlebars.registerHelper("localize", key => key.split(".").reduce((value, part) => value?.[part], translation) ?? key);
const template = handlebars.compile(await readFile(path.join(root, "templates/status.hbs"), "utf8"));
const html = template({ supported: true, foundry: release.version, system: "6.0.6", reviewedSystem: "6.0.6" });
if (!html.includes("Shared Bastion") || html.includes("{{")) throw new Error("Native Handlebars render failed");
console.log(`Foundry ${release.version}: native manifest schema, system relationship, version range and Handlebars render passed.`);
console.log("This is an offline API check; it does not verify module startup, browser layout, or owner integration in a world.");
