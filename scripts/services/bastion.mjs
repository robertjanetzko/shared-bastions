import { MODULE_ID, DATA_VERSION } from "../constants.mjs";
import { BastionError } from "../core/errors.mjs";
import { isBastion, electGM } from "../core/ownership.mjs";

const BASTION_ID = "SharedBastion001";

function ownershipPatch(actor, ownership) {
  const patch = {};
  for (const id of Object.keys(actor.ownership)) {
    if (!(id in ownership)) patch[`ownership.${id}`] = CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;
  }
  for (const [id, level] of Object.entries(ownership)) patch[`ownership.${id}`] = level;
  return patch;
}

export class BastionRepository {
  find() { return game.actors.find(isBastion) ?? null; }

  assertGM() {
    if (!game.user.isGM) throw new BastionError("GMOnly");
  }

  async roster(uuids) {
    if (!Array.isArray(uuids) || uuids.length > 100 || new Set(uuids).size !== uuids.length) throw new BastionError("InvalidRequest");
    const roster = [];
    for (const uuid of uuids) {
      if (!/^Actor\.[A-Za-z0-9]+$/.test(uuid)) throw new BastionError("MissingOwner");
      const actor = await fromUuid(uuid);
      if (!actor || actor.type !== "character" || actor.pack || actor.isToken || isBastion(actor)) throw new BastionError("MissingOwner");
      // Only public bastion identity, never level, currency, abilities or biography.
      roster.push({ uuid, name: actor.name, img: actor.img, available: true });
    }
    return roster;
  }

  async ownership(roster) {
    const ownership = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE };
    for (const user of game.users) {
      if (user.isGM) continue;
      for (const entry of roster) {
        const actor = await fromUuid(entry.uuid);
        if (actor?.testUserPermission(user, "OWNER")) {
          ownership[user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
          break;
        }
      }
    }
    return ownership;
  }

  async configuration(input) {
    if (!input || Object.keys(input).sort().join() !== "name,participants"
      || typeof input.name !== "string" || !input.name.trim() || input.name.length > 120) throw new BastionError("InvalidRequest");
    const roster = await this.roster(input.participants);
    return { name: input.name.trim(), roster, ownership: await this.ownership(roster) };
  }

  async create(input) {
    this.assertGM();
    if (this.find()) throw new BastionError("BastionExists");
    const config = await this.configuration(input);
    const actor = await Actor.create({
      _id: BASTION_ID,
      name: config.name,
      type: "character",
      img: "icons/svg/castle.svg",
      ownership: config.ownership,
      flags: {
        core: { sheetClass: `${MODULE_ID}.BastionSheet` },
        [MODULE_ID]: { bastion: true, version: DATA_VERSION, participants: input.participants,
          roster: config.roster, revision: 0 }
      }
    }, { keepId: true });
    if (!isBastion(actor)) throw new BastionError("CommitFailed");
    return actor;
  }

  async configure(actor, input) {
    this.assertGM();
    if (!isBastion(actor)) throw new BastionError("InvalidBastion");
    if (actor.flags[MODULE_ID].version !== DATA_VERSION) throw new BastionError("UnsupportedDataVersion");
    const config = await this.configuration(input);
    if (actor.items.some(item => item.type === "facility" && !input.participants.includes(item.flags[MODULE_ID]?.owner))) {
      throw new BastionError("ParticipantHasFacilities");
    }
    const updated = await actor.update({
      name: config.name,
      ...ownershipPatch(actor, config.ownership),
      [`flags.${MODULE_ID}.participants`]: input.participants,
      [`flags.${MODULE_ID}.roster`]: config.roster,
      [`flags.${MODULE_ID}.revision`]: (actor.flags[MODULE_ID].revision ?? 0) + 1
    });
    if (!updated || JSON.stringify(updated.flags[MODULE_ID].participants) !== JSON.stringify(input.participants)) {
      throw new BastionError("CommitFailed");
    }
    return updated;
  }

  install() {
    let timer;
    const refresh = async () => {
      if (!game.user.isGM || electGM(game.users)?.id !== game.user.id) return;
      const bastion = this.find();
      if (!bastion) return;
      const roster = [];
      for (const uuid of bastion.flags[MODULE_ID].participants) {
        const actor = await fromUuid(uuid);
        const previous = bastion.flags[MODULE_ID].roster?.find(entry => entry.uuid === uuid);
        roster.push({ uuid, name: actor?.name ?? previous?.name ?? uuid, img: actor?.img ?? previous?.img ?? "icons/svg/mystery-man.svg",
          available: actor?.type === "character" && !isBastion(actor) });
      }
      const ownership = await this.ownership(roster);
      if (game.actors.get(bastion.id) !== bastion) return;
      try {
        await bastion.update({ ...ownershipPatch(bastion, ownership), [`flags.${MODULE_ID}.roster`]: roster });
      } catch (error) {
        if (game.actors.get(bastion.id) === bastion) throw error;
      }
    };
    const schedule = actor => {
      const bastion = this.find();
      if (!bastion?.flags[MODULE_ID].participants.includes(actor.uuid)) return;
      clearTimeout(timer);
      // Coalesce native multi-document updates and deletion sequences before resolving references.
      timer = setTimeout(() => { void refresh().catch(reportError); }, 40);
    };
    Hooks.on("updateActor", (actor, changes) => {
      if ("name" in changes || "img" in changes || "ownership" in changes) schedule(actor);
    });
    Hooks.on("deleteActor", schedule);
  }
}

export function reportError(error) {
  const code = error instanceof BastionError ? error.code : "CommitFailed";
  ui.notifications.error(`SHARED_BASTION.Errors.${code}`, { localize: true });
  if (!(error instanceof BastionError)) console.error(`${MODULE_ID} | Operation failed`, error);
}
