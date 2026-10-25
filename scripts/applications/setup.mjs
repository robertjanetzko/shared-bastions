import { MODULE_ID } from "../constants.mjs";
import { isBastion } from "../core/ownership.mjs";
import { BastionError } from "../core/errors.mjs";
import { reportError } from "../services/bastion.mjs";

export async function configureBastion(repository, actor = null, defaults = {}) {
  try {
    repository.assertGM();
    const selected = actor?.flags[MODULE_ID].participants ?? [];
    const content = await foundry.applications.handlebars.renderTemplate("modules/shared-bastion/templates/setup.hbs", {
      name: actor?.name ?? defaults.name ?? game.i18n.localize("SHARED_BASTION.Title"),
      characters: game.actors.filter(candidate => candidate.type === "character" && !isBastion(candidate))
        .map(candidate => ({ uuid: candidate.uuid, name: candidate.name, selected: selected.includes(candidate.uuid) }))
    });
    const input = await foundry.applications.api.DialogV2.wait({
      window: { title: actor ? "SHARED_BASTION.Configure" : "SHARED_BASTION.Create" },
      content,
      rejectClose: false,
      buttons: [{ action: "save", label: "SHARED_BASTION.Save", default: true,
        callback: (event, button, dialog) => ({
          name: dialog.element.querySelector('[name="name"]').value,
          participants: [...dialog.element.querySelectorAll('[name="participants"]:checked')].map(input => input.value)
        }) }]
    });
    if (!input) return;
    if (typeof input !== "object") throw new BastionError("InvalidRequest");
    if (!actor && defaults.folder) input.folder = defaults.folder;
    const bastion = actor ? await repository.configure(actor, input) : await repository.create(input);
    await bastion.sheet.render({ force: true });
    return bastion;
  } catch (error) { reportError(error); }
}
