import { BastionError } from "../core/errors.mjs";

export const OPERATION_ACTIONS = new Set(["order", "cancelOrder", "setOccupants"]);
export const ITEM_REFERENCE = /^(?:Item\.[A-Za-z0-9]+|Compendium\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.Item\.[A-Za-z0-9]+)$/;
export const ACTOR_REFERENCE = /^(?:Actor\.[A-Za-z0-9]+|Compendium\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.Actor\.[A-Za-z0-9]+)$/;
const exact = (object, keys) => object && typeof object === "object" && !Array.isArray(object) && Object.keys(object).sort().join() === keys;
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const actors = list => Array.isArray(list) && list.length <= 1000 && list.every(uuid => typeof uuid === "string" && ACTOR_REFERENCE.test(uuid));

export function validateOperationPayload(action, payload) {
  let valid = false;
  if (action === "cancelOrder") valid = exact(payload, "");
  if (action === "setOccupants") valid = exact(payload, "actors,role") && ["hirelings", "defenders"].includes(payload.role) && actors(payload.actors);
  if (action === "order" && exact(payload, "options,order")) {
    const { order, options } = payload;
    if (["enlarge", "maintain", "empower", "recruit", "research", "change"].includes(order)) valid = exact(options, "");
    if (order === "craft") valid = exact(options, "buyBaseItem,item") && ITEM_REFERENCE.test(options.item) && typeof options.buyBaseItem === "boolean";
    if (order === "harvest") valid = exact(options, "item,quantity") && ITEM_REFERENCE.test(options.item) && integer(options.quantity, 1, 1000);
    if (order === "trade" && options) {
      if (options.mode === "stocked") valid = exact(options, "mode,stocked") && typeof options.stocked === "boolean";
      if (options.mode === "stock") valid = exact(options, "mode,sell,value") && typeof options.sell === "boolean" && integer(options.value, 1, 1e9);
      if (options.mode === "creatures" && typeof options.sell === "boolean") {
        valid = options.sell ? exact(options, "indices,mode,sell") && Array.isArray(options.indices) && options.indices.length > 0
          && options.indices.length <= 1000 && new Set(options.indices).size === options.indices.length && options.indices.every(index => integer(index, 0, 999))
          : exact(options, "actors,mode,sell") && actors(options.actors) && options.actors.length > 0;
      }
    }
  }
  if (!valid) throw new BastionError("InvalidRequest");
}
