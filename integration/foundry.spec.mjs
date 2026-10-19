import { test, expect } from "@playwright/test";

async function join(context, name, observe = () => {}) {
  const page = await context.newPage();
  observe(page);
  page.on("pageerror", error => console.log(`Client ${name} error: ${error.message}`));
  page.on("console", message => { if(message.type()==="error") console.log(`Client ${name} console: ${message.text().slice(0,500)}`); });
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
    const visibleCommands=await page.evaluate(()=>[...document.querySelectorAll("[data-message-id]")]
      .filter(element=>game.messages.get(element.dataset.messageId)?.flags["shared-bastion"]?.request&&getComputedStyle(element).display!=="none")
      .map(element=>element.dataset.messageId));
    expect(visibleCommands).toEqual([]);
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
  } finally { await context.close(); }
});

test("T04: a late native server collision rolls back earlier operations in the same batch", async({browser})=>{
  const context=await browser.newContext();
  const gm=await join(context,"Gamemaster");
  try {
    const result=await gm.evaluate(async()=>{
      const actor=await Actor.create({name:"SB Native Batch",type:"character",system:{currency:{gp:1000}}});
      const journal=await JournalEntry.create({name:"SB Native Batch Receipts",ownership:{default:0}});
      const receipt={action:"create",documentName:"JournalEntryPage",parent:journal,keepId:true,
        data:[{_id:"SBReceipt0000001",type:"text",name:"Native transaction proof",text:{content:""}}]};
      try {
        await foundry.documents.modifyBatch([receipt,{action:"update",documentName:"Actor",updates:[{_id:actor.id,"system.currency.gp":900}]}]);
        await foundry.documents.modifyBatch([{action:"update",documentName:"Actor",updates:[{_id:actor.id,"system.currency.gp":800}]},receipt]);
        return {gold:actor.system.currency.gp,receipts:journal.pages.size};
      } finally {await actor.delete();await journal.delete();}
    });
    expect(result).toEqual({gold:900,receipts:1});
  } finally {await context.close();}
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
      const previousBastion=game.settings.get("shared-bastion","bastionUuid");
      await game.settings.set("shared-bastion","bastionUuid",central.uuid);
      const facilities = await central.createEmbeddedDocuments("Item", [true, true, false].map((built, i) => ({
        name: prefix + `Facility ${i}`, type: "facility", flags: { "shared-bastion": { owner: owner.uuid, revision: 0 } },
        system: { type: { value: "basic", subtype: "bedroom" }, size: "cramped", building: { built, size: "cramped" } }
      })));
      const facility=facilities.find(item=>item.name===prefix+"Facility 2");
      if(!facility) throw new Error("Native fixture item was not returned");
      return { owner: owner.id, other: other.id, central: central.id, facility: facility.uuid, previousBastion, actorIds: [central.id, owner.id, other.id],
        userIds: [alice.id, bob.id], aliceName: alice.name, bobName: bob.name, aliceId: alice.id,
        initial: { ownerLevel: owner.system.details.level, centralLevel: central.system.details.level, built: facility.system.building.built } };
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
      await game.settings.set("shared-bastion","bastionUuid",data.previousBastion);
      for (const id of data.actorIds) await game.actors.get(id)?.delete();
      for (const id of data.userIds) await game.users.get(id)?.delete();
    }, fixtures);
    await gmContext.close();
  }
});

test("T03: directory creation, private participants and the dedicated sheet persist", async ({ browser }) => {
  const gmContext=await browser.newContext();
  const playerContext=await browser.newContext();
  const gm=await join(gmContext,"Gamemaster");
  let fixtures;
  try {
    fixtures=await gm.evaluate(async()=>{
      for(const actor of game.actors.filter(actor=>actor.flags["shared-bastion"]?.integrationFixture)) await actor.delete();
      for(const user of game.users.filter(user=>user.name.startsWith("SB T03 "))) await user.delete();
      const user=await User.create({name:"SB T03 Participant",role:CONST.USER_ROLES.PLAYER});
      const actor=await Actor.create({name:"SB T03 Private Character",type:"character",ownership:{default:0,[user.id]:3},flags:{"shared-bastion":{integrationFixture:true}},system:{currency:{gp:1234}}});
      await user.update({character:actor.id});
      return {user:user.id,owner:actor.id,ownerUuid:actor.uuid,name:user.name,originalSheet:actor.sheet.constructor.name,originalOwnership:actor.ownership};
    });
    await gm.evaluate(async()=>{ui.sidebar.changeTab("actors","primary");ui.sidebar.expand();await ui.actors.render({force:true});});
    console.log("T03 directory rendered",await gm.locator(".shared-bastion-create").count());
    await gm.locator(".shared-bastion-create").click();
    console.log("T03 creation opened");
    await gm.locator('dialog [name="name"]').fill("Wayfarers' Bastion");
    await gm.locator(`dialog [name="participants"][value="${fixtures.ownerUuid}"]`).check();
    await gm.locator('dialog [data-action="save"]').click();
    console.log("T03 configuration submitted");
    await gm.locator(".bastion-sheet").waitFor();
    const result=await gm.evaluate(()=>{
      const actor=game.modules.get("shared-bastion").api.repository.find();
      return {id:actor.id,sheet:actor.sheet.constructor.name,flag:actor.flags["shared-bastion"],ownership:actor.ownership};
    });
    fixtures.bastion=result.id;
    await gm.evaluate(id=>game.actors.get(id).setFlag("shared-bastion","integrationFixture",true),result.id);
    expect(result.sheet).toBe("BastionSheet");
    expect(result.flag.participants).toEqual([fixtures.ownerUuid]);
    expect(Object.keys(result.flag.roster[0]).sort()).toEqual(["uuid","name","img","available"].sort());
    expect(result.ownership[fixtures.user]).toBe(2);
    expect(await gm.evaluate(id=>({sheet:game.actors.get(id).sheet.constructor.name,ownership:game.actors.get(id).ownership}),fixtures.owner))
      .toEqual({sheet:fixtures.originalSheet,ownership:fixtures.originalOwnership});
    await gm.locator(".bastion-sheet").screenshot({path:"test-results/t03-bastion.png"});
    await gm.reload();
    await gm.waitForFunction(()=>globalThis.game?.ready===true);
    await gm.evaluate(id=>game.actors.get(id).sheet.render({force:true}),result.id);
    await expect(gm.locator(".bastion-sheet")).toContainText("Wayfarers' Bastion");
    const player=await join(playerContext,fixtures.name);
    await player.evaluate(id=>game.actors.get(id).sheet.render({force:true}),result.id);
    await expect(player.locator(".bastion-sheet")).toContainText("SB T03 Private Character");
    expect(await player.locator('[data-action="configureBastion"]').count()).toBe(0);
    const permission=await player.evaluate(async id=>{
      try {await game.modules.get("shared-bastion").api.repository.configure(game.actors.get(id),{name:"Unauthorized",participants:[]});return "allowed";}
      catch(error){return error.code;}
    },result.id);
    expect(permission).toBe("GMOnly");
    await gm.evaluate(id=>game.modules.get("shared-bastion").api.repository.configure(game.actors.get(id),{name:"Wayfarers' Bastion",participants:[]}),result.id);
    expect(await gm.evaluate(({bastion,user})=>game.actors.get(bastion).testUserPermission(game.users.get(user),"OBSERVER"),fixtures)).toBe(false);
    expect(await gm.evaluate(id=>game.actors.get(id).flags["shared-bastion"].bastion,result.id)).toBe(true);
    const orphan=await gm.evaluate(async data=>{
      const bastion=game.actors.get(data.bastion);
      await game.modules.get("shared-bastion").api.repository.configure(bastion,{name:bastion.name,participants:[data.ownerUuid]});
      const [facility]=await bastion.createEmbeddedDocuments("Item",[{name:"T03 Orphan",type:"facility",flags:{"shared-bastion":{owner:data.ownerUuid}},system:{type:{value:"basic"}}}]);
      await game.actors.get(data.owner).delete();
      return facility.uuid;
    },fixtures);
    await expect.poll(()=>gm.evaluate(id=>game.actors.get(id).flags["shared-bastion"].roster[0].available,result.id)).toBe(false);
    await expect(gm.locator(".bastion-sheet .bastion-warning").first()).toContainText("Check assignment");
    expect(await gm.evaluate(async uuid=>{
      try {await game.modules.get("shared-bastion").api.request("build",uuid,{size:"cramped"});return "allowed";}
      catch(error){return error.code;}
    },orphan)).toBe("MissingOwner");
  } finally {
    await playerContext.close().catch(()=>{});
    if(fixtures && !gm.isClosed()) await gm.evaluate(async data=>{
      if(data.bastion) await game.actors.get(data.bastion)?.delete();
      await game.actors.get(data.owner)?.delete();
      await game.users.get(data.user)?.delete();
    },fixtures);
    await gmContext.close();
  }
});

test("T04: two GMs, competing owners, durable failover and no-GM read mode", async ({browser})=>{
  const contexts=[];
  const context=async()=>{const c=await browser.newContext();contexts.push(c);return c;};
  let gmContext=await context();
  let gm=await join(gmContext,"Gamemaster");
  let fixtures;
  try {
    fixtures=await gm.evaluate(async()=>{
      const prefix="SB T04 ";
      const prior=game.actors.filter(actor=>actor.flags["shared-bastion"]?.integrationFixture)
        .sort((a,b)=>Number(Boolean(b.flags["shared-bastion"].bastion))-Number(Boolean(a.flags["shared-bastion"].bastion)));
      for(const actor of prior) await actor.delete();
      if(game.modules.get("shared-bastion").api.repository.find()) throw new Error("Expected an empty dedicated test world");
      for(const user of game.users.filter(user=>user.name.startsWith(prefix))) await user.delete();
      const otherGM=await User.create({name:prefix+"Other GM",role:CONST.USER_ROLES.GAMEMASTER});
      const alice=await User.create({name:prefix+"Alice",role:CONST.USER_ROLES.PLAYER});
      const bob=await User.create({name:prefix+"Bob",role:CONST.USER_ROLES.PLAYER});
      const owner=await Actor.create({name:prefix+"Owner",type:"character",ownership:{default:0,[alice.id]:3,[bob.id]:3},
        flags:{"shared-bastion":{integrationFixture:true}},system:{currency:{gp:2500}},
        items:[{name:"Test Class",type:"class",system:{levels:13,identifier:"fighter"}}]});
      await alice.update({character:owner.id});await bob.update({character:owner.id});
      const bastion=await game.modules.get("shared-bastion").api.repository.create({name:prefix+"Bastion",participants:[owner.uuid]});
      await bastion.setFlag("shared-bastion","integrationFixture",true);
      const facilities=await bastion.createEmbeddedDocuments("Item",[true,true,false,false,false,false,false,false].map((built,i)=>({
        name:prefix+`Facility ${i}`,type:"facility",flags:{"shared-bastion":{owner:owner.uuid,revision:0}},
        system:{type:{value:"basic",subtype:"bedroom"},building:{built,size:"cramped"},size:"cramped"}
      })));
      const uuid=i=>facilities.find(f=>f.name===prefix+`Facility ${i}`).uuid;
      const rogue=await Actor.create({name:prefix+"Rogue",type:"character",ownership:{default:0,[alice.id]:3},
        flags:{"shared-bastion":{integrationFixture:true,bastion:true,version:1,participants:[owner.uuid]}}});
      const [rogueFacility]=await rogue.createEmbeddedDocuments("Item",[{name:prefix+"Rogue Facility",type:"facility",
        flags:{"shared-bastion":{owner:owner.uuid,revision:0}},system:{type:{value:"basic"},building:{built:false}}}]);
      return {originalGM:game.user.id,otherGM:otherGM.id,otherGMName:otherGM.name,alice:alice.id,aliceName:alice.name,bob:bob.id,bobName:bob.name,
        owner:owner.id,bastion:bastion.id,rogue:rogue.id,rogueFacility:rogueFacility.uuid,facilities:[uuid(2),uuid(3),uuid(4),uuid(5),uuid(6),uuid(7)]};
    });
    const secondContext=await context();
    const second=await join(secondContext,fixtures.otherGMName);
    const aliceContext=await context();const alice=await join(aliceContext,fixtures.aliceName);
    const bobContext=await context();const bob=await join(bobContext,fixtures.bobName);
    const formerGMAccess=await gm.evaluate(data=>{
      const former=game.users.get(data.originalGM).clone({role:CONST.USER_ROLES.PLAYER},{keepId:true});
      return {bastionOwner:game.actors.get(data.bastion).testUserPermission(former,"OWNER"),
        queueReadable:game.journal.get("SharedBastionReq").testUserPermission(former,"OBSERVER"),
        receiptsReadable:game.journal.get("SharedBastionLog").testUserPermission(former,"OBSERVER")};
    },fixtures);
    expect(formerGMAccess).toEqual({bastionOwner:false,queueReadable:false,receiptsReadable:false});
    const executor=await alice.evaluate(()=>[...game.users].filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id,"en"))[0].id);
    const primary=executor===fixtures.originalGM?gm:second;
    let backup=executor===fixtures.originalGM?second:gm;
    const primaryContext=executor===fixtures.originalGM?gmContext:secondContext;
    let backupContext=executor===fixtures.originalGM?secondContext:gmContext;
    const attempt=(page,uuid,action="build",payload={size:"cramped"})=>page.evaluate(async({uuid,action,payload})=>{
      try{return {ok:true,result:await game.modules.get("shared-bastion").api.request(action,uuid,payload)};}
      catch(error){return {ok:false,code:error.code};}
    },{uuid,action,payload});
    const competing=await Promise.all([attempt(alice,fixtures.facilities[0]),attempt(bob,fixtures.facilities[0])]);
    expect(competing.filter(r=>r.ok)).toHaveLength(1);
    expect(competing.find(r=>!r.ok).code).toBe("Conflict");
    expect(await gm.evaluate(id=>game.actors.get(id).system.currency.gp,fixtures.owner)).toBe(2000);
    const different=await Promise.all([attempt(alice,fixtures.facilities[1]),attempt(bob,fixtures.facilities[2])]);
    expect(different.every(r=>r.ok)).toBe(true);
    expect(await gm.evaluate(id=>game.actors.get(id).system.currency.gp,fixtures.owner)).toBe(1000);
    const executors=await gm.evaluate(data=>[...game.journal.get("SharedBastionLog").pages]
      .filter(page=>data.facilities.includes(page.flags["shared-bastion"]?.receipt?.request?.facility)&&page.flags["shared-bastion"]?.receipt?.response?.ok)
      .map(page=>page._stats.lastModifiedBy),fixtures);
    expect(executors).toEqual([executor,executor,executor]);
    expect((await attempt(alice,fixtures.rogueFacility)).code).toBe("InvalidBastion");
    // A forged author must not turn a player request into a GM-only progress command.
    await alice.evaluate(async data=>ChatMessage.create({author:data.gm,content:"T04 sender test",whisper:[data.gm,game.user.id],
      flags:{"shared-bastion":{request:{v:1,nonce:foundry.utils.randomID(),action:"advance",facility:data.facility,revision:1,payload:{days:20}}}}
    }),{gm:executor,facility:fixtures.facilities[0]});
    expect((await attempt(alice,fixtures.facilities[0],"advance",{days:20})).code).toBe("GMOnly");
    expect(await gm.evaluate(async uuid=>(await fromUuid(uuid)).system.building.built,fixtures.facilities[0])).toBe(false);
    await primary.evaluate(uuid=>{globalThis.sbT04Veto=Hooks.on("preUpdateItem",item=>item.uuid===uuid?false:undefined);},fixtures.facilities[4]);
    expect((await attempt(alice,fixtures.facilities[4])).code).toBe("CommitFailed");
    expect(await primary.evaluate(id=>game.actors.get(id).system.currency.gp,fixtures.owner)).toBe(1000);
    await primary.evaluate(()=>Hooks.off("preUpdateItem",globalThis.sbT04Veto));
    await primary.evaluate(uuid=>{
      const message=game.messages.find(message=>message.flags["shared-bastion"]?.request?.facility===uuid);
      Hooks.callAll("createChatMessage",message,{},message.author.id);
    },fixtures.facilities[4]);
    await primary.evaluate(()=>{
      const bus=game.modules.get("shared-bastion").api.repository.bus;
      const execute=bus.execute.bind(bus);
      bus.execute=async(...args)=>{globalThis.sbT04Accepted=true;await new Promise(resolve=>{globalThis.sbT04Release=resolve;});return execute(...args);};
    });
    const pending=attempt(alice,fixtures.facilities[3]);
    await primary.waitForFunction(()=>globalThis.sbT04Accepted===true);
    await primaryContext.close();
    const failover=await pending;
    expect(failover.ok).toBe(true);
    expect(await backup.evaluate(id=>game.actors.get(id).system.currency.gp,fixtures.owner)).toBe(500);
    await backup.reload();await backup.waitForFunction(()=>globalThis.game?.ready===true);
    expect(await backup.evaluate(id=>game.actors.get(id).system.currency.gp,fixtures.owner)).toBe(500);
    expect(await backup.evaluate(async uuid=>(await fromUuid(uuid)).system.progress.max,fixtures.facilities[4])).toBe(null);
    const returningContext=await context();
    const returning=await join(returningContext,executor===fixtures.originalGM?"Gamemaster":fixtures.otherGMName);
    const secondExecutor=await alice.evaluate(()=>[...game.users].filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id,"en"))[0].id);
    const returningId=await returning.evaluate(()=>game.user.id);
    const finishing=returningId===secondExecutor?returning:backup;
    const finishingContext=returningId===secondExecutor?returningContext:backupContext;
    const survivor=returningId===secondExecutor?backup:returning;
    const survivorContext=returningId===secondExecutor?backupContext:returningContext;
    await finishing.evaluate(uuid=>{
      const bus=game.modules.get("shared-bastion").api.repository.bus;
      const reply=bus.reply.bind(bus);
      bus.reply=async(id,response)=>{
        if(response.ok&&response.uuid===uuid){globalThis.sbT04Committed=true;await new Promise(resolve=>{globalThis.sbT04ReplyRelease=resolve;});}
        return reply(id,response);
      };
    },fixtures.facilities[5]);
    const awaitingAcknowledgment=attempt(alice,fixtures.facilities[5]);
    await finishing.waitForFunction(()=>globalThis.sbT04Committed===true);
    await finishingContext.close();
    expect((await awaitingAcknowledgment).ok).toBe(true);
    backup=survivor;backupContext=survivorContext;
    expect(await backup.evaluate(id=>game.actors.get(id).system.currency.gp,fixtures.owner)).toBe(0);
    await alice.evaluate(id=>game.actors.get(id).sheet.render({force:true}),fixtures.bastion);
    await backupContext.close();
    await expect.poll(()=>alice.evaluate(()=>[...game.users].filter(u=>u.active&&u.isGM).length)).toBe(0);
    const before=await alice.evaluate(()=>game.messages.size);
    expect((await attempt(alice,fixtures.facilities[3])).code).toBe("NoGM");
    expect(await alice.evaluate(()=>game.messages.size)).toBe(before);
    await expect(alice.locator(".bastion-sheet")).toContainText("No GM is connected");
    gmContext=await context();gm=await join(gmContext,"Gamemaster");
    console.log("T04 passed",JSON.stringify({executor,competing:competing.map(r=>r.ok?"ok":r.code),different:different.map(r=>r.ok),failover:failover.ok,acknowledgmentRecovery:true,finalGold:0}));
  } finally {
    for(const c of contexts.filter(c=>c!==gmContext)) await c.close().catch(()=>{});
    if(fixtures&&!gm.isClosed()) await gm.evaluate(async data=>{
      for(const id of [data.bastion,data.rogue,data.owner]) await game.actors.get(id)?.delete();
      for(const id of [data.otherGM,data.alice,data.bob]) await game.users.get(id)?.delete();
    },fixtures);
    await gmContext.close().catch(()=>{});
  }
});

test("T05: owner sections, overview filters and live player actions share the same data", async ({browser})=>{
  const gmContext=await browser.newContext();
  const aliceContext=await browser.newContext();
  const bobContext=await browser.newContext();
  let gm=await join(gmContext,"Gamemaster");
  let fixtures;
  const errors=[];
  try {
    fixtures=await gm.evaluate(async()=>{
      const prefix="SB T05 ";
      for(const actor of game.actors.filter(a=>a.flags["shared-bastion"]?.integrationFixture)
        .sort((a,b)=>Number(Boolean(b.flags["shared-bastion"].bastion))-Number(Boolean(a.flags["shared-bastion"].bastion)))) await actor.delete();
      if(game.modules.get("shared-bastion").api.repository.find()) throw new Error("Expected an empty dedicated test world");
      for(const user of game.users.filter(u=>u.name.startsWith(prefix))) await user.delete();
      const users=await User.createDocuments(["Alice","Bob"].map(name=>({name:prefix+name,role:CONST.USER_ROLES.PLAYER})));
      const owners=[];
      for(const user of users) {
        const owner=await Actor.create({name:prefix+user.name.split(" ").at(-1)+" Character",type:"character",
          ownership:{default:0,[user.id]:3},flags:{"shared-bastion":{integrationFixture:true}},system:{currency:{gp:1257}},
          items:[{name:"Test Class",type:"class",system:{levels:13,identifier:"fighter"}}]});
        await user.update({character:owner.id});owners.push(owner);
      }
      const bastion=await game.modules.get("shared-bastion").api.repository.create({name:"The Wayfarers' Bastion",participants:owners.map(a=>a.uuid)});
      await bastion.setFlag("shared-bastion","integrationFixture",true);
      const data=owners.flatMap((owner,index)=>[true,true,false,"special"].map((built,i)=>({
        name:prefix+`${index}-${i}`,type:"facility",img:"icons/svg/castle.svg",
        flags:{"shared-bastion":{owner:owner.uuid,revision:0}},
        system:{type:{value:built==="special"?"special":"basic",subtype:built==="special"?"library":"bedroom"},
          description:{value:"<p>A shared room.</p>"},size:"cramped",order:built==="special"?"research":"",
          building:{built:Boolean(built),size:"cramped"}}
      })));
      const items=await bastion.createEmbeddedDocuments("Item",data);
      return {bastion:bastion.id,users:users.map(u=>({id:u.id,name:u.name})),owners:owners.map(a=>({id:a.id,uuid:a.uuid})),
        aliceBuild:items.find(i=>i.name===prefix+"0-2").id,bobBuild:items.find(i=>i.name===prefix+"1-2").id,
        aliceIds:items.filter(i=>i.flags["shared-bastion"].owner===owners[0].uuid).map(i=>i.id).sort(),
        bobIds:items.filter(i=>i.flags["shared-bastion"].owner===owners[1].uuid).map(i=>i.id).sort()};
    });
    const alice=await join(aliceContext,fixtures.users[0].name,p=>p.on("pageerror",e=>errors.push(e.message)));
    const bob=await join(bobContext,fixtures.users[1].name,p=>p.on("pageerror",e=>errors.push(e.message)));
    for(const page of [gm,alice,bob]) await page.evaluate(id=>game.actors.get(id).sheet.render({force:true}),fixtures.bastion);
    const rows=page=>page.locator(".bastion-sheet [data-facility-id]");
    const row=(page,id)=>page.locator(`.bastion-sheet [data-facility-id="${id}"]`);
    const ids=page=>rows(page).evaluateAll(elements=>elements.map(e=>e.dataset.facilityId).sort());
    await expect(rows(alice)).toHaveCount(8);await expect(rows(bob)).toHaveCount(8);
    expect(await ids(alice)).toEqual(await ids(bob));
    await expect(alice.locator(".bastion-owner-section")).toHaveCount(2);
    await expect(alice.locator('.bastion-owner-section [data-type="basic"]')).toHaveCount(2);
    await expect(row(alice,fixtures.aliceBuild).locator('[data-action="buildFacility"]')).toBeEnabled();
    await expect(row(alice,fixtures.bobBuild).locator('[data-action="buildFacility"]')).toBeDisabled();
    await expect(row(bob,fixtures.bobBuild).locator('[data-action="buildFacility"]')).toBeEnabled();
    await expect(row(bob,fixtures.aliceBuild).locator('[data-action="buildFacility"]')).toBeDisabled();
    await expect(alice.locator(".bastion-sheet")).not.toContainText("1257");
    await expect.poll(()=>bob.evaluate(id=>game.actors.get(id).testUserPermission(game.user,"OBSERVER"),fixtures.owners[0].id)).toBe(false);
    // Both tabs and every filter operate on the same central native items.
    await alice.locator('[data-action="changeView"][data-view="overview"]').click();
    await expect(alice.locator(".bastion-owner-section")).toHaveCount(1);
    expect(await ids(alice)).toEqual([...fixtures.aliceIds,...fixtures.bobIds].sort());
    await alice.locator('[name="ownerFilter"]').selectOption("mine");
    expect(await ids(alice)).toEqual(fixtures.aliceIds);
    await alice.locator('[name="ownerFilter"]').selectOption(fixtures.owners[1].uuid);
    expect(await ids(alice)).toEqual(fixtures.bobIds);
    await alice.locator('[data-action="changeView"][data-view="owners"]').click();
    expect(await ids(alice)).toEqual(fixtures.bobIds);
    await alice.locator('[name="ownerFilter"]').selectOption("all");
    // The read-only description opens without routing through a private character sheet.
    await row(alice,fixtures.aliceBuild).locator('[data-action="viewFacility"]').click();
    await expect(alice.locator("dialog")).toContainText("A shared room.");
    await alice.locator('dialog .window-header [data-action="close"]').click();
    // Canceling a build dialog is inert, then a confirmed build updates both clients.
    await row(alice,fixtures.aliceBuild).locator('[data-action="buildFacility"]').click();
    await alice.locator('dialog .window-header [data-action="close"]').click();
    expect(await gm.evaluate(id=>game.actors.get(id).system.currency.gp,fixtures.owners[0].id)).toBe(1257);
    await row(alice,fixtures.aliceBuild).locator('[data-action="buildFacility"]').click();
    await alice.locator('dialog [name="size"]').selectOption("cramped");
    await alice.locator('dialog [data-action="build"]').click();
    await expect(row(alice,fixtures.aliceBuild)).toContainText("0 / 20 days");
    await expect(row(bob,fixtures.aliceBuild)).toContainText("0 / 20 days");
    expect(await gm.evaluate(id=>game.actors.get(id).system.currency.gp,fixtures.owners[0].id)).toBe(757);
    await gm.evaluate(({bastion,id})=>game.actors.get(bastion).items.get(id).update({name:"Wayfarers' New Bedroom"}),{bastion:fixtures.bastion,id:fixtures.aliceBuild});
    await expect(row(alice,fixtures.aliceBuild)).toContainText("Wayfarers' New Bedroom");
    await expect(row(bob,fixtures.aliceBuild)).toContainText("Wayfarers' New Bedroom");
    await bob.locator('[name="ownerFilter"]').selectOption("mine");
    expect(await ids(bob)).toEqual(fixtures.bobIds);
    await gm.locator(".bastion-sheet .bastion-shell").screenshot({path:"test-results/t05-overview-gm.png"});
    await alice.locator(".bastion-sheet .bastion-shell").screenshot({path:"test-results/t05-overview-player.png"});
    // Presence changes are reflected without reloading either player's sheet.
    await gmContext.close();
    await expect(bob.locator(".bastion-sheet .bastion-notice")).toContainText("No GM");
    await expect(row(bob,fixtures.bobBuild).locator('[data-action="buildFacility"]')).toBeDisabled();
    await expect(rows(alice)).toHaveCount(8);
    const recovery=await browser.newContext();
    try {
      gm=await join(recovery,"Gamemaster");
      await expect(bob.locator(".bastion-sheet .bastion-notice")).toHaveCount(0);
      await expect(row(bob,fixtures.bobBuild).locator('[data-action="buildFacility"]')).toBeEnabled();
      expect(errors).toEqual([]);
      console.log("T05 passed: identical central items, private owners, tabs/filters, UI build, live update and GM return");
      await aliceContext.close();await bobContext.close();
      await gm.evaluate(async data=>{
        await game.actors.get(data.bastion)?.delete();
        for(const owner of data.owners) await game.actors.get(owner.id)?.delete();
        for(const user of data.users) await game.users.get(user.id)?.delete();
      },fixtures);fixtures=null;
    } finally {await recovery.close();}
  } finally {
    await aliceContext.close().catch(()=>{});await bobContext.close().catch(()=>{});
    if(fixtures&&!gm.isClosed()) await gm.evaluate(async data=>{
      await game.actors.get(data.bastion)?.delete();for(const owner of data.owners) await game.actors.get(owner.id)?.delete();
      for(const user of data.users) await game.users.get(user.id)?.delete();
    },fixtures);
    await gmContext.close().catch(()=>{});
  }
});

test("T06: trusted templates, individual limits, editing, scoped exceptions and owner repair",async({browser})=>{
  const contexts=[];const context=async()=>{const result=await browser.newContext();contexts.push(result);return result;};
  let gm=await join(await context(),"Gamemaster");let fixtures;
  try {
    fixtures=await gm.evaluate(async()=>{
      const prefix="SB T06 ";
      const previousDefinitions=game.settings.get("shared-bastion","templateRules");
      const packId="world.sb-t06-facilities";
      if(game.packs.has(packId)) {await game.packs.get(packId).configure({locked:false});await game.packs.get(packId).deleteCompendium();}
      for(const actor of game.actors.filter(a=>a.flags["shared-bastion"]?.integrationFixture).sort((a,b)=>Number(Boolean(b.flags["shared-bastion"].bastion))-Number(Boolean(a.flags["shared-bastion"].bastion)))) await actor.delete();
      for(const item of game.items.filter(i=>i.flags["shared-bastion"]?.integrationFixture)) await item.delete();
      for(const user of game.users.filter(u=>u.name.startsWith(prefix))) await user.delete();
      const a=await User.create({name:prefix+"Alice",role:CONST.USER_ROLES.PLAYER});const b=await User.create({name:prefix+"Bob",role:CONST.USER_ROLES.PLAYER});
      const flag={"shared-bastion":{integrationFixture:true}};
      const alice=await Actor.create({name:prefix+"Level 5",type:"character",ownership:{default:0,[a.id]:3},flags:flag,system:{currency:{gp:4000}},
        items:[{name:"Test Class",type:"class",system:{levels:5,identifier:"fighter"}},...Array.from({length:2},(_,i)=>({name:prefix+`Personal ${i}`,type:"facility",system:{type:{value:"basic"},building:{built:true}}}))]});
      const bob=await Actor.create({name:prefix+"Level 13",type:"character",ownership:{default:0,[b.id]:3},flags:flag,system:{currency:{gp:9000}},
        items:[{name:"Test Class",type:"class",system:{levels:13,identifier:"fighter"}}]});
      await a.update({character:alice.id});await b.update({character:bob.id});
      const bastion=await game.modules.get("shared-bastion").api.repository.create({name:prefix+"Bastion",participants:[alice.uuid,bob.uuid]});
      await bastion.setFlag("shared-bastion","integrationFixture",true);
      await bastion.createEmbeddedDocuments("Item",[{name:"Carrier Class",type:"class",system:{levels:20,identifier:"fighter"}}]);
      await bastion.update({"system.currency.gp":7000});
      const basic=await Item.create({name:prefix+"Bedroom",type:"facility",ownership:{default:2},flags:flag,system:{type:{value:"basic",subtype:"bedroom"},level:5,size:"cramped"}});
      const special=await Item.create({name:prefix+"Smithy",type:"facility",ownership:{default:2},flags:{"shared-bastion":{integrationFixture:true}},system:{type:{value:"special",subtype:"smithy"},level:9,size:"roomy"}});
      const untrusted=await Item.create({name:prefix+"Editable rules",type:"facility",ownership:{default:2,[a.id]:3},flags:flag,system:{type:{value:"basic"}}});
      const pack=await foundry.documents.collections.CompendiumCollection.createCompendium({name:"sb-t06-facilities",label:"SB T06 Templates",type:"Item"});
      await pack.configure({locked:false,ownership:{PLAYER:"OBSERVER",ASSISTANT:"OWNER",GAMEMASTER:"OWNER"}});
      await pack.importDocument(basic);
      await pack.configure({locked:true});
      return {pack:pack.collection,previousDefinitions,bastion:bastion.id,alice:alice.id,bob:bob.id,aliceUuid:alice.uuid,bobUuid:bob.uuid,aliceUser:a.id,bobUser:b.id,aliceName:a.name,bobName:b.name,
        basic:basic.uuid,special:special.uuid,untrusted:untrusted.uuid,items:[basic.id,special.id,untrusted.id]};
    });
    const alice=await join(await context(),fixtures.aliceName);const bob=await join(await context(),fixtures.bobName);
    const attempt=(page,action,uuid,payload)=>page.evaluate(async({action,uuid,payload})=>{
      try {return {ok:true,result:await game.modules.get("shared-bastion").api.request(action,uuid,payload)};}catch(error){return {ok:false,code:error.code};}
    },{action,uuid,payload});
    const add=(page,owner,template,exceptions=[])=>attempt(page,"addFacility",`Actor.${fixtures.bastion}`,{owner,template,exceptions});
    await gm.evaluate(id=>game.actors.get(id).sheet.render({force:true}),fixtures.bastion);
    await gm.locator('[data-action="configureTemplates"]').click();
    await gm.locator('dialog [name="template"]').selectOption(fixtures.special);
    await gm.locator('dialog [data-action="save"]').click();
    await gm.locator('dialog [name="requirements"]').fill("tool:smith");
    await gm.locator('dialog').filter({has:gm.locator('[name="requirements"]')}).locator('[data-action="save"]').click();
    await expect.poll(()=>gm.evaluate(uuid=>game.settings.get("shared-bastion","templateRules")[uuid]?.requirements,fixtures.special)).toEqual(["tool:smith"]);
    expect(await gm.evaluate(async uuid=>(await fromUuid(uuid)).flags["shared-bastion"].requirements??null,fixtures.special)).toBe(null);
    expect((await attempt(alice,"setTemplateRules",`Actor.${fixtures.bastion}`,{template:fixtures.special,level:1,order:"",hirelings:0,defenders:0,requirements:[],exceptions:[]})).code).toBe("GMOnly");

    expect((await add(alice,fixtures.bobUuid,fixtures.basic)).code).toBe("NotOwner");
    expect((await add(alice,fixtures.aliceUuid,fixtures.untrusted)).code).toBe("UntrustedTemplate");
    expect((await add(alice,fixtures.aliceUuid,fixtures.special)).code).toBe("LevelRequired");
    expect((await add(bob,fixtures.bobUuid,fixtures.special)).code).toBe("PrerequisiteRequired");
    expect((await add(alice,fixtures.aliceUuid,fixtures.basic,[{scope:"level",reason:"Claim"}])).code).toBe("GMOnly");
    await alice.evaluate(id=>game.actors.get(id).sheet.render({force:true}),fixtures.bastion);
    await expect(alice.locator(".bastion-owner-summary")).toHaveCount(1);
    await expect(alice.locator(".bastion-owner-summary")).toContainText("0 / 2");
    await alice.locator('[data-action="addFacility"]').click();
    await alice.locator('dialog [name="template"]').selectOption(fixtures.basic);
    await alice.locator('dialog [data-action="save"]').click();
    await expect(alice.locator('.bastion-facility')).toHaveCount(1);
    const uuid=await gm.evaluate(id=>game.actors.get(id).itemTypes.facility[0].uuid,fixtures.bastion);
    expect(await gm.evaluate(async uuid=>(await fromUuid(uuid)).system.building.built,uuid)).toBe(false);
    await alice.locator('[data-action="editFacility"]').click();
    await alice.locator('dialog [name="name"]').fill("Our Shared Bedroom");
    await alice.locator('dialog [name="notes"]').fill("Room prepared by Alice.");
    await alice.locator('dialog [data-action="save"]').click();
    await expect(alice.locator('.bastion-facility')).toContainText("Room prepared by Alice.");
    const rules={level:9,order:"",hirelings:0,defenders:0,requirements:["tool:smith"],exceptions:[{scope:"level",reason:"A boon from the patron"}]};
    expect((await attempt(alice,"setFacilityRules",uuid,rules)).code).toBe("GMOnly");
    expect((await attempt(gm,"setFacilityRules",uuid,rules)).ok).toBe(true);
    await expect(alice.locator('[data-action="buildFacility"]')).toBeDisabled();
    expect((await attempt(alice,"build",uuid,{size:"cramped"})).code).toBe("PrerequisiteRequired");
    rules.exceptions.push({scope:"requirements",reason:"Patron supplies the needed expertise"});
    expect((await attempt(gm,"setFacilityRules",uuid,rules)).ok).toBe(true);
    await gm.evaluate(id=>game.actors.get(id).update({"system.currency.gp":499}),fixtures.alice);
    expect((await attempt(alice,"build",uuid,{size:"cramped"})).code).toBe("InsufficientFunds");
    await gm.evaluate(id=>game.actors.get(id).update({"system.currency.gp":4000}),fixtures.alice);
    expect((await attempt(alice,"build",uuid,{size:"cramped"})).ok).toBe(true);
    await gm.evaluate(id=>game.actors.get(id).update({"system.tools.smith.value":1}),fixtures.bob);
    const specials=[];
    for(let i=0;i<5;i++){const result=await add(bob,fixtures.bobUuid,fixtures.special);expect(result.ok).toBe(true);specials.push(result.result.uuid);}
    expect((await add(bob,fixtures.bobUuid,fixtures.special)).code).toBe("FacilityLimit");
    const extra=await add(gm,fixtures.bobUuid,fixtures.special,[{scope:"limit",reason:"Campaign reward"}]);expect(extra.ok).toBe(true);
    await gm.reload();await gm.waitForFunction(()=>game.ready===true);
    expect(await gm.evaluate(async uuid=>(await fromUuid(uuid)).flags["shared-bastion"].exceptions,uuid)).toEqual(rules.exceptions);
    await expect(alice.locator('.bastion-facility').first()).toContainText("Patron supplies the needed expertise");
    await gm.evaluate(id=>game.actors.get(id).sheet.render({force:true}),fixtures.bastion);
    const facilityId=uuid.split(".").at(-1);
    await gm.locator(`[data-facility-id="${facilityId}"] [data-action="reassignFacility"]`).click();
    await gm.locator('dialog [name="owner"]').selectOption(fixtures.bobUuid);
    await gm.locator('dialog [data-action="save"]').click();
    await expect.poll(()=>gm.evaluate(async uuid=>(await fromUuid(uuid)).flags["shared-bastion"].owner,uuid)).toBe(fixtures.bobUuid);
    expect((await attempt(alice,"editFacility",uuid,{name:"Forbidden",notes:""})).code).toBe("NotOwner");
    expect((await attempt(bob,"editFacility",uuid,{name:"Reassigned Bedroom",notes:"Now Bob's"})).ok).toBe(true);
    const totals=await gm.evaluate(data=>({alice:game.actors.get(data.alice).system.currency.gp,bob:game.actors.get(data.bob).system.currency.gp,carrier:game.actors.get(data.bastion).system.currency.gp}),fixtures);
    expect(totals).toEqual({alice:3500,bob:9000,carrier:7000});
    await bob.evaluate(id=>game.actors.get(id).sheet.render({force:true}),fixtures.bastion);
    await bob.locator(`[data-facility-id="${facilityId}"] [data-action="removeFacility"]`).click();
    await bob.locator('dialog [data-action="yes"]').click();
    await expect.poll(()=>gm.evaluate(async uuid=>Boolean(await fromUuid(uuid)),uuid)).toBe(false);
    expect(await gm.evaluate(uuid=>fromUuid(uuid),uuid)).toBe(null);
    const orphan=await add(alice,fixtures.aliceUuid,fixtures.basic);expect(orphan.ok).toBe(true);
    await gm.evaluate(id=>game.actors.get(id).delete(),fixtures.alice);
    expect((await attempt(gm,"reassignFacility",orphan.result.uuid,{owner:fixtures.bobUuid})).ok).toBe(true);
    const native=await bob.evaluate(async()=>{const catalog=await game.modules.get("shared-bastion").api.catalog();return catalog.find(item=>item.uuid.startsWith("Compendium.world.sb-t06-facilities."));});
    expect(native?.uuid).toBeTruthy();
    const original=await gm.evaluate(async uuid=>JSON.stringify((await fromUuid(uuid)).toObject()),native.uuid);
    const nativeDefinition=await gm.evaluate(async uuid=>({template:uuid,...game.modules.get("shared-bastion").api.presentation.rules(await fromUuid(uuid))}),native.uuid);
    const nativeRules={template:native.uuid,level:5,order:nativeDefinition.orders.find(o=>o.selected)?.value??"",hirelings:nativeDefinition.hirelings,defenders:nativeDefinition.defenders,requirements:[],exceptions:[]};
    expect((await attempt(gm,"setTemplateRules",`Actor.${fixtures.bastion}`,nativeRules)).ok).toBe(true);
    expect((await add(bob,fixtures.bobUuid,native.uuid,[{scope:"limit",reason:"Native compendium integration check"}])).code).toBe("GMOnly");
    expect((await add(gm,fixtures.bobUuid,native.uuid,[{scope:"limit",reason:"Native compendium integration check"}])).ok).toBe(true);
    expect(await gm.evaluate(async uuid=>JSON.stringify((await fromUuid(uuid)).toObject()),native.uuid)).toBe(original);
    await gm.locator(".bastion-sheet .bastion-shell").screenshot({path:"test-results/t06-facilities.png"});
    console.log("T06 passed",JSON.stringify({ownerStorage:true,individualLimits:true,exceptions:true,totals}));
  } finally {
    for(const c of contexts.slice(1)) await c.close().catch(()=>{});
    if(fixtures&&!gm.isClosed()) await gm.evaluate(async data=>{
      await game.settings.set("shared-bastion","templateRules",data.previousDefinitions);
      if(data.pack&&game.packs.has(data.pack)) {await game.packs.get(data.pack).configure({locked:false});await game.packs.get(data.pack).deleteCompendium();}
      await game.actors.get(data.bastion)?.delete();await game.actors.get(data.alice)?.delete();await game.actors.get(data.bob)?.delete();
      for(const id of data.items) await game.items.get(id)?.delete();await game.users.get(data.aliceUser)?.delete();await game.users.get(data.bobUser)?.delete();
    },fixtures);
    for(const c of contexts) await c.close().catch(()=>{});
  }
});
