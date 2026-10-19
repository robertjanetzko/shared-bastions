import { MODULE_ID } from "../constants.mjs";
import { BastionError } from "../core/errors.mjs";
import { assertCanManage, resolveParticipantOwner } from "../core/ownership.mjs";
import { validateExceptions, validateRequirements } from "../core/rules.mjs";

const actorUuid = /^Actor\.[A-Za-z0-9]+$/;
const templateUuid = /^(?:Item\.[A-Za-z0-9]+|Compendium\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.Item\.[A-Za-z0-9]+)$/;
export const FACILITY_ACTIONS = new Set(["addFacility", "editFacility", "removeFacility", "reassignFacility", "setFacilityRules", "setTemplateRules"]);

export function validateFacilityPayload(action, payload) {
  const keys = Object.keys(payload).sort().join();
  if (action === "addFacility") {
    if (keys !== "exceptions,owner,template" || !actorUuid.test(payload.owner) || !templateUuid.test(payload.template)) throw new BastionError("InvalidRequest");
    validateExceptions(payload.exceptions);
  } else if (action === "editFacility") {
    if (keys !== "name,notes" || typeof payload.name !== "string" || !payload.name.trim() || payload.name.length > 120
      || typeof payload.notes !== "string" || payload.notes.length > 10000) throw new BastionError("InvalidRequest");
  } else if (action === "removeFacility") {
    if (keys) throw new BastionError("InvalidRequest");
  } else if (action === "reassignFacility") {
    if (keys !== "owner" || !actorUuid.test(payload.owner)) throw new BastionError("InvalidRequest");
  } else if (action === "setTemplateRules") {
    if (!templateUuid.test(payload.template)) throw new BastionError("InvalidRequest");
    const { template, ...rules } = payload;
    validateFacilityPayload("setFacilityRules", rules);
    if (payload.exceptions.length) throw new BastionError("InvalidRules");
  } else if (action === "setFacilityRules") {
    if (!["defenders,exceptions,hirelings,level,order,requirements", "defenders,exceptions,hirelings,level,order,repeatable,requirements"].includes(keys)
      || ("repeatable" in payload && typeof payload.repeatable !== "boolean") || !Number.isInteger(payload.level) || payload.level < 1 || payload.level > 20
      || ![payload.hirelings, payload.defenders].every(value => Number.isInteger(value) && value >= 0 && value <= 1000)
      || typeof payload.order !== "string" || !/^[a-z]*$/.test(payload.order)) throw new BastionError("InvalidRequest");
    validateRequirements(payload.requirements); validateExceptions(payload.exceptions);
  } else throw new BastionError("InvalidRequest");
}

export class FacilityService {
  constructor(adapter, repository) { this.adapter = adapter; this.repository = repository; }

  async participant(bastion, uuid) {
    return resolveParticipantOwner(bastion, uuid, value => fromUuid(value));
  }

  async source(uuid, user) {
    const source = await fromUuid(uuid);
    if (source?.type !== "facility" || source.parent) throw new BastionError("InvalidTemplate");
    const access = source.pack ? game.packs.get(source.pack) : source;
    if (!access?.testUserPermission(user, "OBSERVER")) throw new BastionError("InvalidTemplate");
    // Player-editable definitions cannot become rules executed with GM authority.
    if ([...game.users].some(candidate => !candidate.isGM && access.testUserPermission(candidate, "OWNER"))) {
      throw new BastionError("UntrustedTemplate");
    }
    return source;
  }

  async catalog() {
    const result = [];
    for (const item of game.items) if (item.type === "facility") {
      try { await this.source(item.uuid, game.user); result.push({ uuid: item.uuid, name: item.name, origin: game.i18n.localize("SHARED_BASTION.WorldItems") }); } catch {}
    }
    for (const pack of game.packs) {
      if (pack.documentName !== "Item" || !pack.testUserPermission(game.user, "OBSERVER")) continue;
      if ([...game.users].some(user => !user.isGM && pack.testUserPermission(user, "OWNER"))) continue;
      const index = await pack.getIndex();
      for (const item of index) if (item.type === "facility") result.push({ uuid: `Compendium.${pack.collection}.Item.${item._id}`, name: item.name, origin: pack.title });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
  }

  async plan(request, user, document) {
    const { action, payload } = request;
    const bastion = this.repository.find();
    const revision = request.revision + 1;
    if (action === "setTemplateRules") {
      if (!user.isGM) throw new BastionError("GMOnly");
      const source = await this.source(payload.template, user);
      this.adapter.ruleUpdates(source, payload);
      const definitions = foundry.utils.deepClone(game.settings.get(MODULE_ID, "templateRules"));
      const { template, exceptions, ...rules } = payload;
      definitions[template] = rules;
      const setting = game.settings.get(MODULE_ID, "templateRules", { document: true });
      const settingOperation = setting?._id
        ? { action: "update", documentName: "Setting", updates: [{ _id: setting.id, value: JSON.stringify(definitions) }] }
        : { action: "create", documentName: "Setting", keepId: true, data: [{ _id: "SBTmplRulesCfg01", key: `${MODULE_ID}.templateRules`, user: null, value: JSON.stringify(definitions) }] };
      return { operations: [settingOperation, { action: "update", documentName: "Actor", updates: [{ _id: bastion.id, [`flags.${MODULE_ID}.revision`]: revision }] }], revision, uuid: bastion.uuid };
    }
    if (action === "addFacility") {
      const owner = await this.participant(bastion, payload.owner);
      assertCanManage(user, owner);
      if (payload.exceptions.length && !user.isGM) throw new BastionError("GMOnly");
      const source = await this.source(payload.template, user);
      const id = foundry.utils.randomID();
      const data = this.adapter.newFacilityData(source, { id, owner: owner.uuid, exceptions: payload.exceptions,
        definition: game.settings.get(MODULE_ID, "templateRules")[source.uuid] });
      const item = new Item.implementation(data, { parent: bastion });
      const context = await this.adapter.assertRules(item, { adding: true });
      this.adapter.initialConstruction(data, context);
      return { operations: [
        { action: "create", documentName: "Item", parent: bastion, keepId: true, sharedBastionConstruction: true, data: [data] },
        { action: "update", documentName: "Actor", updates: [{ _id: bastion.id, [`flags.${MODULE_ID}.revision`]: revision }] }
      ], revision: 0, uuid: `${bastion.uuid}.Item.${id}` };
    }
    let updates;
    if (action === "editFacility") updates = { name: payload.name.trim(), [`flags.${MODULE_ID}.notes`]: payload.notes };
    if (action === "removeFacility") return { operations: [{ action: "delete", documentName: "Item", parent: bastion, ids: [document.id] }], revision, uuid: document.uuid };
    if (action === "reassignFacility") {
      if (!user.isGM) throw new BastionError("GMOnly");
      await this.participant(bastion, payload.owner);
      const candidate = document.clone({ [`flags.${MODULE_ID}.owner`]: payload.owner }, { keepId: true });
      await this.adapter.assertRules(candidate, { adding: payload.owner !== document.flags[MODULE_ID].owner });
      updates = { [`flags.${MODULE_ID}.owner`]: payload.owner };
    }
    if (action === "setFacilityRules") {
      if (!user.isGM) throw new BastionError("GMOnly");
      updates = this.adapter.ruleUpdates(document, payload);
    }
    return { operations: [{ action: "update", documentName: "Item", parent: bastion,
      updates: [{ _id: document.id, ...updates, [`flags.${MODULE_ID}.revision`]: revision }] }], revision, uuid: document.uuid };
  }
}
