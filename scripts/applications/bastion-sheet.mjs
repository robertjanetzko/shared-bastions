import { MODULE_ID } from "../constants.mjs";
import { isBastion, electGM } from "../core/ownership.mjs";
import { BastionError } from "../core/errors.mjs";
import { configureBastion } from "./setup.mjs";
import { reportError } from "../services/bastion.mjs";
import * as facilityDialogs from "./facility-dialogs.mjs";

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const template = name => `modules/shared-bastion/templates/${name}.hbs`;

export class BastionSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    // This is an action dashboard, not a form that submits Actor patches.
    tag: "section", canImport: false, sheetConfig: false, ownershipConfig: false,
    classes: ["shared-bastion", "bastion-sheet", "dnd5e2"],
    position: { width: 900, height: 730 },
    window: { resizable: true, icon: "fa-solid fa-chess-rook" },
    actions: { configureBastion: BastionSheet.configure, changeView: BastionSheet.changeView,
      viewFacility: BastionSheet.viewFacility, buildFacility: BastionSheet.buildFacility,
      addFacility: BastionSheet.addFacility, editFacility: BastionSheet.manageFacility,
      removeFacility: BastionSheet.manageFacility, reassignFacility: BastionSheet.manageFacility,
      setFacilityRules: BastionSheet.manageFacility, configureTemplates: BastionSheet.configureTemplates }
  };

  static PARTS = { bastion: { template: template("bastion"), scrollable: [".bastion-body"] } };

  view = "owners";
  filter = "all";
  busy = new Set();

  get title() { return this.actor.name; }
  get api() { return game.modules.get(MODULE_ID).api; }

  static async configure() { await configureBastion(this.api.repository, this.actor); }

  static async configureTemplates() {
    try { await facilityDialogs.configureTemplates(this.actor, this.api); } catch (error) { reportError(error); }
  }

  static async addFacility(event, target) {
    if (this.busy.has("add")) return;
    this.busy.add("add"); target.disabled = true;
    try {
      const owners = (this.actor.flags[MODULE_ID].roster ?? []).filter(entry => {
        const owner = game.actors.get(entry.uuid.split(".")[1]);
        return entry.available && owner?.testUserPermission(game.user, "OWNER");
      });
      await facilityDialogs.addFacility(this.actor, owners, this.api);
    } catch (error) { reportError(error); }
    finally { this.busy.delete("add"); await this.render(); }
  }

  static async manageFacility(event, target) {
    try {
      const item = this.facility(target);
      if (target.dataset.action === "reassignFacility") await facilityDialogs.reassignFacility(item, this.actor.flags[MODULE_ID].roster, this.api);
      else await facilityDialogs[target.dataset.action](item, this.api);
    } catch (error) { reportError(error); }
  }

  static async changeView(event, target) {
    if (!["owners", "overview"].includes(target.dataset.view)) return;
    this.view = target.dataset.view;
    await this.render();
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector('[name="ownerFilter"]')?.addEventListener("change", event => {
      this.filter = event.currentTarget.value;
      void this.render();
    });
  }

  facility(target) {
    const item = this.actor.items.get(target.closest("[data-facility-id]")?.dataset.facilityId);
    if (item?.type !== "facility") throw new BastionError("InvalidFacility");
    return item;
  }

  static async viewFacility(event, target) {
    try {
      const item = this.facility(target);
      const data = this.api.presentation.facility(item);
      data.description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(data.description,
        { secrets: false, relativeTo: item });
      await DialogV2.wait({ window: { title: item.name }, position: { width: 540 },
        content: await foundry.applications.handlebars.renderTemplate(template("facility-preview"), data),
        rejectClose: false, buttons: [{ action: "close", label: "SHARED_BASTION.Close" }] });
    } catch (error) { reportError(error); }
  }

  static async buildFacility(event, target) {
    let item;
    try {
      item = this.facility(target);
      if (this.busy.has(item.id)) return;
      this.busy.add(item.id);
      target.disabled = true;
      const size = await DialogV2.wait({ window: { title: "SHARED_BASTION.Build" },
        content: await foundry.applications.handlebars.renderTemplate(template("build"), {
          name: item.name, sizes: this.api.presentation.buildOptions()
        }), rejectClose: false,
        buttons: [{ action: "build", label: "SHARED_BASTION.Build", default: true,
          callback: (event, button, dialog) => dialog.element.querySelector('[name="size"]').value }] });
      if (typeof size !== "string") return;
      await this.api.request("build", item.uuid, { size });
    } catch (error) { reportError(error); }
    finally { if (item) this.busy.delete(item.id); await this.render(); }
  }

  async _prepareContext(options) {
    if (!isBastion(this.actor)) throw new BastionError("InvalidBastion");
    const context = await super._prepareContext(options);
    const state = this.actor.flags[MODULE_ID];
    const roster = state.roster ?? state.participants.map(uuid => ({ uuid, name: uuid, available: false }));
    const hasGM = Boolean(electGM(game.users));
    const canWrite = game.socket.connected && hasGM && this.api.diagnostics().writeRuntimeSupported;
    // Native rights are consulted only for the permission decision, never to display private values.
    const owned = new Set(roster.filter(entry => {
      const actor = game.actors.get(entry.uuid.split(".")[1]);
      return entry.available && actor?.uuid === entry.uuid && actor.testUserPermission(game.user, "OWNER");
    }).map(entry => entry.uuid));
    if (!["all", "mine", ...roster.map(entry => entry.uuid)].includes(this.filter)) this.filter = "all";
    const facilities = (await Promise.all(this.actor.items.filter(item => item.type === "facility").map(async item => {
      const owner = roster.find(entry => entry.uuid === item.flags[MODULE_ID]?.owner);
      const data = this.api.presentation.facility(item);
      const own = owned.has(owner?.uuid);
      const rules = own ? await this.api.checkRules(item) : null;
      return { ...data, owner: owner?.name ?? game.i18n.localize("SHARED_BASTION.UnknownOwner"),
        ownerUuid: owner?.uuid ?? "unknown", missingOwner: !owner?.available,
        canAdmin: canWrite && game.user.isGM,
        notes: item.flags[MODULE_ID]?.notes,
        exceptions: (item.flags[MODULE_ID]?.exceptions ?? []).map(entry => ({ ...entry,
          label: { level: "SHARED_BASTION.ExceptionLevel", limit: "SHARED_BASTION.ExceptionLimit", requirements: "SHARED_BASTION.ExceptionRequirements" }[entry.scope] })),
        own, canManage: canWrite && own && !this.busy.has(item.id),
        canBuild: canWrite && own && rules?.allowed && !this.busy.has(item.id),
        buildReason: !owner?.available ? "SHARED_BASTION.Errors.MissingOwner"
          : !own ? "SHARED_BASTION.Errors.NotOwner" : !hasGM ? "SHARED_BASTION.Errors.NoGM"
          : !game.socket.connected ? "SHARED_BASTION.Errors.ConnectionRequired"
          : !canWrite ? "SHARED_BASTION.Errors.UnverifiedWriteRuntime" : !rules?.allowed ? `SHARED_BASTION.Errors.${rules?.code}` : "SHARED_BASTION.Build" };
    }))).filter(item => this.filter === "all" || (this.filter === "mine" ? item.own : item.ownerUuid === this.filter));
    const group = items => ["basic", "special"].map(type => ({ type,
      label: type === "basic" ? "SHARED_BASTION.BasicFacilities" : "SHARED_BASTION.SpecialFacilities",
      facilities: items.filter(item => item.type === type) }));
    const ownerSections = await Promise.all(roster.filter(entry => this.filter === "all" || (this.filter === "mine" ? owned.has(entry.uuid) : this.filter === entry.uuid))
      .map(async entry => ({ ...entry, summary: owned.has(entry.uuid) ? await this.api.ownerSummary(this.actor, entry.uuid) : null,
        groups: group(facilities.filter(item => item.ownerUuid === entry.uuid)) })));
    if (facilities.some(item => item.ownerUuid === "unknown")) ownerSections.push({ uuid: "unknown",
      name: game.i18n.localize("SHARED_BASTION.UnknownOwner"), groups: group(facilities.filter(item => item.ownerUuid === "unknown")) });
    return { ...context, name: this.actor.name, isGM: game.user.isGM, hasGM,
      hasConnection: game.socket.connected, canWrite,
      ownersView: this.view === "owners", overviewView: this.view === "overview",
      sections: this.view === "owners" ? ownerSections : [{ name: game.i18n.localize("SHARED_BASTION.Overview"), groups: group(facilities) }],
      filters: [{ value: "all", name: game.i18n.localize("SHARED_BASTION.FilterAll") },
        { value: "mine", name: game.i18n.localize("SHARED_BASTION.FilterMine") }, ...roster.map(entry => ({ value: entry.uuid, name: entry.name }))]
        .map(entry => ({ ...entry, selected: entry.value === this.filter })),
      roster, participantCount: roster.length, facilityCount: facilities.length,
      canAdd: canWrite && owned.size > 0 && !this.busy.has("add"),
      emptyParticipants: !roster.length
    };
  }
}
