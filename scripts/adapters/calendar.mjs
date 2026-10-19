import { MODULE_ID, DATA_VERSION } from "../constants.mjs";
import { BastionError } from "../core/errors.mjs";

/** The native aggregate API has no per-actor hook; isolate its delegation here. */
export class CalendarAdapter {
  constructor(adapter) { this.adapter = adapter; }
  get game() { return this.adapter.game; }
  get enabled() { return Boolean(this.game.settings.get("dnd5e", "calendarConfig").enabled); }
  get key() {
    // A local configuration fingerprint, not an authorization or receipt identifier.
    let hash = 2166136261;
    for (const char of JSON.stringify(this.game.time.calendar.toObject())) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return String(hash >>> 0);
  }
  get now() { return this.game.time.worldTime; }
  get duration() {
    const days = this.game.settings.get("dnd5e", "bastionConfiguration").duration;
    if (!Number.isInteger(days) || days < 1 || days > 365000) throw new BastionError("InvalidOrderDuration");
    return days;
  }

  initialState() { return { calendarMode: this.enabled, calendarKey: this.key, calendarTime: this.now }; }

  changed(bastion) {
    const flags = bastion.flags[MODULE_ID];
    return flags.calendarMode !== this.enabled || flags.calendarKey !== this.key || !Number.isFinite(flags.calendarTime);
  }

  days(from, until) {
    if (!Number.isFinite(from) || !Number.isFinite(until) || until <= from) return 0;
    const calendar = this.game.time.calendar;
    if (typeof calendar.constructor.dayDifference !== "function") throw new BastionError("UnsupportedRuntime");
    const result = calendar.constructor.dayDifference(calendar.timeToComponents(from), calendar.timeToComponents(until));
    if (!Number.isSafeInteger(result) || result < 0) throw new BastionError("InvalidOrderDuration");
    return result;
  }

  hasWork(bastion, until, retry = false) {
    if (!bastion || bastion.flags[MODULE_ID].version !== DATA_VERSION) return false;
    if (this.changed(bastion)) return true;
    if (!this.enabled) return false;
    return bastion.items.some(item => {
      if (item.type !== "facility") return false;
      const flags = item.flags[MODULE_ID] ?? {};
      const cursor = flags.calendarTime ?? bastion.flags[MODULE_ID].calendarTime;
      if (!this.days(cursor, until)) return false;
      return retry || !flags.progressIssue || this.days(flags.progressIssue.until, until) > 0;
    });
  }

  installBridge(service, repository) {
    const bastion = this.game.dnd5e.bastion;
    const original = bastion.advanceAllFacilities;
    bastion.advanceAllFacilities = async function(actor, options = {}) {
      if (actor !== repository.find()) return original.call(this, actor, options);
      // Calendar owns its native batch. Our own authenticated time hook does the work.
      // Pure native aggregate calls on the shared actor therefore have no side effects.
      if (options.performUpdates === false) return { message: undefined, updates: [] };
      if (options.turn === false) await service.sync();
      else await service.turn();
      return { message: undefined, updates: [] };
    };
  }
}
