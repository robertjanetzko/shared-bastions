import { MODULE_ID, BASTION_UUID } from "../constants.mjs";
import { BastionError } from "../core/errors.mjs";
import { assertCanManage, electGM, resolveFacilityOwner } from "../core/ownership.mjs";
import { strictBatch, assertWriteRuntime } from "../adapters/foundry.mjs";

const LEDGER_ID = "SharedBastionLog";
const QUEUE_ID = "SharedBastionReq";
const itemUuid = /^Actor\.[A-Za-z0-9]+\.Item\.[A-Za-z0-9]+$/;
const actorUuid = /^Actor\.[A-Za-z0-9]+$/;
const noncePattern = /^[A-Za-z0-9]{16}$/;

export function validateRequest(request) {
  if (!request || Object.keys(request).sort().join() !== "action,facility,nonce,payload,revision,v"
    || request.v !== 1 || !noncePattern.test(request.nonce ?? "")
    || !Number.isSafeInteger(request.revision) || request.revision < 0
    || !request.payload || typeof request.payload !== "object" || Array.isArray(request.payload)) throw new BastionError("InvalidRequest");
  const fields = Object.keys(request.payload).sort().join();
  if (["createBastion", "configureBastion"].includes(request.action)) {
    if (!actorUuid.test(request.facility ?? "") || fields !== "name,participants"
      || typeof request.payload.name !== "string" || !request.payload.name.trim() || request.payload.name.length > 120
      || !Array.isArray(request.payload.participants) || request.payload.participants.length > 100
      || request.payload.participants.some(uuid => !actorUuid.test(uuid))
      || new Set(request.payload.participants).size !== request.payload.participants.length) throw new BastionError("InvalidRequest");
  } else {
    if (!itemUuid.test(request.facility ?? "")) throw new BastionError("InvalidRequest");
    if (request.action === "build") {
      if (fields !== "size" || !/^[a-z]+$/.test(request.payload.size ?? "")) throw new BastionError("InvalidRequest");
    } else if (request.action === "advance") {
      if (fields !== "days" || !Number.isSafeInteger(request.payload.days) || request.payload.days < 1 || request.payload.days > 365) throw new BastionError("InvalidRequest");
    } else throw new BastionError("InvalidRequest");
  }
  return request;
}

/** Equality for persisted commands must not depend on object property insertion order. */
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

/** Server-attributed native document events authenticate commands; module sockets grant no authority. */
export class CommandBus {
  constructor(adapter, repository) {
    this.adapter = adapter;
    this.repository = repository;
    this.queue = Promise.resolve();
    this.pending = new Map();
    this.authenticated = new Map();
  }

  get isExecutor() { return game.socket.connected && game.user.isGM && electGM(game.users)?.id === game.user.id; }

  runSystem(operation) {
    const result = this.queue.then(() => this.isExecutor ? operation() : undefined);
    this.queue = result.catch(error => console.error(`${MODULE_ID} | Operation failed`, error));
    return result;
  }

  install() {
    Hooks.on("createChatMessage", (message, options, userId) => {
      if (!game.user.isGM || message.author?.id !== userId) return;
      const request = message.flags?.[MODULE_ID]?.request;
      if (!request || this.authenticated.has(message.id)) return;
      // Every live GM remembers the server-authenticated original; only the elected GM writes.
      this.authenticated.set(message.id, { id: message.id, sender: userId,
        request: foundry.utils.deepClone(request), created: message._stats.createdTime ?? Date.now() });
      void this.resume().catch(error => console.error(`${MODULE_ID} | Queue failed`, error));
    });
    Hooks.on("userConnected", () => { void this.resume().catch(console.error); });
    Hooks.on("updateUser", (user, changes) => { if ("role" in changes) void this.resume().catch(console.error); });
    Hooks.on("updateChatMessage", (message, changes, options, userId) => {
      if (!game.users.get(userId)?.isGM) return;
      const response = changes.flags?.[MODULE_ID]?.response;
      if (!response || !noncePattern.test(response.nonce ?? "")) return;
      const pending = this.pending.get(response.nonce);
      if (pending && message.author?.id === game.user.id) pending(response);
    });
    Hooks.on("renderChatMessageHTML", (message, element) => {
      if (message.flags?.[MODULE_ID]?.request) { element.hidden = true; element.classList.add("shared-bastion-command-message"); }
    });
    for (const message of game.messages) if (message.flags?.[MODULE_ID]?.request) {
      for (const element of document.querySelectorAll(`[data-message-id="${message.id}"]`)) {
        element.hidden = true;
        element.classList.add("shared-bastion-command-message");
      }
    }
  }

  async request(action, uuid, payload) {
    assertWriteRuntime();
    if (!game.socket.connected) throw new BastionError("ConnectionRequired");
    if (!this.adapter.compatibility().supported) throw new BastionError("UnsupportedRuntime");
    if (!electGM(game.users)) throw new BastionError("NoGM");
    const document = await fromUuid(uuid);
    const nonce = foundry.utils.randomID();
    const request = validateRequest({ v: 1, nonce, action, facility: uuid,
      revision: document?.flags?.[MODULE_ID]?.revision ?? 0, payload });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(nonce); reject(new BastionError("RequestTimeout")); }, 30000);
      this.pending.set(nonce, response => {
        clearTimeout(timer);
        this.pending.delete(nonce);
        if (response.ok) resolve(response);
        else reject(new BastionError(response.code));
      });
      ChatMessage.create({ content: game.i18n.localize("SHARED_BASTION.CommandRequest"),
        whisper: [...new Set([game.user.id, ...[...game.users].filter(user => user.isGM).map(user => user.id)])],
        flags: { [MODULE_ID]: { request } }
      }).catch(error => { clearTimeout(timer); this.pending.delete(nonce); reject(error); });
    });
  }

  async privateJournal(id, flag, label) {
    let journal = game.journal.get(id);
    if (!journal) journal = await JournalEntry.create({ _id: id, name: game.i18n.localize(label),
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
        ...Object.fromEntries([...game.users].map(user => [user.id, CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE])) },
      flags: { [MODULE_ID]: { [flag]: true } }
    }, { keepId: true });
    if (!journal?.flags?.[MODULE_ID]?.[flag]) throw new BastionError("LedgerUnavailable");
    if (journal.ownership.default > CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE
      || [...game.users].some(user => !user.isGM && journal.getUserLevel(user) > CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE)) {
      throw new BastionError("LedgerUnavailable");
    }
    const permissions = {};
    for (const [userId, level] of Object.entries(journal.ownership)) {
      if (userId !== "default" && level !== CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE) permissions[`ownership.${userId}`] = CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;
    }
    if (Object.keys(permissions).length) await journal.update(permissions);
    return journal;
  }

  async resume() {
    if (!this.isExecutor) return;
    assertWriteRuntime();
    return this.runSystem(async () => {
      if (!this.authenticated.size && !game.journal.has(QUEUE_ID)) return;
      if (game.settings.get(MODULE_ID, "commandStoreVersion") && (!game.journal.has(QUEUE_ID) || !game.journal.has(LEDGER_ID))) {
        for (const command of this.authenticated.values()) await this.reply(command.id, { nonce: command.request.nonce, ok: false, code: "LedgerUnavailable" });
        this.authenticated.clear();
        return;
      }
      const queue = await this.privateJournal(QUEUE_ID, "commandQueue", "SHARED_BASTION.CommandQueue");
      const ledger = await this.privateJournal(LEDGER_ID, "receiptLedger", "SHARED_BASTION.ReceiptLedger");
      if (!game.settings.get(MODULE_ID, "commandStoreVersion")) await game.settings.set(MODULE_ID, "commandStoreVersion", 1);
      for (const command of [...this.authenticated.values()].sort((a, b) => a.created - b.created || a.id.localeCompare(b.id))) {
        if (!this.isExecutor) return;
        try { validateRequest(command.request); }
        catch {
          await this.reply(command.id, { nonce: command.request.nonce, ok: false, code: "InvalidRequest" });
          this.authenticated.delete(command.id);
          continue;
        }
        const existing = queue.pages.get(command.id)?.flags[MODULE_ID]?.command;
        if (!existing) await queue.createEmbeddedDocuments("JournalEntryPage", [{ _id: command.id,
          type: "text", name: command.id, text: { content: "" }, flags: { [MODULE_ID]: { command } }
        }], { keepId: true });
        const saved = queue.pages.get(command.id)?.flags[MODULE_ID]?.command;
        if (!saved || stable(saved.request) !== stable(command.request) || saved.sender !== command.sender) throw new BastionError("CommitFailed");
        this.authenticated.delete(command.id);
      }
      const commands = [...queue.pages].map(page => page.flags[MODULE_ID]?.command).filter(Boolean)
        .sort((a, b) => a.created - b.created || a.id.localeCompare(b.id));
      for (const command of commands) {
        if (!this.isExecutor) return;
        if (!ledger.pages.has(command.id)) await this.execute(command, ledger);
        else {
          const response = ledger.pages.get(command.id).flags[MODULE_ID].receipt.response;
          const message = game.messages.get(command.id);
          if (message && stable(message.flags[MODULE_ID]?.response) !== stable(response)) await this.reply(command.id, response);
        }
      }
    });
  }

  async plan(request, user) {
    if (!user?.active) throw new BastionError("InvalidUser");
    const document = await fromUuid(request.facility);
    if (request.action === "createBastion") {
      if (!user.isGM) throw new BastionError("GMOnly");
      if (request.facility !== BASTION_UUID) throw new BastionError("InvalidBastion");
      return this.repository.planCreate(request.payload);
    }
    const bastion = this.repository.find();
    if (!bastion || (document !== bastion && document?.parent !== bastion)) throw new BastionError("InvalidBastion");
    if ((document.flags[MODULE_ID]?.revision ?? 0) !== request.revision) throw new BastionError("Conflict");
    if (request.action === "configureBastion") {
      if (!user.isGM) throw new BastionError("GMOnly");
      return this.repository.planConfigure(bastion, request.payload);
    }
    const owner = await resolveFacilityOwner(document, uuid => fromUuid(uuid));
    assertCanManage(user, owner);
    if (request.action === "advance" && !user.isGM) throw new BastionError("GMOnly");
    const plan = request.action === "build" ? await this.adapter.planBuild(document, request.payload)
      : await this.adapter.planProgress(document, request.payload);
    const revision = request.revision + 1;
    return { operations: [...plan.operations,
      { action: "update", documentName: "Item", parent: bastion,
        updates: [{ _id: document.id, ...plan.updates, [`flags.${MODULE_ID}.revision`]: revision }] }
    ], revision, uuid: document.uuid };
  }

  async execute(command, ledger) {
    const { id, request, sender } = command;
    let response;
    let operations = [];
    try {
      validateRequest(request);
      const plan = await this.plan(request, game.users.get(sender));
      operations = plan.operations;
      response = { nonce: request.nonce, ok: true, revision: plan.revision, uuid: plan.uuid };
    } catch (error) {
      response = { nonce: request.nonce, ok: false, code: error instanceof BastionError ? error.code : "CommitFailed" };
      if (!(error instanceof BastionError)) console.error(`${MODULE_ID} | Planning failed`, error);
    }
    if (!this.isExecutor) return;
    const receipt = { sender, request, response };
    try {
      await strictBatch([
        ...operations,
        { action: "create", documentName: "JournalEntryPage", parent: ledger, keepId: true,
          data: [{ _id: id, type: "text", name: id, text: { content: "" }, flags: { [MODULE_ID]: { receipt } } }] }
      ], () => this.isExecutor);
    } catch (error) {
      if (error instanceof BastionError) console.debug(`${MODULE_ID} | Native transaction canceled`, error.code);
      else console.error(`${MODULE_ID} | Native transaction rejected`, error);
    }
    if (!this.isExecutor) return;
    // A canceled batch can resolve without rejection. Its durable receipt is the commit condition.
    const saved = ledger.pages.get(id)?.flags[MODULE_ID]?.receipt;
    if (!saved || saved.sender !== sender || stable(saved.request) !== stable(request)) {
      const failed = { sender, request, response: { nonce: request.nonce, ok: false, code: "CommitFailed" } };
      // A native veto is terminal, rather than an order to retry silently after a later reconnect.
      if (!ledger.pages.has(id)) await ledger.createEmbeddedDocuments("JournalEntryPage", [{ _id: id,
        type: "text", name: id, text: { content: "" }, flags: { [MODULE_ID]: { receipt: failed } }
      }], { keepId: true });
      await this.reply(id, ledger.pages.get(id)?.flags[MODULE_ID]?.receipt?.response ?? failed.response);
      return;
    }
    await this.reply(id, saved.response);
  }

  async reply(id, response) {
    const message = game.messages.get(id);
    if (message) await message.update({ [`flags.${MODULE_ID}.response`]: response });
  }
}
