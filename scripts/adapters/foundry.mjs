import { BastionError } from "../core/errors.mjs";
import { OWNER_PROOF_RUNTIME } from "../constants.mjs";

export function assertWriteRuntime() {
  if (game.version !== OWNER_PROOF_RUNTIME.foundry) throw new BastionError("UnverifiedWriteRuntime");
}

/**
 * Foundry 14.369 mutates each batch operation during its normal native preflight.
 * In that build a veto may silently remove one document while leaving the other
 * operations eligible for commit. Guard only our own operation arguments: losing
 * or adding any intended identity throws before the native batch is dispatched.
 * No core methods, hooks, or installed files are replaced; native checks run once.
 */
export function strictBatch(operations, mayCommit = () => true) {
  assertWriteRuntime();
  const guarded = operations.map(operation => {
    const field = { create: "data", update: "updates", delete: "ids" }[operation.action];
    const id = entry => typeof entry === "string" ? entry : entry?._id ?? entry?.id;
    const expected = operation[field]?.map(id).sort();
    if (!field || !expected?.length || expected.some(value => typeof value !== "string" || !value)
      || new Set(expected).size !== expected.length) throw new BastionError("CommitFailed");
    let entries = operation[field];
    const check = candidate => {
      if (!mayCommit() || !Array.isArray(candidate) || candidate.length !== expected.length
        || candidate.map(id).sort().some((value, index) => value !== expected[index])) throw new BastionError("CommitFailed");
    };
    const result = { ...operation };
    Object.defineProperty(result, field, { enumerable: true, configurable: false,
      get() { check(entries); return entries; },
      set(candidate) { check(candidate); entries = candidate; }
    });
    return result;
  });
  return foundry.documents.modifyBatch(guarded);
}
