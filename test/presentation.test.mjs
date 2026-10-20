import test from "node:test";
import assert from "node:assert/strict";
import { sortOwnerSections, facilitySlots } from "../scripts/core/presentation.mjs";

const users = new Map([["a", { id: "a", name: "Alice" }], ["b", { id: "b", name: "Bob" }], ["g", { id: "g", name: "A GM", isGM: true }]]);
const roster = [
  { uuid: "Actor.z", name: "Zed", available: true, users: ["b", "a", "g"] },
  { uuid: "Actor.b", name: "Bran", available: true, users: ["b"] },
  { uuid: "Actor.a", name: "Arin", available: true, users: ["b"] },
  { uuid: "Actor.n", name: "A solo character", available: true, users: [] },
  { uuid: "Actor.x", name: "A missing character", available: false, users: ["a"] }
];
test("all owned characters come first, others sort by first non-GM owner and character name", () => {
  const before = structuredClone(roster);
  const sections = sortOwnerSections(roster, users, { isGM: false, owned: new Set(["Actor.b", "Actor.a"]) });
  assert.deepEqual(sections.map(entry => entry.uuid), ["Actor.a", "Actor.b", "Actor.z", "Actor.n", "Actor.x"]);
  assert.equal(sections[2].playerName, "Alice");
  assert.deepEqual(roster, before);
});
test("GM does not promote owned characters and handles removed users and legacy rosters", () => {
  const sections = sortOwnerSections([...roster, { uuid: "Actor.legacy", name: "Legacy", available: true }], users,
    { isGM: true, owned: new Set(roster.map(entry => entry.uuid)) });
  assert.deepEqual(sections.map(entry => entry.uuid), ["Actor.z", "Actor.a", "Actor.b", "Actor.n", "Actor.legacy", "Actor.x"]);
  assert.equal(sortOwnerSections([{ ...roster[0], users: ["deleted", "g"] }], users, { owned: new Set() })[0].playerName, "");
});
test("slots consume all owner facilities, allow additional paid basics and never expose foreign limits", () => {
  const summary = { basic: { count: 0, free: 2 }, special: { count: 1, limit: 2 } };
  assert.equal(facilitySlots(summary, "basic").length, 2);
  assert.equal(facilitySlots(summary, "special").length, 1);
  summary.basic.count = 2; summary.special.count = 3;
  assert.deepEqual(facilitySlots(summary, "basic"), [{ label: "SHARED_BASTION.BuildFacility" }]);
  assert.deepEqual(facilitySlots(summary, "special"), []);
  assert.deepEqual(facilitySlots(null, "special"), []);
});
