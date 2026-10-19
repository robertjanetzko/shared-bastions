import { MODULE_ID, SOURCE_REVIEW, OWNER_PROOF_RUNTIME } from "../constants.mjs";
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

  /** Public facility data only; viewing never resolves the private owner document. */
  facilityView(facility) {
    const system = facility.system;
    const config = this.config.DND5E.facilities;
    const localize = key => this.game.i18n.localize(key);
    const progress = system.progress;
    const active = Number.isFinite(progress.max) && progress.max > 0;
    const state = system.disabled ? "SHARED_BASTION.State.Disabled"
      : active && progress.order === "build" ? "SHARED_BASTION.State.Building"
      : active && progress.order === "enlarge" ? "SHARED_BASTION.State.Enlarging"
      : system.building.built ? "SHARED_BASTION.State.Built" : "SHARED_BASTION.State.Unbuilt";
    return {
      id: facility.id, name: facility.name, img: facility.img,
      type: system.type.value,
      typeLabel: localize(config.types[system.type.value]?.subtypes?.[system.type.subtype]
        ?? config.types[system.type.value]?.label ?? "SHARED_BASTION.UnknownType"),
      sizeLabel: localize(config.sizes[system.size]?.label ?? "SHARED_BASTION.UnknownSize"),
      stateLabel: localize(state),
      orderLabel: active ? localize(config.orders[progress.order]?.label ?? "SHARED_BASTION.UnknownOrder")
        : localize("SHARED_BASTION.NoOrder"),
      progress: active ? { value: progress.value, max: progress.max,
        percent: Math.max(0, Math.min(100, Math.round(progress.value / progress.max * 100))) } : null,
      buildable: system.type.value === "basic" && !system.building.built && !active && !system.disabled,
      description: system.description?.value ?? ""
    };
  }

  buildOptions() {
    const config = this.config.DND5E;
    return Object.entries(config.facilities.sizes).map(([value, size]) => ({ value,
      label: this.game.i18n.localize(size.label), days: size.days, cost: size.value,
      currency: this.game.i18n.localize(config.currencies[config.defaultCurrency].abbreviation) }));
  }

  /** T02: derive a paid native build order; never accept client-supplied costs. */
  async planBuild(facility, payload) {
    const context = await this.ownerContext(facility);
    const minimum = Math.min(...Object.keys(this.config.DND5E.facilities.advancement.basic).map(Number));
    if (context.level < minimum) throw new BastionError("LevelRequired");
    if (facility.system.type.value !== "basic" || facility.system.building.built) throw new BastionError("InvalidOrder");
    if (facility.system.progress.max) throw new BastionError("OrderInProgress");
    const size = this.config.DND5E.facilities.sizes[payload.size];
    if (!size || !Number.isInteger(size.days) || !Number.isFinite(size.value) || size.value < 0) {
      throw new BastionError("InvalidSize");
    }
    const manager = this.game.dnd5e?.applications?.CurrencyManager;
    if (!manager?.getActorCurrencyUpdates) throw new BastionError("UnsupportedRuntime");
    const { item, remainder, ...currency } = manager.getActorCurrencyUpdates(
      context.owner, size.value, this.config.DND5E.defaultCurrency, { recursive: true, priority: "high" }
    );
    if (remainder) throw new BastionError("InsufficientFunds");
    const operations = [{ action: "update", documentName: "Actor", updates: [{ _id: context.owner.id, ...currency }] }];
    if (item?.length) operations.push({ action: "update", documentName: "Item", parent: context.owner, updates: item });
    return {
      operations,
      updates: {
        "system.building.size": payload.size,
        "system.progress": { value: 0, max: size.days, order: "build", paid: true }
      }
    };
  }

  async planProgress(facility, payload) {
    await this.ownerContext(facility);
    const bastion = this.game.dnd5e?.bastion;
    if (!bastion?.advanceTurn) throw new BastionError("UnsupportedRuntime");
    const result = await bastion.advanceTurn(facility, { duration: payload.days, turn: false, performUpdates: false });
    // Reward settlement is a later T07 task. Never discard a native result.
    if (result.gold || result.items?.length) throw new BastionError("IntegrationPending");
    return { operations: [], updates: result.updates };
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
      writeRuntimeSupported: status.supported && status.foundry === OWNER_PROOF_RUNTIME.foundry,
      ownerIntegrationAccepted: status.foundry === OWNER_PROOF_RUNTIME.foundry
        && status.system === OWNER_PROOF_RUNTIME.system && status.supported
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
