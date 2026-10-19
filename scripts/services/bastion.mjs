import { MODULE_ID, DATA_VERSION, BASTION_ID, BASTION_UUID } from "../constants.mjs";
import { BastionError } from "../core/errors.mjs";
import { isBastion, electGM } from "../core/ownership.mjs";

function ownershipPatch(actor, ownership) {
  const patch = {};
  for (const id of Object.keys(actor.ownership)) {
    if (!(id in ownership)) patch[`ownership.${id}`] = CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;
  }
  for (const [id, level] of Object.entries(ownership)) patch[`ownership.${id}`] = level;
  return patch;
}

export class BastionRepository {
  find() {
    const uuid = game.settings.get(MODULE_ID, "bastionUuid");
    const actor = game.actors.get(uuid?.split(".")[1]);
    return actor?.uuid === uuid && isBastion(actor) ? actor : null;
  }

  async migrate() {
    if (!game.user.isGM || electGM(game.users)?.id !== game.user.id || game.settings.get(MODULE_ID, "bastionUuid")) return;
    const actor = game.actors.get(BASTION_ID);
    if (isBastion(actor) && actor.flags.core?.sheetClass === `${MODULE_ID}.BastionSheet`
      && game.users.get(actor._stats.lastModifiedBy)?.isGM) await game.settings.set(MODULE_ID, "bastionUuid", actor.uuid);
  }

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
      for (const entry of roster) {
        const actor = await fromUuid(entry.uuid);
        // Reader membership uses recorded ownership, independent of the GM role override.
        if (actor?.getUserLevel(user) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) {
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
    const response = await this.bus.request("createBastion", BASTION_UUID, input);
    return fromUuid(response.uuid);
  }

  async planCreate(input) {
    this.assertGM();
    if (this.find()) throw new BastionError("BastionExists");
    if (game.actors.has(BASTION_ID)) throw new BastionError("BastionIdOccupied");
    const config = await this.configuration(input);
    const actor = {
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
    };
    const operations = [{ action: "create", documentName: "Actor", keepId: true, data: [actor] }];
    const setting = game.settings.get(MODULE_ID, "bastionUuid", { document: true });
    if (setting?._id) {
      if (setting.value !== BASTION_UUID) operations.push({ action: "update", documentName: "Setting", updates: [{ _id: setting.id, value: JSON.stringify(BASTION_UUID) }] });
    } else operations.push({ action: "create", documentName: "Setting", keepId: true,
      data: [{ _id: "SharedBastionCfg", key: `${MODULE_ID}.bastionUuid`, user: null, value: JSON.stringify(BASTION_UUID) }] });
    return { operations, revision: 0, uuid: BASTION_UUID };
  }

  async configure(actor, input) {
    this.assertGM();
    const response = await this.bus.request("configureBastion", actor.uuid, input);
    return fromUuid(response.uuid);
  }

  async planConfigure(actor, input) {
    this.assertGM();
    if (!isBastion(actor)) throw new BastionError("InvalidBastion");
    if (actor.flags[MODULE_ID].version !== DATA_VERSION) throw new BastionError("UnsupportedDataVersion");
    const config = await this.configuration(input);
    if (actor.items.some(item => item.type === "facility" && !input.participants.includes(item.flags[MODULE_ID]?.owner))) {
      throw new BastionError("ParticipantHasFacilities");
    }
    const revision = (actor.flags[MODULE_ID].revision ?? 0) + 1;
    const updates = {
      _id: actor.id,
      name: config.name,
      ...ownershipPatch(actor, config.ownership),
      [`flags.${MODULE_ID}.participants`]: input.participants,
      [`flags.${MODULE_ID}.roster`]: config.roster,
      [`flags.${MODULE_ID}.revision`]: revision
    };
    return { operations: [{ action: "update", documentName: "Actor", updates: [updates] }], revision, uuid: actor.uuid };
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
      if (!bastion || (actor && !bastion.flags[MODULE_ID].participants.includes(actor.uuid))) return;
      clearTimeout(timer);
      // Coalesce native multi-document updates and deletion sequences before resolving references.
      timer = setTimeout(() => { void this.bus.runSystem(refresh).catch(reportError); }, 40);
    };
    Hooks.on("updateActor", (actor, changes) => {
      if ("name" in changes || "img" in changes || "ownership" in changes) schedule(actor);
    });
    Hooks.on("deleteActor", actor => {
      if (actor.uuid === game.settings.get(MODULE_ID, "bastionUuid")) {
        void this.bus.runSystem(async () => {
          if (actor.uuid === game.settings.get(MODULE_ID, "bastionUuid")) await game.settings.set(MODULE_ID, "bastionUuid", "");
        }).catch(reportError);
      }
      schedule(actor);
    });
    Hooks.on("createUser", () => schedule());
    Hooks.on("updateUser", (user, changes) => { if ("role" in changes) schedule(); });
    Hooks.on("userConnected", () => schedule());
    queueMicrotask(() => schedule());
  }
}

export function reportError(error) {
  const code = error instanceof BastionError ? error.code : "CommitFailed";
  ui.notifications.error(`SHARED_BASTION.Errors.${code}`, { localize: true });
  if (!(error instanceof BastionError)) console.error(`${MODULE_ID} | Operation failed`, error);
}
