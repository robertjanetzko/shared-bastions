const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Runtime diagnostics; the bastion itself is opened from the Actor directory. */
export class BastionStatus extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "shared-bastion-status",
    classes: ["shared-bastion", "dnd5e2"],
    window: { title: "SHARED_BASTION.Title", icon: "fa-solid fa-chess-rook", resizable: true },
    position: { width: 540, height: "auto" }
  };

  static PARTS = { status: { template: "modules/shared-bastion/templates/status.hbs" } };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return { ...context, ...game.modules.get("shared-bastion").api.diagnostics() };
  }
}
