import { MODULE_ID, SOURCE_REVIEW, OWNER_PROOF_RUNTIME } from "../constants.mjs";
import { BastionError } from "../core/errors.mjs";
import { resolveFacilityOwner, resolveParticipantOwner, assertCanManage } from "../core/ownership.mjs";
import { validateRequirements, hasException } from "../core/rules.mjs";

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
    return this.ownerValues(owner, facility.parent);
  }

  ownerValues(owner, bastion) {
    const level = owner.system?.details?.level;
    if (!Number.isInteger(level) || level < 0) throw new BastionError("InvalidOwnerLevel");
    const facilities = this.config.DND5E?.facilities;
    if (!facilities?.advancement || !facilities?.sizes) throw new BastionError("UnsupportedRuntime");
    const central = [...bastion.items].filter(item => item.type === "facility"
      && item.flags?.[MODULE_ID]?.owner === owner.uuid);
    const personal = [...owner.items].filter(item => item.type === "facility");
    // Existing facilities still on the owner count until the transfer is verified.
    const existing = [...central, ...personal];
    const count = type => existing.filter(item => item.system.type.value === type).length;
    return {
      owner,
      level,
      basic: { count: count("basic"), free: allowance(facilities.advancement.basic, level) },
      special: { count: count("special"), limit: allowance(facilities.advancement.special, level) },
      facilities: existing
    };
  }

  async ownerSummary(bastion, uuid, user) {
    if (!this.compatibility().supported) throw new BastionError("UnsupportedRuntime");
    const owner = await resolveParticipantOwner(bastion, uuid, this.resolveUuid);
    assertCanManage(user, owner);
    const { level, basic, special } = this.ownerValues(owner, bastion);
    return { level, basic, special };
  }

  roomArea(facility) {
    const squares = this.config.DND5E?.facilities?.sizes?.[facility.system.size]?.squares;
    if (!Number.isInteger(squares) || squares <= 0) throw new BastionError("InvalidSize");
    return squares;
  }

  label(category, value, fallback) {
    const key = `SHARED_BASTION.${category}.${value}`;
    return this.game.i18n.has(key) ? this.game.i18n.localize(key) : this.game.i18n.localize(fallback);
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
      sizeLabel: this.label("SizeNames", system.size, "SHARED_BASTION.UnknownSize"),
      stateLabel: localize(state),
      orderLabel: active ? this.label("OrderNames", progress.order, "SHARED_BASTION.UnknownOrder")
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
      label: this.label("SizeNames", value, size.label), days: size.days, cost: size.value,
      currency: this.game.i18n.localize(config.currencies[config.defaultCurrency].abbreviation) }));
  }

  install() {
    Hooks.on("preCreateItem", (item, data, options) => {
      if (options.sharedBastionConstruction && item.type === "facility") {
        // Native Facility._preCreate uses the carrier's level. Restore our owner-derived intent.
        item.updateSource({ "system.building.built": data.system.building.built });
      }
    });
  }

  newFacilityData(source, { id, owner, exceptions, definition }) {
    const data = source.toObject();
    delete data._stats;
    data._id = id;
    data.flags = { dnd5e: foundry.utils.deepClone(source.flags.dnd5e ?? {}), [MODULE_ID]: { owner, revision: 0, source: source.uuid,
      requirements: validateRequirements(source.flags[MODULE_ID]?.requirements ?? []), repeatable: source.flags[MODULE_ID]?.repeatable === true, exceptions } };
    // Reset operation state rather than importing a template's occupants or completed rewards.
    data.system.building = { built: false, size: data.system.size };
    data.system.progress = { value: 0, max: null, order: "", paid: false };
    data.system.disabled = false;
    for (const key of ["hirelings", "defenders"]) data.system[key].value = [];
    data.system.craft = { item: null, quantity: 1 };
    data.system.trade.creatures.value = [];
    data.system.trade.pending = { creatures: [], operation: null, stocked: false, value: 0 };
    data.system.trade.stock.stocked = false;
    data.system.trade.stock.value = 0;
    if (definition) {
      data.system.level = definition.level;
      data.system.order = definition.order;
      data.system.hirelings.max = definition.hirelings;
      data.system.defenders.max = definition.defenders;
      data.flags[MODULE_ID].requirements = validateRequirements(definition.requirements);
      data.flags[MODULE_ID].repeatable = definition.repeatable === true;
    }
    return data;
  }

  initialConstruction(data, context) {
    data.system.building.built = data.system.type.value === "special" || context.basic.count < context.basic.free;
    if (data.system.type.value === "basic" && data.system.building.built) {
      const basic = context.facilities.filter(item => item.system.type.value === "basic");
      const firstSize = ["cramped", "roomy"].includes(data.system.size) ? data.system.size : "cramped";
      const size = basic.length ? (basic.some(item => item.system.size === "cramped") ? "roomy" : "cramped") : firstSize;
      data.system.size = data.system.building.size = size;
    }
  }

  rulesView(item) {
    return { level: item.system.level, hirelings: item.system.hirelings.max ?? 0, defenders: item.system.defenders.max ?? 0,
      repeatable: item.flags[MODULE_ID]?.repeatable === true,
      orders: [{ value: "", label: this.game.i18n.localize("SHARED_BASTION.NoOrder") }, ...Object.entries(this.config.DND5E.facilities.orders)
        .filter(([value, config]) => item.system.type.value === "special" && !config.hidden && !config.basic && !["build", "change"].includes(value))
        .map(([value, config]) => ({ value, label: this.label("OrderNames", value, config.label) }))]
        .map(entry => ({ ...entry, selected: entry.value === item.system.order })) };
  }

  ruleUpdates(item, payload) {
    if (!this.rulesView(item).orders.some(entry => entry.value === payload.order)) throw new BastionError("InvalidRules");
    if (item.system.hirelings.value.length > payload.hirelings || item.system.defenders.value.length > payload.defenders) throw new BastionError("InvalidRules");
    return { "system.level": payload.level, "system.order": payload.order,
      "system.hirelings.max": payload.hirelings, "system.defenders.max": payload.defenders,
      [`flags.${MODULE_ID}.requirements`]: payload.requirements,
      [`flags.${MODULE_ID}.repeatable`]: payload.repeatable === true,
      [`flags.${MODULE_ID}.exceptions`]: payload.exceptions.map(entry => ({ scope: entry.scope, reason: entry.reason.trim() })) };
  }

  async assertRules(facility, { adding = false } = {}) {
    const context = await this.ownerContext(facility);
    const { owner, level } = context;
    const minimum = Math.min(...Object.keys(this.config.DND5E.facilities.advancement.basic).map(Number));
    if (level < Math.max(minimum, facility.system.level ?? minimum) && !hasException(facility, "level")) {
      throw new BastionError("LevelRequired");
    }
    if (facility.system.type.value === "special" && context.special.count + Number(adding) > context.special.limit
      && !hasException(facility, "limit")) throw new BastionError("FacilityLimit");
    const key = item => item.system.type.subtype || item.flags?.[MODULE_ID]?.source || item.system.identifier;
    if (facility.system.type.value === "special" && key(facility) && !facility.flags?.[MODULE_ID]?.repeatable
      && context.facilities.some(item => item !== facility && (!facility.uuid || item.uuid !== facility.uuid)
        && item.system.type.value === "special" && key(item) === key(facility)) && !hasException(facility, "limit")) {
      throw new BastionError("DuplicateFacility");
    }
    const requirements = validateRequirements(facility.flags?.[MODULE_ID]?.requirements ?? []);
    const satisfied = requirement => {
      if (requirement === "spellcasting") return Object.keys(owner.spellcastingClasses ?? {}).length > 0;
      const [kind, value] = requirement.split(":");
      if (kind === "tool") return (owner.system.tools?.[value]?.value ?? 0) >= 1;
      if (kind === "weapon") return owner.system.traits.weaponProf.value.has(value);
      if (kind === "item") return owner.items.some(item => item.system.identifier === value);
      // Explicit approvals cover prerequisites that the system does not model.
      return false;
    };
    if (requirements.some(requirement => !satisfied(requirement)) && !hasException(facility, "requirements")) {
      throw new BastionError("PrerequisiteRequired");
    }
    return context;
  }

  async ruleStatus(facility, user) {
    try {
      const owner = await resolveFacilityOwner(facility, this.resolveUuid);
      assertCanManage(user, owner);
      await this.assertRules(facility);
      return { allowed: true };
    } catch (error) {
      if (!(error instanceof BastionError)) throw error;
      return { allowed: false, code: error.code };
    }
  }

  /** T02: derive a paid native build order; never accept client-supplied costs. */
  async planBuild(facility, payload) {
    const context = await this.assertRules(facility);
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
