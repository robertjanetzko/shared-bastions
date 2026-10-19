import { configureBastion } from "./applications/setup.mjs";
import { MODULE_ID } from "./constants.mjs";

export function installDirectory(repository) {
  Hooks.on("renderActorDirectory", (application, element) => {
    if (!game.user.isGM) return;
    const header = element.querySelector(".header-actions");
    if (!header || header.querySelector(".shared-bastion-create")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "shared-bastion-create";
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-chess-rook";
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = game.i18n.localize(repository.find() ? "SHARED_BASTION.OpenBastion" : "SHARED_BASTION.Create");
    button.append(icon, label);
    button.disabled = !repository.find() && !game.modules.get(MODULE_ID).api.diagnostics().writeRuntimeSupported;
    button.addEventListener("click", () => {
      const actor = repository.find();
      if (actor) void actor.sheet.render({ force: true });
      else void configureBastion(repository);
    });
    header.append(button);
  });
  const refresh = () => {
    for (const actor of game.actors) if (actor.flags[MODULE_ID]?.bastion && actor.sheet?.rendered) void actor.sheet.render();
  };
  Hooks.on("userConnected", refresh);
  Hooks.on("updateUser", refresh);
  Hooks.on("updateActor", refresh);
  Hooks.on("updateSetting", setting => {
    if (["dnd5e.calendarConfig", "dnd5e.bastionConfiguration"].includes(setting.key)) refresh();
  });
  for (const event of ["createItem", "updateItem", "deleteItem"]) Hooks.on(event, item => {
    if (item.parent?.flags[MODULE_ID]?.bastion) refresh();
  });
  game.socket.on("disconnect", refresh);
  game.socket.on("connect", refresh);
}
