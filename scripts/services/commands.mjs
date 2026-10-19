import { MODULE_ID } from "../constants.mjs";
import { BastionError } from "../core/errors.mjs";
import { assertCanManage, electGM, resolveFacilityOwner } from "../core/ownership.mjs";

const LEDGER_ID = "SharedBastionLog";
const itemUuid = /^Actor\.[A-Za-z0-9]+\.Item\.[A-Za-z0-9]+$/;
const noncePattern = /^[A-Za-z0-9]{16}$/;

export function validateRequest(request) {
  if (!request || Object.keys(request).sort().join() !== "action,facility,nonce,payload,revision,v"
    || request.v !== 1 || !noncePattern.test(request.nonce ?? "") || !itemUuid.test(request.facility ?? "")
    || !Number.isSafeInteger(request.revision) || request.revision < 0
    || !request.payload || typeof request.payload !== "object" || Array.isArray(request.payload)) {
    throw new BastionError("InvalidRequest");
  }
  if (request.action === "build") {
    if (Object.keys(request.payload).join() !== "size" || !/^[a-z]+$/.test(request.payload.size ?? "")) throw new BastionError("InvalidRequest");
  } else if (request.action === "advance") {
    if (Object.keys(request.payload).join() !== "days" || !Number.isSafeInteger(request.payload.days)
      || request.payload.days < 1 || request.payload.days > 365) throw new BastionError("InvalidRequest");
  } else throw new BastionError("InvalidRequest");
  return request;
}

/**
 * The native document-create hook supplies the server-originating user ID.
 * No module socket or asserted sender ID grants authority. T02 supports build
 * and a GM-only progress probe; full management follows the runtime proof.
 */
export class CommandBus {
  constructor(adapter) {
    this.adapter = adapter;
    this.queue = Promise.resolve();
    this.pending = new Map();
  }

  install() {
    Hooks.on("createChatMessage", (message, options, userId) => {
      if (!game.user.isGM || electGM(game.users)?.id !== game.user.id) return;
      const request = message.flags?.[MODULE_ID]?.request;
      if (!request || message.author?.id !== userId) return;
      // Capture the authenticated initial command; subsequent author edits cannot replace it.
      const snapshot = foundry.utils.deepClone(request);
      this.queue = this.queue.then(() => this.execute(message, snapshot, userId))
        .catch(error => console.error(`${MODULE_ID} | Command processing failed`, error));
    });
    Hooks.on("updateChatMessage", (message, changes, options, userId) => {
      if (!game.users.get(userId)?.isGM) return;
      const response = changes.flags?.[MODULE_ID]?.response;
      if (!response || !noncePattern.test(response.nonce ?? "")) return;
      const pending = this.pending.get(response.nonce);
      if (!pending || message.author?.id !== game.user.id) return;
      pending(response);
    });
    Hooks.on("renderChatMessageHTML", (message, element) => {
      if (message.flags?.[MODULE_ID]?.request) element.hidden = true;
    });
  }

  async request(action, facilityUuid, payload) {
    if (!this.adapter.compatibility().supported) throw new BastionError("UnsupportedRuntime");
    const gm = electGM(game.users);
    if (!gm) throw new BastionError("NoGM");
    const facility = await fromUuid(facilityUuid);
    const nonce = foundry.utils.randomID();
    const request = validateRequest({ v: 1, nonce, action, facility: facilityUuid,
      revision: facility?.flags?.[MODULE_ID]?.revision ?? 0, payload });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(nonce);
        reject(new BastionError("RequestTimeout"));
      }, 30000);
      this.pending.set(nonce, response => {
        clearTimeout(timer);
        this.pending.delete(nonce);
        if (response.ok) resolve(response);
        else reject(new BastionError(response.code));
      });
      ChatMessage.create({
        content: game.i18n.localize("SHARED_BASTION.CommandRequest"),
        whisper: [...new Set([game.user.id, ...[...game.users].filter(user => user.isGM).map(user => user.id)])],
        flags: { [MODULE_ID]: { request } }
      }).catch(error => {
        clearTimeout(timer);
        this.pending.delete(nonce);
        reject(error);
      });
    });
  }

  async ledger() {
    let journal = game.journal.get(LEDGER_ID);
    if (!journal) journal = await JournalEntry.create({
      _id: LEDGER_ID,
      name: game.i18n.localize("SHARED_BASTION.ReceiptLedger"),
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
      flags: { [MODULE_ID]: { receiptLedger: true } }
    }, { keepId: true });
    if (!journal?.flags?.[MODULE_ID]?.receiptLedger) throw new BastionError("LedgerUnavailable");
    return journal;
  }

  async execute(message, request, userId) {
    if (electGM(game.users)?.id !== game.user.id) return;
    let response = { nonce: request.nonce, ok: false, code: "InvalidRequest" };
    try {
      validateRequest(request);
      const user = game.users.get(userId);
      const ledger = await this.ledger();
      const previous = ledger.pages.get(message.id)?.flags?.[MODULE_ID]?.receipt;
      if (previous) {
        if (previous.sender !== userId || JSON.stringify(previous.request) !== JSON.stringify(request)) throw new BastionError("InvalidRequest");
        response = previous.response;
      } else {
        const facility = await fromUuid(request.facility);
        const owner = await resolveFacilityOwner(facility, uuid => fromUuid(uuid));
        assertCanManage(user, owner);
        if ((facility.flags?.[MODULE_ID]?.revision ?? 0) !== request.revision) throw new BastionError("Conflict");
        if (request.action === "advance" && !user.isGM) throw new BastionError("GMOnly");
        const plan = request.action === "build" ? await this.adapter.planBuild(facility, request.payload)
          : await this.adapter.planProgress(facility, request.payload);
        if (electGM(game.users)?.id !== game.user.id) return;
        response = { nonce: request.nonce, ok: true, revision: request.revision + 1 };
        const receipt = { sender: userId, request, response };
        await foundry.documents.modifyBatch([
          { action: "create", documentName: "JournalEntryPage", parent: ledger, keepId: true,
            data: [{ _id: message.id, type: "text", name: message.id, text: { content: "" },
              flags: { [MODULE_ID]: { receipt } } }] },
          ...plan.operations,
          { action: "update", documentName: "Item", parent: facility.parent,
            updates: [{ _id: facility.id, ...plan.updates, [`flags.${MODULE_ID}.revision`]: response.revision }] }
        ]);
        // Foundry may resolve a canceled batch instead of rejecting it. Verify the durable result.
        const committed = ledger.pages.get(message.id)?.flags?.[MODULE_ID]?.receipt;
        if (!committed || committed.sender !== userId || JSON.stringify(committed.request) !== JSON.stringify(request)) {
          throw new BastionError("CommitFailed");
        }
        response = committed.response;
      }
    } catch (error) {
      response = { nonce: request.nonce, ok: false, code: error instanceof BastionError ? error.code : "CommitFailed" };
      if (!(error instanceof BastionError)) console.error(`${MODULE_ID} | Native operation failed`, error);
    }
    await message.update({ [`flags.${MODULE_ID}.response`]: response });
  }
}
