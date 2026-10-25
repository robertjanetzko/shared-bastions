import test from "node:test";
import assert from "node:assert/strict";
import { advancementFromRows, parseSpecialAdvancement, registerSpecialAdvancement } from "../scripts/special-advancement.mjs";

test("special advancement accepts totals and rejects malformed thresholds/counts", () => {
  assert.equal(parseSpecialAdvancement("  "), null);
  assert.deepEqual(parseSpecialAdvancement('{"5":3,"9":4}'), { 5: 3, 9: 4 });
  for (const value of ['{}', '[]', 'null', '{"0":2}', '{"21":2}', '{"05":2}', '{"5":-1}', '{"5":2.5}', '{"5":"2"}', 'bad']) {
    assert.throws(() => parseSpecialAdvancement(value));
  }
});

test("saved advancement loads at ready, propagates changes and restores system defaults", () => {
  let ready, setting, errors = 0;
  globalThis.CONFIG = { DND5E: { facilities: { advancement: { special: { 5: 2, 9: 4 } } } } };
  globalThis.foundry = { utils: { deepClone: structuredClone } };
  globalThis.ui = { notifications: { error: () => errors++ } };
  globalThis.Hooks = { once: (name, callback) => { assert.equal(name, "ready"); ready = callback; } };
  globalThis.game = { settings: {
    register: (module, key, options) => { setting = options; },
    get: () => '{"5":3,"9":5}'
  } };
  try {
    registerSpecialAdvancement();
    assert.equal(setting.scope, "world");
    ready();
    assert.deepEqual(CONFIG.DND5E.facilities.advancement.special, { 5: 3, 9: 5 });
    setting.onChange('{"3":1}');
    assert.deepEqual(CONFIG.DND5E.facilities.advancement.special, { 3: 1 });
    setting.onChange("");
    assert.deepEqual(CONFIG.DND5E.facilities.advancement.special, { 5: 2, 9: 4 });
    setting.onChange("invalid");
    assert.equal(errors, 1);
    assert.deepEqual(CONFIG.DND5E.facilities.advancement.special, { 5: 2, 9: 4 });
  } finally {
    for (const key of ["CONFIG", "foundry", "ui", "Hooks", "game"]) delete globalThis[key];
  }
});

test("table rows preserve zero counts and reject duplicate or empty inputs", () => {
  assert.deepEqual(advancementFromRows([{ level: "5", count: "0" }, { level: "9", count: "4" }]), { 5: 0, 9: 4 });
  for (const rows of [[], [{ level: "5", count: "" }], [{ level: "", count: "2" }],
    [{ level: "5", count: "2" }, { level: "5", count: "3" }], [{ level: "21", count: "1" }]]) {
    assert.throws(() => advancementFromRows(rows));
  }
});
