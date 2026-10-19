import { MODULE_ID, SOURCE_REVIEW } from "../constants.mjs";
import { BastionError } from "../core/errors.mjs";
import { resolveFacilityOwner } from "../core/ownership.mjs";

/** All system-specific reads belong here. No system or core files are patched. */
export class Dnd5eAdapter {
  constructor({ game, config, resolveUuid }) {
    this.game = game;
    this.config = config;
    this.resolveUuid = resolveUuid;
  }

  compatibility() {
    const foundry = String(this.game.version ?? "");
    const system = this.game.system;
    const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(foundry);
    // Foundry reports 14.367; reject pre-release/unknown strings instead of guessing.
    const supported = system?.id === "dnd5e" && /^6\.0\.\d+$/.test(system.version ?? "")
      && match?.[1] === "14" && Number(match[2]) >= 367;
    return { supported: Boolean(supported), foundry, system: system?.version ?? "", sourceReview: SOURCE_REVIEW };
  }

  async ownerContext(facility) {
    if (!this.compatibility().supported) throw new BastionError("UnsupportedRuntime");
    const owner = await resolveFacilityOwner(facility, this.resolveUuid);
    const level = owner.system?.details?.level;
    if (!Number.isInteger(level) || level < 0) throw new BastionError("InvalidOwnerLevel");
    const facilities = this.config.DND5E?.facilities;
    if (!facilities?.advancement || !facilities?.sizes) throw new BastionError("UnsupportedRuntime");
    const central = [...facility.parent.items].filter(item => item.type === "facility"
      && item.flags?.[MODULE_ID]?.owner === owner.uuid);
    const personal = [...owner.items].filter(item => item.type === "facility");
    // Existing facilities still on the owner count until the transfer is verified.
    const existing = [...central, ...personal];
    const count = type => existing.filter(item => item.system.type.value === type).length;
    return {
      owner,
      level,
      basic: { count: count("basic"), free: allowance(facilities.advancement.basic, level) },
      special: { count: count("special"), limit: allowance(facilities.advancement.special, level) }
    };
  }

  roomArea(facility) {
    const squares = this.config.DND5E?.facilities?.sizes?.[facility.system.size]?.squares;
    if (!Number.isInteger(squares) || squares <= 0) throw new BastionError("InvalidSize");
    return squares;
  }

  /** Only public runtime diagnostics: never include owner currency, traits, or documents. */
  diagnostics() {
    const status = this.compatibility();
    return {
      supported: status.supported,
      foundry: status.foundry,
      system: status.system,
      reviewedSystem: SOURCE_REVIEW.system,
      reviewedCommit: SOURCE_REVIEW.commit,
      ownerIntegrationAccepted: false
    };
  }
}

function allowance(table, level) {
  if (!table || typeof table !== "object") throw new BastionError("UnsupportedRuntime");
  let result = 0;
  for (const [threshold, value] of Object.entries(table).sort(([a], [b]) => Number(a) - Number(b))) {
    if (!Number.isInteger(Number(threshold)) || !Number.isInteger(value) || value < 0) {
      throw new BastionError("UnsupportedRuntime");
    }
    if (Number(threshold) <= level) result = value;
  }
  return result;
}
