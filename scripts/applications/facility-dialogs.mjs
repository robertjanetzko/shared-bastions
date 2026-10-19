import { MODULE_ID } from "../constants.mjs";

const { DialogV2 } = foundry.applications.api;
const render = (name, context) => foundry.applications.handlebars.renderTemplate(`modules/shared-bastion/templates/${name}.hbs`, context);
const exceptions = element => ["level", "limit", "requirements"].flatMap(scope => {
  const reason = element.querySelector(`[name="exception-${scope}"]`)?.value.trim();
  return reason ? [{ scope, reason }] : [];
});
const wait = async (title, content, callback) => DialogV2.wait({ window: { title }, position: { width: 580 }, content,
  rejectClose: false, buttons: [{ action: "save", label: "SHARED_BASTION.Save", default: true,
    callback: (event, button, dialog) => callback(dialog.element) }] });

export async function addFacility(actor, owners, api) {
  const catalog = await api.catalog();
  const input = await wait("SHARED_BASTION.AddFacility", await render("facility-add", { owners, catalog, isGM: game.user.isGM }), element => ({
    owner: element.querySelector('[name="owner"]').value,
    template: element.querySelector('[name="template"]').value,
    exceptions: exceptions(element)
  }));
  if (input && typeof input === "object") await api.request("addFacility", actor.uuid, input);
}

export async function editFacility(item, api) {
  const input = await wait("SHARED_BASTION.EditFacility", await render("facility-edit", {
    name: item.name, notes: item.flags[MODULE_ID]?.notes ?? ""
  }), element => ({ name: element.querySelector('[name="name"]').value, notes: element.querySelector('[name="notes"]').value }));
  if (input && typeof input === "object") await api.request("editFacility", item.uuid, input);
}

export async function removeFacility(item, api) {
  const confirmed = await DialogV2.confirm({ window: { title: "SHARED_BASTION.RemoveFacility" },
    content: await render("facility-remove", { name: item.name }), rejectClose: false });
  if (confirmed) await api.request("removeFacility", item.uuid, {});
}

export async function reassignFacility(item, roster, api) {
  const input = await wait("SHARED_BASTION.ReassignFacility", await render("facility-reassign", {
    name: item.name, owners: roster.filter(entry => entry.available).map(entry => ({ ...entry, selected: entry.uuid === item.flags[MODULE_ID]?.owner }))
  }), element => ({ owner: element.querySelector('[name="owner"]').value }));
  if (input && typeof input === "object") await api.request("reassignFacility", item.uuid, input);
}

export async function configureTemplates(actor, api) {
  const input = await wait("SHARED_BASTION.TemplateRules", await render("facility-template", { catalog: await api.catalog() }),
    element => ({ template: element.querySelector('[name="template"]').value }));
  if (input?.template) {
    const item = await fromUuid(input.template);
    await setFacilityRules(item, api, { actor });
  }
}

export async function setFacilityRules(item, api, { actor } = {}) {
  const state = item.flags[MODULE_ID] ?? {};
  const definition = actor ? api.templateRules(item.uuid) : null;
  const rules = { ...api.presentation.rules(item), ...definition };
  const exceptionReasons = Object.fromEntries((state.exceptions ?? []).map(entry => [entry.scope, entry.reason]));
  const input = await wait(actor ? "SHARED_BASTION.TemplateRules" : "SHARED_BASTION.FacilityRules", await render("facility-rules", {
    name: item.name, ...rules, template: Boolean(actor),
    orders: rules.orders.map(entry => ({ ...entry, selected: definition ? entry.value === definition.order : entry.selected })),
    requirements: (definition?.requirements ?? state.requirements ?? []).join("\n"), exceptionReasons
  }), element => ({
    level: Number(element.querySelector('[name="level"]').value), order: element.querySelector('[name="order"]').value,
    repeatable: element.querySelector('[name="repeatable"]').checked,
    hirelings: Number(element.querySelector('[name="hirelings"]').value), defenders: Number(element.querySelector('[name="defenders"]').value),
    requirements: element.querySelector('[name="requirements"]').value.split(/\r?\n/).map(value => value.trim()).filter(Boolean),
    exceptions: exceptions(element)
  }));
  if (input && typeof input === "object") {
    if (actor) await api.request("setTemplateRules", actor.uuid, { ...input, template: item.uuid });
    else await api.request("setFacilityRules", item.uuid, input);
  }
}
