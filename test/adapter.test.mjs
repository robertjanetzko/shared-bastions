import test from "node:test";
import assert from "node:assert/strict";
import { Dnd5eAdapter } from "../scripts/adapters/dnd5e.mjs";

// Unit fixtures test our ownership boundaries, not Foundry's implementation.
function setup() {
  const item = (type, owner) => ({ type: "facility", flags: { "shared-bastion": { owner } }, system: { type: { value: type } } });
  const owner = { uuid: "Actor.alice", type: "character", system: { details: { level: 13 }, currency: { gp: 900 } }, items: [item("special")] };
  const bastion = {
    uuid: "Actor.bastion", type: "character", system: { details: { level: 1 }, currency: { gp: 0 } },
    flags: { "shared-bastion": { bastion: true, version: 1, participants: [owner.uuid, "Actor.bob"] } },
    items: [item("special", owner.uuid), item("special", "Actor.bob"), item("basic", owner.uuid)]
  };
  const facility = { ...bastion.items[0], parent: bastion };
  const game = { version: "14.369", system: { id: "dnd5e", version: "6.0.6" } };
  const config = { DND5E: { facilities: {
    advancement: { basic: { 5: 2 }, special: { 5: 2, 9: 4, 13: 5, 17: 6 } },
    sizes: { test: { squares: 25 } }
  } } };
  return { adapter: new Dnd5eAdapter({ game, config, resolveUuid: async () => owner }), owner, bastion, facility, game, config };
}

test("individual level and counts include personal facilities awaiting transfer", async () => {
  const { adapter, facility, owner, bastion } = setup();
  const before = JSON.stringify({ owner, bastion });
  const context = await adapter.ownerContext(facility);
  assert.equal(context.owner, owner);
  assert.equal(context.level, 13);
  assert.deepEqual(context.special, { count: 2, limit: 5 });
  assert.deepEqual(context.basic, { count: 1, free: 2 });
  assert.equal(JSON.stringify({ owner, bastion }), before, "Context lookup must not mutate either actor");
});

test("allowances change with the owner level and ignore changes to central actor level", async () => {
  const { adapter, owner, bastion, facility } = setup();
  for (const [level, limit] of [[4, 0], [5, 2], [8, 2], [9, 4], [13, 5], [17, 6]]) {
    owner.system.details.level = level;
    bastion.system.details.level = 20;
    assert.equal((await adapter.ownerContext(facility)).special.limit, limit);
  }
});

test("runtime boundaries reject an unknown platform before reading private owner data", async () => {
  for (const [foundry, system, supported] of [["14.366", "6.0.6", false], ["14.369", "6.0.6", true],
    ["15.400", "6.0.6", false], ["14.369", "6.1.0", false], ["14.369", "6.0.6-beta", false], ["unknown", "6.0.6", false]]) {
    const { adapter, game, facility } = setup();
    game.version = foundry;
    game.system.version = system;
    assert.equal(adapter.compatibility().supported, supported);
    if (!supported) await assert.rejects(adapter.ownerContext(facility), { code: "UnsupportedRuntime" });
  }
});

test("room areas follow live system configuration and reject missing sizes", () => {
  const { adapter, facility, config } = setup();
  facility.system.size = "test";
  assert.equal(adapter.roomArea(facility), 25);
  config.DND5E.facilities.sizes.test.squares = 49;
  assert.equal(adapter.roomArea(facility), 49);
  facility.system.size = "missing";
  assert.throws(() => adapter.roomArea(facility), { code: "InvalidSize" });
});

test("public diagnostics do not expose private character data or imply integration acceptance", () => {
  const { adapter } = setup();
  const diagnostics = adapter.diagnostics();
  assert.deepEqual(Object.keys(diagnostics).sort(), ["supported", "foundry", "system", "reviewedSystem", "reviewedCommit", "ownerIntegrationAccepted"].sort());
  assert.equal(diagnostics.ownerIntegrationAccepted, false);
});
