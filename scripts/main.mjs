import { MODULE_ID } from "./constants.mjs";
import { Dnd5eAdapter } from "./adapters/dnd5e.mjs";
import { BastionStatus } from "./applications/status.mjs";

Hooks.once("init", () => {
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
  game.modules.get(MODULE_ID).api = Object.freeze({ diagnostics: () => adapter.diagnostics() });
  if (!adapter.compatibility().supported) {
    ui.notifications.error("SHARED_BASTION.Errors.UnsupportedRuntime", { localize: true });
  }
});
