import { MODULE_ID } from "../constants.mjs";
import { BastionError } from "../core/errors.mjs";

export const TURN_ACTIONS = new Set(["advanceTurn", "calendarAdvance"]);
export function validateTurnPayload(action, payload) {
  const keys = Object.keys(payload).sort().join();
  if (action === "advanceTurn" && keys === "") return;
  if (action === "calendarAdvance" && keys === "retry,until" && typeof payload.retry === "boolean"
    && Number.isFinite(payload.until) && Math.abs(payload.until) <= Number.MAX_SAFE_INTEGER) return;
  throw new BastionError("InvalidRequest");
}

/** A single batch includes all owners, facility cursors, and the turn receipt. */
export class TurnService {
  constructor(adapter, repository, bus) { this.adapter = adapter; this.repository = repository; this.bus = bus; this.pending = Promise.resolve(); }

  async plan(bastion, request, user) {
    if (!user.isGM) throw new BastionError("GMOnly");
    const clock = this.adapter.calendar;
    const manual = request.action === "advanceTurn";
    const until = manual ? clock.now : request.payload.until;
    if (until > clock.now) throw new BastionError("InvalidRequest");
    const flags = bastion.flags[MODULE_ID];
    const revision = request.revision + 1;
    const itemUpdates = [];
    const operations = [];
    const credits = new Map();
    const created = new Map();
    const baseline = clock.changed(bastion);
    let completed = 0;
    let blocked = 0;
    for (const facility of bastion.items.filter(item => item.type === "facility")) {
      const state = facility.flags[MODULE_ID] ?? {};
      const cursor = state.calendarTime ?? flags.calendarTime;
      const days = clock.enabled ? baseline ? 0 : clock.days(cursor, until) : manual ? clock.duration : 0;
      const failedToday = state.progressIssue && !clock.days(state.progressIssue.until, until);
      if (!baseline && !manual && (!days || (failedToday && !request.payload.retry))) continue;
      const itemRevision = (state.revision ?? 0) + 1;
      const metadata = { _id: facility.id, [`flags.${MODULE_ID}.revision`]: itemRevision,
        [`flags.${MODULE_ID}.calendarTime`]: baseline ? clock.now : Math.max(cursor ?? until, until),
        [`flags.${MODULE_ID}.progressIssue`]: null };
      if (baseline && !manual) {
        delete metadata[`flags.${MODULE_ID}.revision`];
        // Native preflight removes unchanged embedded updates. Do not include them
        // in a strict transaction when only the calendar mode has changed.
        if (state.calendarTime !== clock.now || state.progressIssue) itemUpdates.push(metadata);
        continue;
      }
      try {
        const { owner } = await this.adapter.ownerContext(facility);
        const result = await this.adapter.game.dnd5e.bastion.advanceTurn(facility, { duration: days, turn: manual, performUpdates: false });
        const plan = await this.adapter.operations.settle(facility, owner, result, { deferGold: true });
        if (result.gold) {
          const credit = credits.get(owner.id) ?? { owner, gold: 0 };
          credit.gold += result.gold; credits.set(owner.id, credit);
        }
        for (const operation of plan.operations) {
          if (operation.action !== "create" || operation.documentName !== "Item") throw new BastionError("CommitFailed");
          const entry = created.get(owner.id) ?? { parent: owner, data: [] };
          entry.data.push(...operation.data); created.set(owner.id, entry);
        }
        itemUpdates.push({ ...metadata, ...plan.updates });
        if (result.order && result.order !== "maintain") completed++;
      } catch (error) {
        if (!(error instanceof BastionError)) throw error;
        blocked++;
        itemUpdates.push({ _id: facility.id, [`flags.${MODULE_ID}.revision`]: itemRevision,
          [`flags.${MODULE_ID}.progressIssue`]: { code: error.code, until } });
      }
    }
    for (const credit of credits.values()) operations.push(...this.adapter.operations.credit(credit.owner, credit.gold));
    for (const entry of created.values()) operations.push({ action: "create", documentName: "Item", keepId: true, ...entry });
    if (itemUpdates.length) operations.push({ action: "update", documentName: "Item", parent: bastion, updates: itemUpdates });
    const actorUpdate = { _id: bastion.id, [`flags.${MODULE_ID}.revision`]: revision,
      [`flags.${MODULE_ID}.calendarMode`]: clock.enabled, [`flags.${MODULE_ID}.calendarKey`]: clock.key,
      [`flags.${MODULE_ID}.calendarTime`]: baseline ? clock.now : Math.max(flags.calendarTime ?? until, until) };
    if (manual) {
      actorUpdate[`flags.${MODULE_ID}.turnCount`] = (flags.turnCount ?? 0) + 1;
      actorUpdate[`flags.${MODULE_ID}.lastTurn`] = { time: clock.now, days: clock.enabled ? 0 : clock.duration, completed, blocked };
    }
    operations.push({ action: "update", documentName: "Actor", updates: [actorUpdate] });
    return { operations, revision, uuid: bastion.uuid };
  }

  async turn() {
    if (!this.adapter.game.user.isGM) throw new BastionError("GMOnly");
    const actor = this.repository.find();
    if (!actor) throw new BastionError("InvalidBastion");
    const count = actor.flags[MODULE_ID].turnCount ?? 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await this.bus.request("advanceTurn", actor.uuid, {}); }
      catch (error) {
        if (!(error instanceof BastionError) || error.code !== "Conflict") throw error;
        if ((actor.flags[MODULE_ID].turnCount ?? 0) !== count) return;
        if (attempt === 2) throw error;
      }
    }
  }

  async sync(retry = false) {
    if (!this.bus.isExecutor) return;
    const actor = this.repository.find();
    if (!this.adapter.calendar.hasWork(actor, this.adapter.calendar.now, retry)) return;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await this.bus.request("calendarAdvance", actor.uuid, { until: this.adapter.calendar.now, retry }); }
      catch (error) { if (!(error instanceof BastionError) || error.code !== "Conflict" || attempt === 2) throw error; }
    }
  }

  install() {
    let timer;
    let retryNext = false;
    const schedule = (retry = false) => {
      retryNext ||= retry;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const force = retryNext; retryNext = false;
        this.pending = this.pending.catch(() => {}).then(() => this.sync(force)).catch(error => {
          if (error instanceof BastionError) ui.notifications.error(`SHARED_BASTION.Errors.${error.code}`, { localize: true });
          else console.error(`${MODULE_ID} | Calendar progress failed`, error);
        });
      }, 40);
    };
    Hooks.on("updateWorldTime", () => schedule());
    Hooks.on("userConnected", () => schedule());
    Hooks.on("updateSetting", setting => { if (["dnd5e.calendarConfig", "dnd5e.calendar", "core.calendarConfig", `${MODULE_ID}.bastionUuid`].includes(setting.key)) schedule(); });
    Hooks.on("updateActor", actor => { if (actor === this.repository.find()) schedule(); });
    const itemChanged = item => {
      const bastion = this.repository.find();
      if (!bastion) return;
      if (item.parent === bastion) schedule();
      else if (bastion.items.some(facility => facility.type === "facility" && facility.system.craft.item === item.uuid
        && facility.flags[MODULE_ID]?.progressIssue)) schedule(true);
    };
    for (const event of ["createItem", "updateItem", "deleteItem"]) Hooks.on(event, itemChanged);
    this.adapter.calendar.installBridge(this, this.repository);
    schedule();
  }
}
