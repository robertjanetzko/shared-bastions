import { MODULE_ID, DATA_VERSION } from "../constants.mjs";
import { BastionError } from "./errors.mjs";

const actorUuid = /^Actor\.[A-Za-z0-9]+$/;

export function isBastion(actor) {
  return actor?.type === "character" && actor?.flags?.[MODULE_ID]?.bastion === true;
}

/** Resolve on the authoritative client. No fallback to the physical parent. */
export async function resolveFacilityOwner(facility, resolveUuid) {
  const bastion = facility?.parent;
  if (facility?.type !== "facility" || !isBastion(bastion)) throw new BastionError("InvalidFacility");
  const state = bastion.flags[MODULE_ID];
  if (state.version !== DATA_VERSION) throw new BastionError("UnsupportedDataVersion");
  const uuid = facility.flags?.[MODULE_ID]?.owner;
  if (!actorUuid.test(uuid ?? "") || !Array.isArray(state.participants) || !state.participants.includes(uuid)) {
    throw new BastionError("MissingOwner");
  }
  const owner = await resolveUuid(uuid);
  if (!owner || owner.uuid !== uuid || owner.type !== "character" || isBastion(owner)
    || owner.pack || owner.isToken) throw new BastionError("MissingOwner");
  return owner;
}

export function assertCanManage(user, owner) {
  if (!user?.active) throw new BastionError("InvalidUser");
  if (user.isGM) return;
  if (!owner?.testUserPermission(user, "OWNER")) throw new BastionError("NotOwner");
}

/** Elect using stable IDs so collection ordering cannot choose a second executor. */
export function electGM(users) {
  return [...users].filter(user => user.active && user.isGM)
    .sort((a, b) => a.id.localeCompare(b.id, "en"))[0] ?? null;
}
