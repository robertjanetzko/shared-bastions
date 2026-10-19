import { MODULE_ID } from "../constants.mjs";
import { BastionError } from "../core/errors.mjs";
import { assertCanManage, resolveFacilityOwner } from "../core/ownership.mjs";
import { validateOperationPayload } from "../services/operations.mjs";

/** D&D5e 6.0.x operations; these methods only calculate document changes. */
export class OrderAdapter {
  constructor(adapter) { this.adapter = adapter; }
  get game() { return this.adapter.game; }
  get config() { return this.adapter.config; }

  orders(facility) {
    const system = facility.system;
    const orders = new Set();
    if (system.building.built) {
      if (system.type.value === "special") {
        if (system.order) orders.add(system.order);
        orders.add("maintain");
      }
      if (system.enlargeable && system.size !== "vast") orders.add("enlarge");
      if (system.type.subtype === "garden") orders.add("change");
    }
    return [...orders].filter(order => this.config.DND5E.facilities.orders[order]).map(value => ({ value,
      label: this.adapter.label("OrderNames", value, this.config.DND5E.facilities.orders[value].label) }));
  }

  async staff(facility) {
    return Promise.all(["hirelings", "defenders"].map(async role => ({ role,
      label: role === "hirelings" ? "SHARED_BASTION.Hirelings" : "SHARED_BASTION.Defenders",
      maximum: facility.system[role].max ?? 0, count: facility.system[role].value.length,
      people: await Promise.all(facility.system[role].value.map(async (uuid, index) => {
        const source = await this.adapter.resolveUuid(uuid).catch(() => null);
        return { uuid, missing: !source,
          name: source?.testUserPermission(this.game.user, "OBSERVER") ? source.name
            : facility.flags[MODULE_ID]?.occupants?.[role]?.[index]?.name ?? this.game.i18n.localize("SHARED_BASTION.MissingReference") };
      }))
    })));
  }

  async occupantForm(facility, role, user) {
    const owner = await resolveFacilityOwner(facility, this.adapter.resolveUuid);
    assertCanManage(user, owner);
    if (!["hirelings", "defenders"].includes(role)) throw new BastionError("InvalidRequest");
    const maximum = facility.system[role].max ?? 0;
    return { name: facility.name, actorField: new foundry.data.fields.DocumentUUIDField({ type: "Actor", required: false, nullable: true, blank: true }),
      title: role === "hirelings" ? "SHARED_BASTION.Hirelings" : "SHARED_BASTION.Defenders",
      slots: Array.from({ length: Math.min(maximum, 1000) }, (_, index) => ({ name: `occupant-${index}`, number: index + 1,
        uuid: facility.system[role].value[index] ?? "" })) };
  }

  async source(uuid, user, { actor = false, protectedDefinition = true } = {}) {
    const source = await this.adapter.resolveUuid(uuid);
    const access = source?.pack ? this.game.packs.get(source.pack) : source;
    if (!source || source.parent || (actor ? source.type !== "npc" : !source.system?.price || source.system?.quantity === undefined)
      || !access?.testUserPermission(user, "OBSERVER")) throw new BastionError("OperationSourceUnavailable");
    if (protectedDefinition && [...this.game.users].some(candidate => !candidate.isGM && access.testUserPermission(candidate, "OWNER"))) {
      throw new BastionError("UntrustedTemplate");
    }
    return source;
  }

  payment(owner, gold) {
    if (!Number.isFinite(gold) || gold < 0 || gold > Number.MAX_SAFE_INTEGER) throw new BastionError("InvalidOrder");
    if (!gold) return [];
    const manager = this.game.dnd5e?.applications?.CurrencyManager;
    if (!manager?.getActorCurrencyUpdates) throw new BastionError("UnsupportedRuntime");
    const { item, remainder, ...currency } = manager.getActorCurrencyUpdates(owner, gold, this.config.DND5E.defaultCurrency,
      { recursive: true, priority: "high" });
    if (remainder) throw new BastionError("InsufficientFunds");
    const operations = [{ action: "update", documentName: "Actor", updates: [{ _id: owner.id, ...currency }] }];
    if (item?.length) operations.push({ action: "update", documentName: "Item", parent: owner, updates: item });
    return operations;
  }

  async quote(facility, { order, options }, user) {
    if (!this.orders(facility).some(entry => entry.value === order)) throw new BastionError("InvalidOrder");
    const system = facility.system;
    if (system.disabled) throw new BastionError("FacilityDisabled");
    if (system.progress.max) throw new BastionError("OrderInProgress");
    let days = this.config.DND5E.facilities.orders[order]?.duration ?? this.game.settings.get("dnd5e", "bastionConfiguration").duration;
    let gold = 0;
    let updates = {};
    if (order === "enlarge") {
      const sizes = Object.entries(this.config.DND5E.facilities.sizes).sort(([, a], [, b]) => a.squares - b.squares);
      const index = sizes.findIndex(([size]) => size === system.size);
      if (index < 0 || index === sizes.length - 1) throw new BastionError("InvalidSize");
      const [target, next] = sizes[index + 1];
      gold = next.value - sizes[index][1].value;
      days = system.type.value === "basic" ? next.days - sizes[index][1].days : 0;
      if (!days) updates["system.size"] = target;
    }
    if (order === "craft" || order === "harvest") {
      const source = await this.source(options.item, user);
      if (order === "craft") ({ days, gold } = await source.system.getCraftCost({ baseItem: options.buyBaseItem ? "buy" : "craft" }));
      updates["system.craft"] = { item: source.uuid, quantity: order === "harvest" ? options.quantity : 1 };
    }
    if (order === "trade") {
      const trade = system.trade;
      updates = { "system.trade.pending.operation": null, "system.trade.pending.creatures": [],
        "system.trade.pending.value": null, "system.trade.pending.stocked": false };
      if (options.mode === "stocked") {
        if (trade.stock.max || trade.creatures.max || (options.stocked && trade.stock.stocked)) throw new BastionError("InvalidOrder");
        updates["system.trade.pending.operation"] = options.stocked ? "buy" : null;
        updates["system.trade.pending.stocked"] = options.stocked;
      } else if (options.mode === "stock") {
        if (!trade.stock.max || options.value > (options.sell ? trade.stock.value : trade.stock.max - trade.stock.value)) throw new BastionError("TradeCapacity");
        gold = options.sell ? 0 : options.value;
        updates["system.trade.pending.operation"] = options.sell ? "sell" : "buy";
        updates["system.trade.pending.value"] = options.value;
      } else {
        const current = trade.creatures.value;
        if (!trade.creatures.max) throw new BastionError("TradeCapacity");
        const uuids = options.sell ? options.indices.map(index => current[index]) : options.actors;
        if (uuids.some(uuid => !uuid) || (!options.sell && uuids.length + current.length > trade.creatures.max)) throw new BastionError("TradeCapacity");
        let price = 0;
        for (const uuid of uuids) {
          const source = await this.source(uuid, user, { actor: true });
          const value = source.system.attributes.price?.valueInGP;
          if (!Number.isFinite(value) || value < 0) throw new BastionError("OperationSourceUnavailable");
          price += value;
        }
        gold = options.sell ? 0 : price;
        updates["system.trade.pending.operation"] = options.sell ? "sell" : "buy";
        updates["system.trade.pending.value"] = price;
        updates["system.trade.pending.creatures"] = uuids;
        if (options.sell) updates["system.trade.creatures.value"] = current.filter((uuid, index) => !options.indices.includes(index));
      }
    }
    if (!Number.isInteger(days) || days < 0 || days > 365000 || (!days && order !== "enlarge")) throw new BastionError("InvalidOrderDuration");
    return { days, gold, updates };
  }

  async plan(facility, payload, user) {
    const { owner } = await this.adapter.assertRules(facility);
    const { days, gold, updates } = await this.quote(facility, payload, user);
    if (days) updates["system.progress"] = { value: 0, max: days, order: payload.order, paid: true };
    return { operations: this.payment(owner, gold), updates };
  }

  async configure(facility, order, user) {
    const owner = await resolveFacilityOwner(facility, this.adapter.resolveUuid);
    assertCanManage(user, owner);
    await this.adapter.assertRules(facility);
    if (!this.orders(facility).some(entry => entry.value === order)) throw new BastionError("InvalidOrder");
    if (facility.system.progress.max) throw new BastionError("OrderInProgress");
    if (facility.system.disabled) throw new BastionError("FacilityDisabled");
    const item = facility.clone({}, { keepId: true });
    const cls = this.config.DND5E.activityTypes.order.documentClass;
    const activity = new cls({ _id: foundry.utils.randomID(), type: "order", order,
      name: this.adapter.label("OrderNames", order, "SHARED_BASTION.Order") }, { parent: item });
    item.system.activities.set(activity.id, activity);
    const config = { consume: false };
    const DialogClass = activity.constructor.metadata.usage.dialog;
    const result = await new Promise(resolve => {
      const dialog = new DialogClass({ activity, config });
      dialog.addEventListener("render", () => {
        for (const input of dialog.element.querySelectorAll('[name="costs.gold"], [name="costs.days"]')) input.readOnly = true;
        if (!dialog.element.querySelector(".shared-bastion-order-hint")) {
          const hint = document.createElement("p");
          hint.className = "hint shared-bastion-order-hint";
          hint.textContent = this.game.i18n.localize("SHARED_BASTION.OrderCostHint");
          dialog.element.querySelector(".window-content")?.append(hint);
        }
      });
      dialog.addEventListener("close", () => resolve(dialog.used ? dialog.config : null), { once: true });
      void dialog.render({ force: true });
    });
    if (!result) return null;
    let options = {};
    if (order === "craft") options = { item: result.craft?.item, buyBaseItem: Boolean(result.craft?.buyBaseItem) };
    if (order === "harvest") options = { item: result.craft?.item, quantity: Number(result.craft?.quantity) };
    if (order === "trade") {
      const trade = result.trade ?? {};
      if (facility.system.trade.stock.max) options = { mode: "stock", sell: Boolean(trade.sell), value: Number(trade.stock?.value) };
      else if (facility.system.trade.creatures.max) options = trade.sell
        ? { mode: "creatures", sell: true, indices: (trade.creatures?.sell ?? []).flatMap((sold, index) => sold ? [index] : []) }
        : { mode: "creatures", sell: false, actors: (trade.creatures?.buy ?? []).filter(Boolean) };
      else options = { mode: "stocked", stocked: Boolean(trade.stock?.stocked) };
    }
    const payload = { order, options };
    validateOperationPayload("order", payload);
    return payload;
  }

  async occupants(facility, payload, user) {
    await this.adapter.ownerContext(facility);
    const maximum = facility.system[payload.role].max ?? 0;
    if (payload.actors.length > maximum) throw new BastionError("OccupantCapacity");
    const roster = [];
    for (const uuid of payload.actors) {
      const source = await this.source(uuid, user, { actor: true, protectedDefinition: false });
      roster.push({ uuid, name: source.name, img: source.img });
    }
    return { operations: [], updates: { [`system.${payload.role}.value`]: payload.actors,
      [`flags.${MODULE_ID}.occupants.${payload.role}`]: roster } };
  }

  async cancel(facility) {
    await this.adapter.ownerContext(facility);
    if (!facility.system.progress.max) throw new BastionError("InvalidOrder");
    const trade = facility.system.trade;
    const updates = { "system.progress": { value: 0, max: null, order: "", paid: false },
      "system.trade.pending.operation": null, "system.trade.pending.creatures": [], "system.trade.pending.value": null,
      "system.trade.pending.stocked": false, "system.craft.item": null };
    if (facility.system.progress.order === "trade" && trade.pending.operation === "sell" && trade.pending.creatures.length) {
      updates["system.trade.creatures.value"] = [...trade.creatures.value, ...trade.pending.creatures];
    }
    return { operations: [], updates };
  }

  async settle(facility, owner, result) {
    const operations = [];
    const items = [];
    if (result.gold) {
      const denomination = this.config.DND5E.defaultCurrency;
      const total = owner.system.currency[denomination] + result.gold;
      if (!Number.isFinite(total) || total < 0 || total > Number.MAX_SAFE_INTEGER) throw new BastionError("InvalidOrder");
      operations.push({ action: "update", documentName: "Actor", updates: [{ _id: owner.id, [`system.currency.${denomination}`]: total }] });
    }
    for (const reward of result.items ?? []) {
      const source = await this.source(reward.uuid, this.game.user);
      if (!Number.isSafeInteger(reward.quantity) || reward.quantity < 1) {
        throw new BastionError("OperationSourceUnavailable");
      }
      const data = source.toObject();
      delete data._stats;
      data._id = foundry.utils.randomID();
      data.system.quantity = reward.quantity;
      data.flags = { dnd5e: foundry.utils.deepClone(source.flags.dnd5e ?? {}),
        [MODULE_ID]: { resultFrom: facility.uuid } };
      items.push(data);
    }
    if (items.length) operations.push({ action: "create", documentName: "Item", parent: owner, keepId: true, data: items });
    const updates = { ...result.updates };
    if (result.order) updates[`flags.${MODULE_ID}.lastResult`] = { order: result.order, gold: result.gold ?? 0,
      items: items.map(item => ({ name: item.name, quantity: item.system.quantity })) };
    return { operations, updates };
  }
}
