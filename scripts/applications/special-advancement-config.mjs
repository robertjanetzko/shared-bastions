import { MODULE_ID } from "../constants.mjs";
import { advancementFromRows, parseSpecialAdvancement, specialAdvancementDefaults } from "../special-advancement.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SpecialAdvancementConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "shared-bastion-special-advancement", tag: "form", classes: ["shared-bastion"],
    window: { title: "SHARED_BASTION.SpecialAdvancement" }, position: { width: 540, height: "auto" },
    form: { handler: SpecialAdvancementConfig.save, closeOnSubmit: false },
    actions: {
      add: SpecialAdvancementConfig.add, remove: SpecialAdvancementConfig.remove,
      defaults: SpecialAdvancementConfig.defaults, cancel: function () { return this.close(); }
    }
  };
  static PARTS = { table: { template: "modules/shared-bastion/templates/special-advancement.hbs" } };

  #rows;
  #error = false;

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    if (!this.#rows) {
      const saved = game.settings.get(MODULE_ID, "specialAdvancement");
      let table;
      try { table = parseSpecialAdvancement(saved); } catch { this.#error = true; }
      this.#rows = Object.entries(table ?? specialAdvancementDefaults())
        .sort(([a], [b]) => Number(a) - Number(b)).map(([level, count]) => ({ level, count }));
    }
    return { ...context, rows: this.#rows, error: this.#error };
  }

  readRows() {
    return [...this.element.querySelectorAll("tbody tr")].map(row => ({
      level: row.querySelector('[name="level"]').value,
      count: row.querySelector('[name="count"]').value
    }));
  }

  static add() {
    this.#rows = [...this.readRows(), { level: "", count: 0 }];
    this.render();
  }

  static remove(event, target) {
    this.#rows = this.readRows();
    this.#rows.splice(Number(target.dataset.index), 1);
    this.render();
  }

  static defaults() {
    this.#rows = Object.entries(specialAdvancementDefaults()).map(([level, count]) => ({ level, count }));
    this.#error = false;
    this.render();
  }

  static async save() {
    if (!game.user.isGM) return;
    const rows = this.readRows();
    let table;
    try { table = advancementFromRows(rows); }
    catch {
      this.#rows = rows;
      this.#error = true;
      return this.render();
    }
    const standard = specialAdvancementDefaults();
    const unchanged = Object.keys(table).length === Object.keys(standard).length
      && Object.entries(table).every(([level, count]) => standard[level] === count);
    await game.settings.set(MODULE_ID, "specialAdvancement", unchanged ? "" : JSON.stringify(table));
    await this.close();
  }
}
