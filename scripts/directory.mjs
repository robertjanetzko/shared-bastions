import { installActorCreation } from "./adapters/actor-creation.mjs";
import { MODULE_ID } from "./constants.mjs";

export function installDirectory(repository) {
  installActorCreation(repository);
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
    if (item.parent?.flags[MODULE_ID]?.bastion || repository.find()?.flags[MODULE_ID]?.participants.includes(item.parent?.uuid)) refresh();
  });
  game.socket.on("disconnect", refresh);
  game.socket.on("connect", refresh);
}
