import test from "node:test";
import assert from "node:assert/strict";
import { validateRequest } from "../scripts/services/commands.mjs";

const command = () => ({ v: 1, action: "build", nonce: "Abcdef0123456789", facility: "Actor.central.Item.facility", revision: 0, payload: { size: "cramped" } });

test("concrete commands reject document patches, claimed identity and client costs", () => {
  for (const mutate of [request => { request.userId = "gm"; }, request => { request.payload.gold = 0; },
    request => { request.payload["system.level"] = 1; }, request => { request.action = "update"; },
    request => { request.revision = -1; }, request => { request.facility = "Actor.private"; },
    request => { request.nonce = ""; }]) {
    const request = command();
    mutate(request);
    assert.throws(() => validateRequest(request), { code: "InvalidRequest" });
  }
  assert.equal(validateRequest(command()).action, "build");
});

test("progress commands require an explicit bounded integer and cannot carry extra patches", () => {
  for (const days of [0, -1, 1.5, 366, Infinity, NaN, "20"]) {
    const request = { ...command(), action: "advance", payload: { days } };
    assert.throws(() => validateRequest(request), { code: "InvalidRequest" });
  }
  const request = { ...command(), action: "advance", payload: { days: 20 } };
  assert.equal(validateRequest(request), request);
});
