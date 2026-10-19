import { MODULE_ID } from "./constants.mjs";
import { Dnd5eAdapter } from "./adapters/dnd5e.mjs";
import { BastionStatus } from "./applications/status.mjs";
import { CommandBus } from "./services/commands.mjs";

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
  const bus = new CommandBus(adapter);
  if (adapter.compatibility().supported) bus.install();
  game.modules.get(MODULE_ID).api = Object.freeze({
    diagnostics: () => adapter.diagnostics(),
    request: (action, facility, payload) => bus.request(action, facility, payload)
  });
  if (!adapter.compatibility().supported) {
    ui.notifications.error("SHARED_BASTION.Errors.UnsupportedRuntime", { localize: true });
  }
});
