import { test, expect } from "@playwright/test";

async function join(context, name, observe = () => {}) {
  const page = await context.newPage();
  observe(page);
  page.on("pageerror", error => console.log(`Client ${name} error: ${error.message}`));
  await page.goto("/join");
  await page.locator('[name="userId"]').waitFor();
  await page.locator('[name="userId"]').selectOption({ label: name });
  await page.locator('button[name="join"]').click();
  await page.waitForURL("**/game", { timeout: 30000 });
  // Stage 1 tests use Foundry's supported no-canvas mode; scene acceptance is separate.
  await page.waitForFunction(() => globalThis.game?.settings?.settings?.has("core.noCanvas"), {}, { timeout: 60000 });
  await page.evaluate(() => game.settings.set("core", "noCanvas", true));
  await page.reload();
  await page.waitForFunction(() => globalThis.game?.ready === true, {}, { timeout: 60000 });
  console.log(`Client ready: ${name}`);
  const world = await page.evaluate(() => game.world.id);
  if (world !== "shared-bastion-integration") throw new Error("Integration tests only run in the dedicated shared-bastion-integration world");
  return page;
}

test("T01: native startup and the status application render without module errors", async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const errors = [];
    const failures = [];
    const page = await join(context, "Gamemaster", page => {
      page.on("pageerror", error => errors.push(error.message));
      page.on("response", response => { if (response.url().includes("/modules/shared-bastion/") && response.status() >= 400) failures.push(response.url()); });
    });
    await expect.poll(() => page.evaluate(() => game.modules.get("shared-bastion")?.api?.diagnostics().supported)).toBe(true);
    await page.evaluate(() => new (game.settings.menus.get("shared-bastion.status").type)().render({ force: true }));
    await expect(page.locator("#shared-bastion-status")).toContainText("14.369");
    await expect(page.locator("#shared-bastion-status")).toContainText("6.0.6");
    await page.locator("#shared-bastion-status").screenshot({ path: "test-results/t01-status.png" });
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
  } finally { await context.close(); }
});

test("T02: a private owner's player builds a central facility and progress completes once", async ({ browser }) => {
  const gmContext = await browser.newContext();
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const gm = await join(gmContext, "Gamemaster");
  let fixtures;
  try {
    fixtures = await gm.evaluate(async () => {
      const prefix = "SB T02 ";
      // Only remove records explicitly created by this test in the dedicated test world.
      for (const actor of game.actors.filter(actor => actor.flags["shared-bastion"]?.integrationFixture)) await actor.delete();
      for (const user of game.users.filter(user => user.name.startsWith(prefix))) await user.delete();
      const alice = await User.create({ name: prefix + "Alice", role: CONST.USER_ROLES.PLAYER });
      const bob = await User.create({ name: prefix + "Bob", role: CONST.USER_ROLES.PLAYER });
      const flag = { "shared-bastion": { integrationFixture: true } };
      const owner = await Actor.create({ name: prefix + "Owner", type: "character", ownership: { default: 0, [alice.id]: 3 },
        flags: flag, system: { currency: { gp: 1000 } },
        items: [{ name: "Test Class", type: "class", system: { levels: 13, identifier: "fighter" } }] });
      const other = await Actor.create({ name: prefix + "Other", type: "character", ownership: { default: 0, [bob.id]: 3 },
        flags: flag, system: { currency: { gp: 9000 } },
        items: [{ name: "Test Class", type: "class", system: { levels: 5, identifier: "fighter" } }] });
      await alice.update({character:owner.id});
      await bob.update({character:other.id});
      const central = await Actor.create({ name: prefix + "Bastion", type: "character", ownership: { default: 0, [alice.id]: 2, [bob.id]: 2 },
        flags: { "shared-bastion": { integrationFixture: true, bastion: true, version: 1, participants: [owner.uuid, other.uuid] } },
        system: { currency: { gp: 7000 } } });
      const facilities = await central.createEmbeddedDocuments("Item", [true, true, false].map((built, i) => ({
        name: prefix + `Facility ${i}`, type: "facility", flags: { "shared-bastion": { owner: owner.uuid, revision: 0 } },
        system: { type: { value: "basic", subtype: "bedroom" }, size: "cramped", building: { built, size: "cramped" } }
      })));
      return { owner: owner.id, other: other.id, central: central.id, facility: facilities[2].uuid, actorIds: [owner.id, other.id, central.id],
        userIds: [alice.id, bob.id], aliceName: alice.name, bobName: bob.name, aliceId: alice.id,
        initial: { ownerLevel: owner.system.details.level, centralLevel: central.system.details.level, built: facilities[2].system.building.built } };
    });
    expect(fixtures.initial).toEqual({ ownerLevel: 13, centralLevel: 0, built: false });
    const alice = await join(aliceContext, fixtures.aliceName);
    const bob = await join(bobContext, fixtures.bobName);
    const privateOwnerReadable = await bob.evaluate(id => game.actors.get(id)?.testUserPermission(game.user, "OBSERVER") ?? false, fixtures.owner);
    expect(privateOwnerReadable).toBe(false);
    const foreign = await bob.evaluate(async uuid => {
      try { await game.modules.get("shared-bastion").api.request("build", uuid, { size: "cramped" }); return "allowed"; }
      catch (error) { return error.code; }
    }, fixtures.facility);
    expect(foreign).toBe("NotOwner");
    await gm.evaluate(async id => {
      const owner=game.actors.get(id);
      await owner.itemTypes.class[0].update({"system.levels":4});
    },fixtures.owner);
    const lowLevel=await alice.evaluate(async uuid=>{
      try {await game.modules.get("shared-bastion").api.request("build",uuid,{size:"cramped"});return "allowed";}
      catch(error){return error.code;}
    },fixtures.facility);
    expect(lowLevel).toBe("LevelRequired");
    await gm.evaluate(async id=>{
      const owner=game.actors.get(id);
      await owner.itemTypes.class[0].update({"system.levels":13});
      await owner.update({"system.currency.gp":499});
    },fixtures.owner);
    const insufficient=await alice.evaluate(async uuid=>{
      try {await game.modules.get("shared-bastion").api.request("build",uuid,{size:"cramped"});return "allowed";}
      catch(error){return error.code;}
    },fixtures.facility);
    expect(insufficient).toBe("InsufficientFunds");
    await gm.evaluate(id=>game.actors.get(id).update({"system.currency.gp":1000}),fixtures.owner);
    const result = await alice.evaluate(uuid => game.modules.get("shared-bastion").api.request("build", uuid, { size: "cramped" }), fixtures.facility);
    expect(result.ok).toBe(true);
    const read = () => gm.evaluate(async data => {
      const facility = await fromUuid(data.facility);
      return { ownerGold: game.actors.get(data.owner).system.currency.gp, centralGold: game.actors.get(data.central).system.currency.gp,
        otherGold: game.actors.get(data.other).system.currency.gp, progress: facility.system.progress.toObject?.() ?? {
          value: facility.system.progress.value, max: facility.system.progress.max, order: facility.system.progress.order, paid: facility.system.progress.paid
        }, built: facility.system.building.built, revision: facility.flags["shared-bastion"].revision };
    }, fixtures);
    const built = await read();
    expect(built.ownerGold).toBe(500);
    expect(built.centralGold).toBe(7000);
    expect(built.otherGold).toBe(9000);
    expect(built.progress).toMatchObject({ value: 0, max: 20, order: "build", paid: true });
    await gm.evaluate(({ facility, sender }) => {
      const message = game.messages.find(message => message.author?.id === sender && message.flags["shared-bastion"]?.request?.facility === facility
        && message.flags["shared-bastion"]?.response?.ok);
      if (!message) throw new Error("Authenticated request not found");
      Hooks.callAll("createChatMessage", message, {}, sender);
    }, { facility: fixtures.facility, sender: fixtures.aliceId });
    const complete = await gm.evaluate(uuid => game.modules.get("shared-bastion").api.request("advance", uuid, { days: 20 }), fixtures.facility);
    expect(complete.ok).toBe(true);
    const finished = await read();
    expect(finished.ownerGold).toBe(500);
    expect(finished.built).toBe(true);
    expect(finished.revision).toBe(2);
    expect(finished.progress.max).toBe(null);
    await gm.evaluate(() => {
      const message = game.messages.find(message => message.flags["shared-bastion"]?.request?.action === "advance" && message.flags["shared-bastion"]?.response?.ok);
      Hooks.callAll("createChatMessage", message, {}, game.user.id);
    });
    await gm.reload();
    await gm.waitForFunction(() => globalThis.game?.ready === true);
    expect((await read()).revision).toBe(2);
    console.log("T02 native result", JSON.stringify({ initial: fixtures.initial, built, finished }));
  } finally {
    await aliceContext.close().catch(() => {});
    await bobContext.close().catch(() => {});
    if (fixtures && !gm.isClosed()) await gm.evaluate(async data => {
      for (const id of data.actorIds) await game.actors.get(id)?.delete();
      for (const id of data.userIds) await game.users.get(id)?.delete();
    }, fixtures);
    await gmContext.close();
  }
});
