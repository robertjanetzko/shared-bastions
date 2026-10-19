import test from "node:test";
import assert from "node:assert/strict";
import { isBastion, resolveFacilityOwner, assertCanManage, electGM } from "../scripts/core/ownership.mjs";

function documents() {
  const bastion = { type: "character", uuid: "Actor.bastion", flags: { "shared-bastion": {
    bastion: true, version: 1, participants: ["Actor.alice", "Actor.bob"]
  } } };
  const owner = { type: "character", uuid: "Actor.alice", flags: {} };
  const facility = { type: "facility", parent: bastion, flags: { "shared-bastion": { owner: owner.uuid } } };
  return { bastion, owner, facility };
}

test("the resolved character is the rule owner while the physical parent remains central", async () => {
  const { bastion, owner, facility } = documents();
  assert.equal(await resolveFacilityOwner(facility, async () => owner), owner);
  assert.equal(facility.parent, bastion);
  assert.equal(isBastion(owner), false);
});

test("orphaned, nonparticipant, compendium and central actor references never fall back to the parent", async () => {
  for (const scenario of ["missing", "nonparticipant", "mismatched", "compendium", "central", "token", "npc", "malformed"]) {
    const { bastion, owner, facility } = documents();
    let resolved = owner;
    if (scenario === "missing") resolved = null;
    if (scenario === "nonparticipant") bastion.flags["shared-bastion"].participants = [];
    if (scenario === "mismatched") resolved = { ...owner, uuid: "Actor.bob" };
    if (scenario === "compendium") resolved = { ...owner, pack: "private.characters" };
    if (scenario === "central") resolved = { ...owner, flags: { "shared-bastion": { bastion: true } } };
    if (scenario === "token") resolved = { ...owner, isToken: true };
    if (scenario === "npc") resolved = { ...owner, type: "npc" };
    if (scenario === "malformed") facility.flags["shared-bastion"].owner = "Compendium.private.actor.alice";
    await assert.rejects(resolveFacilityOwner(facility, async () => resolved), { code: "MissingOwner" }, scenario);
  }
});

test("unknown data versions and non-facility documents are rejected before resolution", async () => {
  const { bastion, facility } = documents();
  const resolve = async () => { assert.fail("Must not resolve invalid input"); };
  bastion.flags["shared-bastion"].version = 2;
  await assert.rejects(resolveFacilityOwner(facility, resolve), { code: "UnsupportedDataVersion" });
  facility.type = "feat";
  await assert.rejects(resolveFacilityOwner(facility, resolve), { code: "InvalidFacility" });
});

test("a participant still needs native ownership; observer and inactive accounts are rejected", () => {
  const owner = { testUserPermission: (user, permission) => user.id === "alice" && permission === "OWNER" };
  assert.doesNotThrow(() => assertCanManage({ id: "alice", active: true }, owner));
  assert.throws(() => assertCanManage({ id: "bob", active: true }, owner), { code: "NotOwner" });
  assert.throws(() => assertCanManage({ id: "alice", active: false }, owner), { code: "InvalidUser" });
  assert.doesNotThrow(() => assertCanManage({ id: "gm", isGM: true, active: true }, owner));
  assert.throws(() => assertCanManage({ id: "gm", isGM: true, active: false }, owner), { code: "InvalidUser" });
});

test("GM election is independent of client collection order and ignores disconnected GMs", () => {
  const users = [
    { id: "z", active: true, isGM: true },
    { id: "a", active: false, isGM: true },
    { id: "b", active: true, isGM: true },
    { id: "0", active: true, isGM: false }
  ];
  assert.equal(electGM(users).id, "b");
  assert.equal(electGM([...users].reverse()).id, "b");
  assert.equal(electGM(users.filter(user => !user.active)), null);
});
