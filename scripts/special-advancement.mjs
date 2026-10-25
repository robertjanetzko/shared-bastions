import { MODULE_ID } from "./constants.mjs";

/** A blank value preserves the system table; counts are totals, not additions. */
export function parseSpecialAdvancement(value) {
  if (!value.trim()) return null;
  const table = JSON.parse(value);
  if (!table || Array.isArray(table) || typeof table !== "object" || !Object.keys(table).length
    || Object.entries(table).some(([level, count]) => !/^(?:[1-9]|1[0-9]|20)$/.test(level)
      || !Number.isInteger(count) || count < 0 || count > 1000)) throw new Error("Invalid special facility advancement");
  return table;
}

let defaults;
export function specialAdvancementDefaults() {
  return foundry.utils.deepClone(defaults ?? CONFIG.DND5E.facilities.advancement.special);
}

export function advancementFromRows(rows) {
  if (!rows.length) throw new Error("Empty table");
  const table = {};
  for (const { level, count } of rows) {
    if (!String(level).trim() || !String(count).trim() || Object.hasOwn(table, level)) throw new Error("Invalid row");
    table[level] = Number(count);
  }
  return parseSpecialAdvancement(JSON.stringify(table));
}

export function registerSpecialAdvancement() {
  const apply = value => {
    const facilities = CONFIG.DND5E?.facilities;
    if (!facilities?.advancement?.special) return;
    defaults ??= foundry.utils.deepClone(facilities.advancement.special);
    let table;
    try { table = parseSpecialAdvancement(value); }
    catch {
      ui.notifications.error("SHARED_BASTION.SpecialAdvancementInvalid", { localize: true });
      table = null;
    }
    facilities.advancement.special = foundry.utils.deepClone(table ?? defaults);
  };
  game.settings.register(MODULE_ID, "specialAdvancement", {
    name: "SHARED_BASTION.SpecialAdvancement",
    hint: "SHARED_BASTION.SpecialAdvancementHint",
    scope: "world", config: false, restricted: true, type: String, default: "", onChange: apply
  });
  Hooks.once("ready", () => apply(game.settings.get(MODULE_ID, "specialAdvancement")));
}
