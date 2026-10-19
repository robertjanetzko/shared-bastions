import { MODULE_ID } from "./constants.mjs";
import { Dnd5eAdapter } from "./adapters/dnd5e.mjs";
import { BastionStatus } from "./applications/status.mjs";
import { CommandBus } from "./services/commands.mjs";
import { BastionRepository } from "./services/bastion.mjs";
import { BastionSheet } from "./applications/bastion-sheet.mjs";
import { installDirectory } from "./directory.mjs";
import { FacilityService } from "./services/facilities.mjs";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "bastionUuid", { scope: "world", config: false, type: String, default: "" });
  game.settings.register(MODULE_ID, "commandStoreVersion", { scope: "world", config: false, type: Number, default: 0 });
  game.settings.register(MODULE_ID, "templateRules", { scope: "world", config: false, type: Object, default: {} });
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, MODULE_ID, BastionSheet, {
    types: ["character"], makeDefault: false, canBeDefault: false, canConfigure: false, label: "SHARED_BASTION.Title"
  });
  game.settings.registerMenu(MODULE_ID, "status", {
    name: "SHARED_BASTION.Title",
    label: "SHARED_BASTION.OpenStatus",
    hint: "SHARED_BASTION.StatusHint",
    icon: "fa-solid fa-chess-rook",
    type: BastionStatus,
    restricted: true
  });
});

Hooks.once("ready", () => {
  const adapter = new Dnd5eAdapter({ game, config: CONFIG, resolveUuid: uuid => fromUuid(uuid) });
  const repository = new BastionRepository();
  const bus = new CommandBus(adapter, repository);
  repository.bus = bus;
  const facilities = new FacilityService(adapter, repository);
  bus.facilities = facilities;
  const canWrite = adapter.diagnostics().writeRuntimeSupported;
  if (canWrite) { adapter.install(); bus.install(); repository.install(); }
  installDirectory(repository);
  game.modules.get(MODULE_ID).api = Object.freeze({
    diagnostics: () => adapter.diagnostics(),
    repository,
    presentation: Object.freeze({ facility: item => adapter.facilityView(item), buildOptions: () => adapter.buildOptions(), rules: item => adapter.rulesView(item),
      orders: item => adapter.operations.orders(item), staff: item => adapter.operations.staff(item) }),
    catalog: () => facilities.catalog(),
    templateRules: uuid => foundry.utils.deepClone(game.settings.get(MODULE_ID, "templateRules")[uuid] ?? null),
    checkRules: item => adapter.ruleStatus(item, game.user),
    ownerSummary: (bastion, uuid) => adapter.ownerSummary(bastion, uuid, game.user),
    configureOrder: (item, order) => adapter.operations.configure(item, order, game.user),
    occupantForm: (item, role) => adapter.operations.occupantForm(item, role, game.user),
    request: (action, facility, payload) => bus.request(action, facility, payload)
  });
  if (canWrite) void repository.migrate().then(() => bus.resume()).catch(console.error);
  if (!adapter.compatibility().supported) {
    ui.notifications.error("SHARED_BASTION.Errors.UnsupportedRuntime", { localize: true });
  }
});
