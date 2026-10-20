import { MODULE_ID } from "../constants.mjs";
import { BastionError } from "../core/errors.mjs";

/** D&D5e 6.0.6 UI boundary. Selection only; never call Item.use or activity.use. */
export class BastionUIAdapter {
  constructor(adapter) { this.adapter = adapter; }

  orderIcon(order) {
    const icon = this.adapter.config.DND5E.facilities.orders[order]?.icon;
    return icon ?? "systems/dnd5e/icons/svg/activity/order.svg";
  }

  async chooseActivity(facility) {
    const status = await this.adapter.ruleStatus(facility, this.adapter.game.user);
    if (!status.allowed) throw new BastionError(status.code);
    const view = this.adapter.facilityView(facility);
    if (view.disabled) throw new BastionError("FacilityDisabled");
    if (view.progress) throw new BastionError("OrderInProgress");
    const actions = view.buildable ? [{ value: "build" }] : this.adapter.operations.orders(facility);
    if (!actions.length) return null;
    const allowed = new Set(actions.map(entry => entry.value));
    const item = facility.clone({}, { keepId: true });
    item.system.activities.clear();
    const Activity = this.adapter.config.DND5E.activityTypes.order.documentClass;
    for (const order of allowed) {
      const activity = new Activity({ _id: foundry.utils.randomID(), type: "order", order, img: this.orderIcon(order),
        name: this.adapter.game.i18n.format("DND5E.FACILITY.Order.Issue", {
          order: this.adapter.label("OrderNames", order, "SHARED_BASTION.Order")
        }) }, { parent: item });
      item.system.activities.set(activity.id, activity);
    }
    const Base = this.adapter.game.dnd5e.applications.activity.ActivityChoiceDialog;
    class SharedActivityChoice extends Base {
      async _prepareContext(options) {
        const context = await super._prepareContext(options);
        // Native item.canUse follows the carrier's ownership. Use the checked rule owner instead.
        return { ...context, controlHint: null,
          activities: this.item.system.activities.filter(activity => allowed.has(activity.order))
            .map(activity => this._prepareActivityContext(activity)) };
      }
    }
    const activity = await SharedActivityChoice.create(item);
    return allowed.has(activity?.order) ? activity.order : null;
  }

  async selectFacility(ownerSummary, type) {
    if (!["basic", "special"].includes(type)) throw new BastionError("InvalidRequest");
    const other = type === "basic" ? "special" : "basic";
    const additional = { type: { [type]: 1, [other]: -1 } };
    if (!this.adapter.game.user.isGM) additional.level = { max: ownerSummary.level };
    const Browser = this.adapter.game.dnd5e.applications.CompendiumBrowser;
    const uuid = await Browser.selectOne({ hint: this.adapter.game.i18n.localize("SHARED_BASTION.BrowserHint"), filters: { locked: { types: new Set(["facility"]), additional } } });
    if (!uuid) return null;
    const source = await this.adapter.resolveUuid(uuid);
    if (source?.type !== "facility" || source.system.type.value !== type) throw new BastionError("InvalidTemplate");
    return uuid;
  }

  tile(facility) {
    const system = facility.system;
    const executing = system.progress.max ? system.progress.order : null;
    return {
      orderIcon: executing ? this.orderIcon(executing) : null,
      isSpecial: system.type.value === "special",
      building: !system.building.built,
      // Empty staff slots use the native icon treatment without resolving private NPC documents.
      occupants: ["hirelings", "defenders"].flatMap(role => Array.from({ length: Math.min(system[role].max ?? 0, 1000) }, (_, index) => ({
        role, occupied: Boolean(system[role].value[index]),
        name: facility.flags[MODULE_ID]?.occupants?.[role]?.[index]?.name ?? "",
        img: facility.flags[MODULE_ID]?.occupants?.[role]?.[index]?.img ?? null,
        label: role === "hirelings" ? "SHARED_BASTION.Hirelings" : "SHARED_BASTION.Defenders"
      })))
    };
  }
}

/** Add keyboard navigation to the system menu without changing its rendering or actions. */
export function bastionContextMenu() {
  return class extends game.dnd5e.applications.ContextMenu5e {
    async _onRenderEntries(menu, options) {
      await super._onRenderEntries(menu, options);
      const entries = [...menu.querySelectorAll(".context-item")];
      menu.setAttribute("role", "menu");
      for (const entry of entries) { entry.tabIndex = -1; entry.setAttribute("role", "menuitem"); }
      menu.addEventListener("keydown", event => {
        const index = entries.indexOf(document.activeElement);
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault(); event.stopPropagation();
          const next = event.key === "Home" ? 0 : event.key === "End" ? entries.length - 1
            : (index + (event.key === "ArrowUp" ? -1 : 1) + entries.length) % entries.length;
          entries[next]?.focus();
        } else if (["Enter", " "].includes(event.key)) {
          event.preventDefault(); event.stopPropagation(); entries[index]?.click();
        } else if (event.key === "Escape") {
          event.preventDefault(); event.stopPropagation(); void this.close();
        }
      });
    }
    async _onRender(options) {
      await super._onRender(options);
      if (options.event?.pointerType === "keyboard") this.element.querySelector(".context-item")?.focus();
    }
  };
}

/** Resolve only after the system init hook has published its application API. */
export function bastionSheetBase() {
  return dnd5e.applications.api.ApplicationV2Mixin(foundry.applications.sheets.ActorSheetV2);
}
