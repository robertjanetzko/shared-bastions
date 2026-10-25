import { MODULE_ID } from "../constants.mjs";
import { configureBastion } from "../applications/setup.mjs";
import { BastionError } from "../core/errors.mjs";
import { reportError } from "../services/bastion.mjs";

const CHOICE = "shared-bastion";

/** D&D5e 6.0.6 CreateDocumentDialog UI bridge; never register a synthetic Actor type. */
export function installActorCreation(repository) {
  const listeners = new WeakMap();
  Hooks.on("renderCreateDocumentDialog", (application, element) => {
    const options = application.options;
    if (!game.user.isGM || application.documentName !== "Actor"
      || options.createOptions.pack || options.createOptions.parent
      || (options.types && !options.types.includes("character"))) return;
    const list = element.querySelector('ol:has(input[name="type"][value="character"])');
    if (!list || list.querySelector(`[value="${CHOICE}"]`)) return;
    listeners.get(application)?.abort();
    const controller = new AbortController();
    listeners.set(application, controller);

    const entry = document.createElement("li");
    const label = document.createElement("label");
    const icon = document.createElement("dnd5e-icon");
    icon.setAttribute("src", "icons/svg/castle.svg");
    icon.setAttribute("aria-hidden", "true");
    const title = document.createElement("span");
    title.textContent = game.i18n.localize("SHARED_BASTION.ActorChoice");
    const radio = document.createElement("input");
    Object.assign(radio, { type: "radio", name: "type", value: CHOICE, required: true });
    const unavailable = () => repository.find() ? "BastionExists"
      : !game.modules.get(MODULE_ID).api.diagnostics().writeRuntimeSupported ? "UnsupportedRuntime" : null;
    const reason = unavailable();
    radio.disabled = !!reason;
    if (reason) entry.dataset.tooltip = game.i18n.localize(`SHARED_BASTION.Errors.${reason}`);
    label.append(icon, title, radio);
    entry.append(label);
    const next = [...list.children].find(child => child.querySelector("span")?.textContent
      .localeCompare(title.textContent, game.i18n.lang) > 0);
    list.insertBefore(entry, next ?? null);

    // Keep the UI-only choice out of native defaultName and defaultDocumentSubtypes.
    radio.addEventListener("change", event => {
      event.stopPropagation();
      element.querySelector('[name="name"]').placeholder = title.textContent;
    });
    element.addEventListener("submit", event => {
      if (!radio.checked) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const reason = unavailable();
      if (reason) { reportError(new BastionError(reason)); return; }
      const name = element.querySelector('[name="name"]').value.trim() || title.textContent;
      const folderInput = element.querySelector('[name="folder"]');
      const folder = folderInput ? folderInput.value || null : options.createData.folder || null;
      void application.close().then(() => configureBastion(repository, null, { name, folder })).catch(reportError);
    }, { capture: true, signal: controller.signal });
  });
}
