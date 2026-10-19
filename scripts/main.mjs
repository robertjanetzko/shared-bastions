import { MODULE_ID } from "./constants.mjs";
import { Dnd5eAdapter } from "./adapters/dnd5e.mjs";
import { BastionStatus } from "./applications/status.mjs";
import { CommandBus } from "./services/commands.mjs";
import { BastionRepository } from "./services/bastion.mjs";
import { BastionSheet } from "./applications/bastion-sheet.mjs";
import { installDirectory } from "./directory.mjs";

Hooks.once("init", () => {
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
  const bus = new CommandBus(adapter);
  const repository = new BastionRepository();
  if (adapter.compatibility().supported) bus.install();
  repository.install();
  installDirectory(repository);
  game.modules.get(MODULE_ID).api = Object.freeze({
    diagnostics: () => adapter.diagnostics(),
    repository,
    request: (action, facility, payload) => bus.request(action, facility, payload)
  });
  if (!adapter.compatibility().supported) {
    ui.notifications.error("SHARED_BASTION.Errors.UnsupportedRuntime", { localize: true });
  }
});
