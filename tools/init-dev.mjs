import { writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const destination = new URL("../dev/secrets.json", import.meta.url);
try {
  await writeFile(destination, JSON.stringify({ foundry_admin_key: randomBytes(24).toString("hex") }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  console.log(`Created ${fileURLToPath(destination)} with a random local test admin key.`);
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("dev/secrets.json already exists; preserved without reading or changing it.");
}
