import { MODULE_ID } from "../constants.mjs";
import { isBastion, electGM } from "../core/ownership.mjs";
import { BastionError } from "../core/errors.mjs";
import { configureBastion } from "./setup.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class BastionSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["shared-bastion", "bastion-sheet", "dnd5e2"],
    position: { width: 760, height: 660 },
    window: { resizable: true, icon: "fa-solid fa-chess-rook" },
    actions: { configureBastion: BastionSheet.configure }
  };

  static PARTS = { bastion: { template: "modules/shared-bastion/templates/bastion.hbs", scrollable: [".bastion-body"] } };

  get title() { return this.actor.name; }

  static async configure() {
    await configureBastion(game.modules.get(MODULE_ID).api.repository, this.actor);
  }

  async _prepareContext(options) {
    if (!isBastion(this.actor)) throw new BastionError("InvalidBastion");
    const context = await super._prepareContext(options);
    const state = this.actor.flags[MODULE_ID];
    const roster = state.roster ?? state.participants.map(uuid => ({ uuid, name: uuid, available: false }));
    return {
      ...context,
      name: this.actor.name,
      isGM: game.user.isGM,
      hasGM: Boolean(electGM(game.users)),
      roster,
      participantCount: roster.length,
      facilities: this.actor.items.filter(item => item.type === "facility").map(item => {
        const owner = roster.find(entry => entry.uuid === item.flags[MODULE_ID]?.owner);
        return { id: item.id, name: item.name, owner: owner?.name ?? game.i18n.localize("SHARED_BASTION.UnknownOwner"),
          missingOwner: !owner?.available };
      })
    };
  }
}
