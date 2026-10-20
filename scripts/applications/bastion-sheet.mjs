import { bastionContextMenu, bastionSheetBase } from "../adapters/bastion-ui.mjs";
import { sortOwnerSections, facilitySlots } from "../core/presentation.mjs";
import { MODULE_ID } from "../constants.mjs";
import { isBastion, electGM } from "../core/ownership.mjs";
import { BastionError } from "../core/errors.mjs";
import { configureBastion } from "./setup.mjs";
import { reportError } from "../services/bastion.mjs";
import * as facilityDialogs from "./facility-dialogs.mjs";
import { transferFacilities } from "./transfer.mjs";

const { DialogV2 } = foundry.applications.api;
const template = name => `modules/shared-bastion/templates/${name}.hbs`;

export function createBastionSheet() {
  return class BastionSheet extends bastionSheetBase() {
    static DEFAULT_OPTIONS = {
      // This is an action dashboard, not a form that submits Actor patches.
      tag: "section", canImport: false, sheetConfig: false, ownershipConfig: false,
      classes: ["shared-bastion", "bastion-sheet", "dnd5e2", "hidden-title"],
      position: { width: 900, height: 730 },
      window: { resizable: true, icon: "fa-solid fa-chess-rook" },
      actions: { configureBastion: BastionSheet.configure, useFacility: BastionSheet.useFacility,
        viewFacility: BastionSheet.viewFacility, buildFacility: BastionSheet.buildFacility,
        addFacility: BastionSheet.addFacility, addWorldFacility: BastionSheet.addWorldFacility, editFacility: BastionSheet.manageFacility,
        removeFacility: BastionSheet.manageFacility, reassignFacility: BastionSheet.manageFacility,
        setFacilityRules: BastionSheet.manageFacility, configureTemplates: BastionSheet.configureTemplates,
        issueOrder: BastionSheet.issueOrder, cancelOrder: BastionSheet.cancelOrder, setOccupants: BastionSheet.setOccupants,
        advanceTurn: BastionSheet.advanceTurn, retryCalendar: BastionSheet.retryCalendar, transferFacilities }
    };

    static PARTS = { bastion: { template: template("bastion"), scrollable: [".bastion-body"] } };

    busy = new Set();

    get title() { return this.actor.name; }
    get api() { return game.modules.get(MODULE_ID).api; }

    static async configure() { await configureBastion(this.api.repository, this.actor); }

    static async advanceTurn() {
      try {
        const confirmed = await DialogV2.confirm({ window: { title: "SHARED_BASTION.AdvanceTurn" },
          content: await foundry.applications.handlebars.renderTemplate(template("turn"), {
            name: this.actor.name, ...this.api.calendarState()
          }), rejectClose: false });
        if (confirmed) await this.api.advanceTurn();
      } catch (error) { reportError(error); }
    }

    static async retryCalendar() {
      try { await this.api.request("calendarAdvance", this.actor.uuid, { until: game.time.worldTime, retry: true }); }
      catch (error) { reportError(error); }
    }

    static async configureTemplates() {
      try { await facilityDialogs.configureTemplates(this.actor, this.api); } catch (error) { reportError(error); }
    }

    get canWrite() {
      return game.socket.connected && Boolean(electGM(game.users)) && this.api.diagnostics().writeRuntimeSupported;
    }

    assertOwner(uuid, { write = true } = {}) {
      const entry = this.actor.flags[MODULE_ID]?.roster?.find(entry => entry.uuid === uuid);
      const owner = game.actors.get(uuid?.split(".")[1]);
      if (!entry?.available || owner?.uuid !== uuid) throw new BastionError("MissingOwner");
      if (!game.user.isGM && !owner.testUserPermission(game.user, "OWNER")) throw new BastionError("NotOwner");
      if (!this.actor.testUserPermission(game.user, "OBSERVER")) throw new BastionError("NotOwner");
      if (write) this.assertWrite();
      return entry;
    }

    assertWrite() {
      if (!game.socket.connected) throw new BastionError("ConnectionRequired");
      if (!electGM(game.users)) throw new BastionError("NoGM");
      if (!this.api.diagnostics().writeRuntimeSupported) throw new BastionError("UnverifiedWriteRuntime");
    }

    actionTarget(element, action, data = {}) {
      return { dataset: { ...element.dataset, action, ...data }, closest: selector => element.closest(selector) };
    }

    _getHeaderControls() {
      const controls = super._getHeaderControls();
      if (!game.user.isGM || !this.canWrite) return controls;
      return [...controls, ...[
        ["configureBastion", "Configure", "users-gear"], ["configureTemplates", "TemplateRules", "sliders"],
        ["transferFacilities", "TransferTitle", "file-import"], ["advanceTurn", "AdvanceTurn", "forward-step"],
        ...(this.api.calendarState().enabled && this.actor.items.some(item => item.flags[MODULE_ID]?.progressIssue)
          ? [["retryCalendar", "RetryProgress", "rotate-right"]] : [])
      ].map(([action, label, icon]) => ({ action, label: `SHARED_BASTION.${label}`, icon: `fa-solid fa-${icon}` }))];
    }

    static async addFacility(event, target) {
      const uuid = target.closest("[data-owner-uuid]")?.dataset.ownerUuid;
      const key = `add:${uuid}`;
      if (this.busy.has(key)) return;
      this.busy.add(key);
      target.disabled = true;
      try {
        this.assertOwner(uuid);
        const summary = await this.api.ownerSummary(this.actor, uuid);
        const selected = await this.api.selectFacility(summary, target.dataset.facilityType);
        if (selected) {
          this.assertOwner(uuid);
          const exceptions = game.user.isGM ? await facilityDialogs.addExceptions(selected) : [];
          if (exceptions) await this.api.request("addFacility", this.actor.uuid, { owner: uuid, template: selected, exceptions });
        }
      } catch (error) { reportError(error); }
      finally { this.busy.delete(key); await this.render(); }
    }

    static async addWorldFacility(event, target) {
      try {
        const uuid = target.closest("[data-owner-uuid]")?.dataset.ownerUuid;
        const entry = this.assertOwner(uuid);
        await facilityDialogs.addFacility(this.actor, [entry], this.api, { worldOnly: true });
      } catch (error) { reportError(error); }
    }

    static async useFacility(event, target) {
      let key;
      try {
        const item = this.facility(target);
        const pendingKey = `choice:${item.id}`;
        if (this.busy.has(pendingKey)) return;
        key = pendingKey;
        this.busy.add(key);
        target.setAttribute?.("aria-disabled", "true");
        target.setAttribute?.("aria-busy", "true");
        const order = await this.api.chooseActivity(item);
        if (!order) return;
        // Re-resolve permission and state after a dialog that may have remained open.
        this.facility(target);
        if (order === "build") await BastionSheet.buildFacility.call(this, event, target);
        else await BastionSheet.issueOrder.call(this, event, this.actionTarget(target, "issueOrder", { order }));
      } catch (error) { reportError(error); }
      finally { if (key) { this.busy.delete(key); await this.render(); } }
    }

    static async manageFacility(event, target) {
      try {
        const item = this.facility(target, { repair: target.dataset.action === "reassignFacility" });
        if (target.dataset.action === "reassignFacility") await facilityDialogs.reassignFacility(item, this.actor.flags[MODULE_ID].roster, this.api);
        else await facilityDialogs[target.dataset.action](item, this.api);
      } catch (error) { reportError(error); }
    }

    async _onFirstRender(context, options) {
      await super._onFirstRender(context, options);
      const Menu = bastionContextMenu();
      const menuEntry = (action, label, icon, data = {}, visible = () => true) => ({
        label: `SHARED_BASTION.${label}`, icon: `<i class="fa-solid fa-${icon}" inert></i>`,
        visible: element => this.mayManage(element) && visible(element),
        onClick: (event, element) => this.options.actions[action].call(this, event, this.actionTarget(element, action, data))
      });
      new Menu(this.element, ".facility[data-facility-id]", [
        menuEntry("viewFacility", "FacilityDetails", "book-open"),
        menuEntry("editFacility", "EditFacility", "pen", {}, () => this.canWrite),
        menuEntry("removeFacility", "RemoveFacility", "trash", {}, () => this.canWrite),
        ...["hirelings", "defenders"].map(role => menuEntry("setOccupants", role === "hirelings" ? "Hirelings" : "Defenders", "users", { role },
          element => this.canWrite && this.actor.items.get(element.dataset.facilityId)?.system[role].max > 0)),
        menuEntry("cancelOrder", "CancelOrder", "ban", {}, element => this.canWrite && Boolean(this.actor.items.get(element.dataset.facilityId)?.system.progress.max)),
        menuEntry("reassignFacility", "ReassignFacility", "user-pen", {}, () => game.user.isGM && this.canWrite),
        menuEntry("setFacilityRules", "FacilityRules", "sliders", {}, () => game.user.isGM && this.canWrite)
      ], { jQuery: false, fixed: true });
      new Menu(this.element, ".bastion-section-heading[data-owner-uuid]", [
        menuEntry("addWorldFacility", "AddWorldFacility", "plus", {}, () => this.canWrite),
        menuEntry("addFacility", "AddSpecialFacility", "building-columns", { facilityType: "special" }, () => game.user.isGM && this.canWrite)
      ], { jQuery: false, fixed: true });
      this.element.addEventListener("keydown", event => {
        const target = event.target.closest(".facility[data-facility-id], .bastion-section-heading[data-owner-uuid]");
        if (!target || !this.mayManage(target)) return;
        if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
          event.preventDefault();
          const rect = target.getBoundingClientRect();
          target.dispatchEvent(new PointerEvent("contextmenu", { bubbles: true, cancelable: true, pointerType: "keyboard", clientX: rect.x + 16, clientY: rect.y + 16 }));
        } else if ((event.key === "Enter" || event.key === " ") && target.dataset.action === "useFacility") {
          event.preventDefault();
          void BastionSheet.useFacility.call(this, event, target);
        }
      });
    }

    mayManage(element) {
      if (element.dataset.facilityId && game.user.isGM && this.actor.testUserPermission(game.user, "OBSERVER")) return true;
      const item = this.actor.items.get(element.dataset.facilityId);
      const uuid = item?.flags[MODULE_ID]?.owner ?? element.closest("[data-owner-uuid]")?.dataset.ownerUuid;
      try { this.assertOwner(uuid, { write: false }); return true; } catch { return false; }
    }

    facility(target, { write = true, repair = false } = {}) {
      const item = this.actor.items.get(target.closest("[data-facility-id]")?.dataset.facilityId);
      if (item?.type !== "facility" || item.flags[MODULE_ID]?.transferPending) throw new BastionError("InvalidFacility");
      if (game.user.isGM && (repair || !write)) { if (write) this.assertWrite(); }
      else this.assertOwner(item.flags[MODULE_ID]?.owner, { write });
      return item;
    }

    static async viewFacility(event, target) {
      try {
        const item = this.facility(target, { write: false });
        const data = this.api.presentation.facility(item);
        data.notes = item.flags[MODULE_ID]?.notes;
        data.staff = await this.api.presentation.staff(item);
        data.description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(data.description,
          { secrets: false, relativeTo: item });
        await DialogV2.wait({ classes: ["dnd5e2"], window: { title: item.name }, position: { width: 540 },
          content: await foundry.applications.handlebars.renderTemplate(template("facility-preview"), data),
          rejectClose: false, buttons: [{ action: "close", label: "SHARED_BASTION.Close" }] });
      } catch (error) { reportError(error); }
    }

    static async buildFacility(event, target) {
      let item;
      let acquired = false;
      try {
        item = this.facility(target);
        if (this.busy.has(item.id)) return;
        this.busy.add(item.id); acquired = true;
        target.disabled = true;
        const size = await DialogV2.wait({ window: { title: "SHARED_BASTION.Build" },
          content: await foundry.applications.handlebars.renderTemplate(template("build"), {
            name: item.name, sizes: this.api.presentation.buildOptions()
          }), rejectClose: false,
          buttons: [{ action: "build", label: "SHARED_BASTION.Build", default: true,
            callback: (event, button, dialog) => dialog.element.querySelector('[name="size"]').value }] });
        if (typeof size !== "string") return;
        this.facility(target);
        await this.api.request("build", item.uuid, { size });
      } catch (error) { reportError(error); }
      finally { if (acquired) this.busy.delete(item.id); await this.render(); }
    }

    static async issueOrder(event, target) {
      let item;
      let acquired = false;
      try {
        item = this.facility(target);
        if (this.busy.has(item.id)) return;
        this.busy.add(item.id); acquired = true; target.disabled = true;
        const payload = await this.api.configureOrder(item, target.dataset.order);
        if (payload) await this.api.request("order", item.uuid, payload);
      } catch (error) { reportError(error); }
      finally { if (acquired) this.busy.delete(item.id); await this.render(); }
    }

    static async cancelOrder(event, target) {
      try {
        const item = this.facility(target);
        const confirmed = await DialogV2.confirm({ window: { title: "SHARED_BASTION.CancelOrder" },
          content: await foundry.applications.handlebars.renderTemplate(template("cancel-order"), { name: item.name }), rejectClose: false });
        if (confirmed) await this.api.request("cancelOrder", item.uuid, {});
      } catch (error) { reportError(error); }
    }

    static async setOccupants(event, target) {
      try {
        const item = this.facility(target);
        const role = target.dataset.role;
        const context = await this.api.occupantForm(item, role);
        const actors = await DialogV2.wait({ window: { title: context.title }, position: { width: 520 },
          content: await foundry.applications.handlebars.renderTemplate(template("occupants"), context), rejectClose: false,
          buttons: [{ action: "save", label: "SHARED_BASTION.Save", default: true,
            callback: (event, button, dialog) => context.slots.map(slot => dialog.element.querySelector(`[name="${slot.name}"]`).value).filter(Boolean) }] });
        if (Array.isArray(actors)) await this.api.request("setOccupants", item.uuid, { role, actors });
      } catch (error) { reportError(error); }
    }

    async _prepareContext(options) {
      if (!isBastion(this.actor)) throw new BastionError("InvalidBastion");
      const context = await super._prepareContext(options);
      const state = this.actor.flags[MODULE_ID];
      const roster = state.roster ?? state.participants.map(uuid => ({ uuid, name: uuid, available: false }));
      const owned = new Set(roster.filter(entry => {
        const owner = game.actors.get(entry.uuid.split(".")[1]);
        return entry.available && owner?.uuid === entry.uuid && (game.user.isGM || owner.testUserPermission(game.user, "OWNER"));
      }).map(entry => entry.uuid));
      const sections = sortOwnerSections(roster, game.users, { isGM: game.user.isGM, owned, language: game.i18n.lang });
      const facilities = await Promise.all(this.actor.items.filter(item => item.type === "facility" && !item.flags[MODULE_ID]?.transferPending).map(async item => {
        const data = this.api.presentation.facility(item);
        const own = owned.has(item.flags[MODULE_ID]?.owner);
        const rules = own ? await this.api.checkRules(item) : null;
        const progressIssue = item.flags[MODULE_ID]?.progressIssue;
        return { ...data, ...this.api.presentation.tile(item),
          ownerUuid: item.flags[MODULE_ID]?.owner, missingOwner: !roster.find(entry => entry.uuid === item.flags[MODULE_ID]?.owner)?.available,
          canInteract: this.canWrite && own,
          isBusy: this.busy.has(item.id) || this.busy.has(`choice:${item.id}`),
          canInspect: own || game.user.isGM,
          progressIssueLabel: progressIssue ? `SHARED_BASTION.Errors.${progressIssue.code}` : null,
          ruleIssueLabel: own && !rules?.allowed ? `SHARED_BASTION.Errors.${rules.code}` : null,
          notes: item.flags[MODULE_ID]?.notes,
          exceptions: (item.flags[MODULE_ID]?.exceptions ?? []).map(entry => ({ ...entry,
            label: { level: "SHARED_BASTION.ExceptionLevel", limit: "SHARED_BASTION.ExceptionLimit", requirements: "SHARED_BASTION.ExceptionRequirements" }[entry.scope] })) };
      }));
      const unknown = facilities.filter(item => !roster.some(entry => entry.uuid === item.ownerUuid));
      if (unknown.length) sections.push({ uuid: "unknown", name: game.i18n.localize("SHARED_BASTION.UnknownOwner"), available: false });
      for (const section of sections) {
        section.canManage = owned.has(section.uuid);
        section.canAdd = section.canManage && this.canWrite && !this.busy.has(`add:${section.uuid}`);
        section.summary = section.canManage ? await this.api.ownerSummary(this.actor, section.uuid) : null;
        section.groups = ["basic", "special"].map(type => ({ type,
          label: type === "basic" ? "SHARED_BASTION.BasicFacilities" : "SHARED_BASTION.SpecialFacilities",
          icon: type === "basic" ? "fa-chess-rook" : "fa-building-columns",
          facilities: facilities.filter(item => item.type === type && (section.uuid === "unknown" ? unknown.includes(item) : item.ownerUuid === section.uuid)),
          slots: facilitySlots(section.summary, type),
          counter: type === "special" && section.summary ? `${section.summary.special.count} / ${section.summary.special.limit}` : null,
          canAdd: section.canAdd
        }));
      }
      return { ...context, name: this.actor.name, sections, canWrite: this.canWrite,
        hasGM: Boolean(electGM(game.users)), hasConnection: game.socket.connected,
        calendar: this.api.calendarState(), turnCount: state.turnCount ?? 0, lastTurn: state.lastTurn,
        emptyParticipants: !roster.length };
    }
  };
}
