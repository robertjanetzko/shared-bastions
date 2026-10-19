import test from "node:test";
import assert from "node:assert/strict";
import { assertWriteRuntime } from "../scripts/adapters/foundry.mjs";

test("writes stay disabled on builds without a native transactional preflight proof", () => {
  const previous=globalThis.game;
  try {
    globalThis.game={version:"14.369"};
    assert.doesNotThrow(assertWriteRuntime);
    for(const version of ["14.367","14.370","15.400","unknown"]) {
      globalThis.game.version=version;
      assert.throws(assertWriteRuntime,{code:"UnverifiedWriteRuntime"});
    }
  } finally {
    if(previous===undefined) delete globalThis.game;
    else globalThis.game=previous;
  }
});
