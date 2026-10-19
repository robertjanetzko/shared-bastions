import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const expectedModule=JSON.parse(readFileSync(new URL("../module.json",import.meta.url),"utf8"));

async function join(context, name, observe = () => {}, { withCanvas = false, language = null } = {}) {
  const page = await context.newPage();
  observe(page);
  page.on("pageerror", error => console.log(`Client ${name} error: ${error.message}`));
  page.on("console", message => { if(message.type()==="error") console.log(`Client ${name} console: ${message.text().slice(0,500)}`); });
  await page.goto("/join");
  await page.locator('[name="userId"]').waitFor();
  await page.locator('[name="userId"]').selectOption({ label: name });
  await page.locator('button[name="join"]').click();
  await page.waitForURL("**/game", { timeout: 30000 });
  // Most administration tests use noCanvas; T10 additionally checks a normal canvas client.
  await page.waitForFunction(() => globalThis.game?.settings?.settings?.has("core.noCanvas"), {}, { timeout: 60000 });
  await page.evaluate(async({withCanvas,language}) => {
    await game.settings.set("core", "noCanvas", !withCanvas);
    if(language) await game.settings.set("core","language",language);
  },{withCanvas,language});
  await page.reload();
  await page.waitForFunction(() => globalThis.game?.ready === true, {}, { timeout: 60000 });
  console.log(`Client ready: ${name}`);
  const world = await page.evaluate(() => game.world.id);
  if (world !== "shared-bastion-integration") throw new Error("Integration tests only run in the dedicated shared-bastion-integration world");
  return page;
}

test("T10: German sheet, native observer permissions and roster removal work with an active canvas",async({browser})=>{
  const gmContext=await browser.newContext();const aliceContext=await browser.newContext();const bobContext=await browser.newContext();
  const gm=await join(gmContext,"Gamemaster");let fixtures;
  try{
    fixtures=await gm.evaluate(async()=>{
      const prefix="SB T10 ";const flags={"shared-bastion":{integrationFixture:true}};
      for(const actor of game.actors.filter(a=>a.flags["shared-bastion"]?.integrationFixture).sort((a,b)=>Number(Boolean(b.flags["shared-bastion"].bastion))-Number(Boolean(a.flags["shared-bastion"].bastion)))) await actor.delete();
      for(const scene of game.scenes.filter(s=>s.flags["shared-bastion"]?.integrationFixture)) await scene.delete();
      for(const user of game.users.filter(u=>u.name.startsWith(prefix))) await user.delete();
      const alice=await User.create({name:prefix+"Alice",role:CONST.USER_ROLES.PLAYER});const bob=await User.create({name:prefix+"Bob",role:CONST.USER_ROLES.PLAYER});
      const character=(name,user,level,gold)=>Actor.create({name,type:"character",flags,ownership:{default:0,[user.id]:3},system:{currency:{gp:gold}},items:[{name:"Class",type:"class",system:{levels:level,identifier:"fighter"}}]});
      const owner=await character("Alriks privater Charakter",alice,5,1000);const other=await character("Belas privater Charakter",bob,13,9000);
      await alice.update({character:owner.id});await bob.update({character:other.id});
      const bastion=await game.modules.get("shared-bastion").api.repository.create({name:"Die gemeinsame Bastion",participants:[owner.uuid,other.uuid]});await bastion.setFlag("shared-bastion","integrationFixture",true);
      const [facility]=await bastion.createEmbeddedDocuments("Item",[{name:"Alriks Schlafzimmer",type:"facility",flags:{"shared-bastion":{owner:owner.uuid,revision:0}},system:{type:{value:"basic",subtype:"bedroom"},size:"cramped",building:{built:true,size:"cramped"}}}]);
      const previousScene=game.scenes.active?.id;const paused=game.paused;
      const scene=await Scene.create({name:prefix+"Native canvas check",flags,width:1000,height:800,padding:0,grid:{size:100},tokenVision:true,environment:{globalLight:{enabled:true}}});
      const [token]=await scene.createEmbeddedDocuments("Token",[{name:owner.name,actorId:owner.id,actorLink:true,x:100,y:100,texture:{src:owner.img},sight:{enabled:true}}]);
      await scene.activate();game.togglePause(false,true);
      return {alice:alice.id,bob:bob.id,aliceName:alice.name,bobName:bob.name,owner:owner.id,other:other.id,bastion:bastion.id,facility:facility.uuid,
        scene:scene.id,token:token.id,previousScene,paused,ownerSheet:owner.sheet.constructor.name};
    });
    const errors=[];
    const alice=await join(aliceContext,fixtures.aliceName,page=>page.on("pageerror",e=>errors.push(e.message)),{withCanvas:true,language:"de"});
    await alice.waitForFunction(data=>canvas.ready&&canvas.scene?.id===data.scene&&Boolean(canvas.tokens.get(data.token)),fixtures,{timeout:60000});
    errors.length=0;
    const bob=await join(bobContext,fixtures.bobName);
    await alice.evaluate(async()=>{await ui.sidebar.changeTab("actors","primary");ui.sidebar.expand();await ui.actors.render({force:true});});
    await alice.locator(`[data-entry-id="${fixtures.bastion}"] .entry-name`).click();
    await expect(alice.locator('.bastion-sheet')).toContainText("Nach Besitzer");
    await expect(alice.locator('.bastion-sheet')).toContainText("Gesamtübersicht");
    await expect(alice.locator('.bastion-sheet')).toContainText("Beengt");
    await expect(alice.locator('.bastion-meta').first()).toContainText("Schlafzimmer");
    await alice.locator('.bastion-sheet .bastion-shell').screenshot({path:"test-results/t10-de-canvas.png"});
    expect(await alice.evaluate(data=>({observer:game.actors.get(data.bastion).testUserPermission(game.user,"OBSERVER"),
      owner:game.actors.get(data.bastion).testUserPermission(game.user,"OWNER"),foreign:game.actors.get(data.other).testUserPermission(game.user,"OBSERVER"),
      canvas:canvas.initialized,sheet:game.actors.get(data.owner).sheet.constructor.name}),fixtures)).toEqual({observer:true,owner:false,foreign:false,canvas:true,sheet:fixtures.ownerSheet});
    await alice.evaluate(async data=>{
      try{await game.actors.get(data.bastion).update({name:"Unauthorized"});}catch{}
      try{await (await fromUuid(data.facility)).update({name:"Unauthorized"});}catch{}
      await canvas.scene.tokens.get(data.token).update({x:200,y:100});
    },fixtures);
    expect(await gm.evaluate(async data=>({name:game.actors.get(data.bastion).name,item:(await fromUuid(data.facility)).name,
      x:game.scenes.get(data.scene).tokens.get(data.token).x}),fixtures)).toEqual({name:"Die gemeinsame Bastion",item:"Alriks Schlafzimmer",x:200});
    await bob.evaluate(id=>game.actors.get(id).sheet.render({force:true}),fixtures.bastion);
    await expect(bob.locator('.bastion-sheet')).toContainText("Alriks Schlafzimmer");
    await alice.evaluate(uuid=>game.modules.get("shared-bastion").api.request("removeFacility",uuid,{}),fixtures.facility);
    await gm.evaluate(data=>game.modules.get("shared-bastion").api.repository.configure(game.actors.get(data.bastion),{name:"Die gemeinsame Bastion",participants:[`Actor.${data.other}`]}),fixtures);
    await expect.poll(()=>alice.evaluate(id=>game.actors.get(id).testUserPermission(game.user,"OBSERVER"),fixtures.bastion)).toBe(false);
    expect(errors).toEqual([]);
    console.log("T10 passed: active canvas, linked token, native observer writes denied, private actors, German sheet and permission revocation without cycleTokens error");
  }finally{
    await aliceContext.close().catch(()=>{});await bobContext.close().catch(()=>{});
    if(fixtures&&!gm.isClosed()) await gm.evaluate(async data=>{
      if(data.previousScene&&game.scenes.has(data.previousScene))await game.scenes.get(data.previousScene).activate();
      await game.scenes.get(data.scene)?.delete();for(const id of [data.bastion,data.owner,data.other])await game.actors.get(id)?.delete();
      for(const id of [data.alice,data.bob])await game.users.get(id)?.delete();game.togglePause(data.paused,true);
    },fixtures);
    await gmContext.close();
  }
});

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
    expect(await page.evaluate(()=>({version:game.modules.get("shared-bastion").version,verified:game.modules.get("shared-bastion").compatibility.verified})))
      .toEqual({version:expectedModule.version,verified:expectedModule.compatibility.verified});
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

test("T08: native turns and calendar days settle the shared bastion once across GM reload and failover",async({browser})=>{
  const gmContext=await browser.newContext();const playerContext=await browser.newContext();const secondContext=await browser.newContext();
  let gm=await join(gmContext,"Gamemaster");let fixtures;let second;
  try {
    fixtures=await gm.evaluate(async()=>{
      const prefix="SB T08 ";const api=game.modules.get("shared-bastion").api;
      for(const actor of game.actors.filter(a=>a.flags["shared-bastion"]?.integrationFixture).sort((a,b)=>Number(Boolean(b.flags["shared-bastion"].bastion))-Number(Boolean(a.flags["shared-bastion"].bastion)))) await actor.delete();
      for(const user of game.users.filter(u=>u.name.startsWith(prefix))) await user.delete();
      const original={calendar:game.settings.get("dnd5e","calendarConfig").toObject(),bastion:game.settings.get("dnd5e","bastionConfiguration").toObject(),turns:game.settings.get("dnd5e","bastionTurns"),time:game.time.worldTime};
      await game.settings.set("dnd5e","calendarConfig",{...original.calendar,enabled:false});
      await game.settings.set("dnd5e","bastionConfiguration",{...original.bastion,enabled:true,button:true,duration:7});
      const player=await User.create({name:prefix+"Player",role:CONST.USER_ROLES.PLAYER});
      const second=await User.create({_id:"zzzzzzzzzzzzzzzz",name:prefix+"GM",role:CONST.USER_ROLES.GAMEMASTER},{keepId:true});
      const flags={"shared-bastion":{integrationFixture:true}};
      const character=async(name,gold,ownership={default:0})=>Actor.create({name:prefix+name,type:"character",flags,ownership,system:{currency:{gp:gold}},items:[{name:"Class",type:"class",system:{levels:20,identifier:"fighter"}}]});
      const owner=await character("Owner",1000,{default:0,[player.id]:3});const other=await character("Other",9000);const unrelated=await character("Native Bastion",0);
      const bastion=await api.repository.create({name:prefix+"Bastion",participants:[owner.uuid,other.uuid]});
      await bastion.update({"flags.shared-bastion.integrationFixture":true,"system.currency.gp":7000});
      await bastion.createEmbeddedDocuments("Item",[{name:"Carrier class",type:"class",system:{levels:20,identifier:"fighter"}}]);
      const room=(name,ownerUuid)=>({name,type:"facility",flags:{"shared-bastion":{owner:ownerUuid,revision:0,calendarTime:game.time.worldTime}},system:{type:{value:"basic",subtype:"bedroom"},building:{built:true,size:"cramped"},size:"cramped"}});
      const rooms=await bastion.createEmbeddedDocuments("Item",[room("Building A",owner.uuid),room("Building B",other.uuid),room("Sale A1",owner.uuid),room("Sale A2",owner.uuid),room("Missing result",owner.uuid)]);
      await bastion.updateEmbeddedDocuments("Item",rooms.map((f,index)=>({_id:f.id,"system.progress":{value:0,max:index===4?100: index<2?100:7,order:index<2?"build":index===4?"craft":"trade",paid:true},
        ...(index===2||index===3?{"system.trade.stock":{max:1000,value:100},"system.trade.profit":20,"system.trade.pending":{operation:"sell",value:40,creatures:[],stocked:false}}:{})})));
      const [native]=await unrelated.createEmbeddedDocuments("Item",[room("Native room",owner.uuid)]);
      await native.update({"system.progress":{value:0,max:100,order:"build",paid:true}});
      const recipe=await Item.create({name:prefix+"Recipe",type:"loot",ownership:{default:2},flags,system:{price:{value:10,denomination:"gp"},quantity:1}});
      await rooms[4].update({"system.craft.item":recipe.uuid});
      return {original,bastion:bastion.id,owner:owner.id,other:other.id,unrelated:unrelated.id,native:native.id,rooms:rooms.map(f=>f.id),recipe:recipe.toObject(),player:player.id,playerName:player.name,second:second.id,secondName:second.name};
    });
    const player=await join(playerContext,fixtures.playerName);
    const state=()=>gm.evaluate(data=>{const b=game.actors.get(data.bastion);return {progress:data.rooms.map(id=>b.items.get(id).system.progress.value),
      native:game.actors.get(data.unrelated).items.get(data.native).system.progress.value,gold:game.actors.get(data.owner).system.currency.gp,
      other:game.actors.get(data.other).system.currency.gp,carrier:b.system.currency.gp,count:b.flags["shared-bastion"].turnCount??0,
      issue:b.items.get(data.rooms[4]).flags["shared-bastion"].progressIssue?.code??null,
      rewards:game.actors.get(data.owner).items.filter(i=>i.flags["shared-bastion"]?.resultFrom).length};},fixtures);
    expect(await player.evaluate(async()=>{try{await game.modules.get("shared-bastion").api.advanceTurn();return "allowed";}catch(e){return e.code;}})).toBe("GMOnly");
    await gm.evaluate(id=>game.actors.get(id).sheet.render({force:true}),fixtures.bastion);
    await gm.locator('.bastion-turnbar [data-action="advanceTurn"]').click();
    await gm.locator('dialog [data-action="yes"]').click();
    await expect.poll(state).toMatchObject({progress:[7,7,0,0,7],native:0,gold:1096,count:1,other:9000,carrier:7000});
    await gm.evaluate(()=>game.dnd5e.bastion.advanceAllBastions());
    expect(await state()).toMatchObject({progress:[14,14,0,0,14],native:7,gold:1096,count:2});
    expect(await gm.evaluate(id=>game.messages.some(m=>m.type==="bastionTurn"&&m.speaker.actor===id),fixtures.bastion)).toBe(false);
    await gm.evaluate(async()=>{const setting=game.settings.get("dnd5e","calendarConfig").toObject();await game.settings.set("dnd5e","calendarConfig",{...setting,enabled:true});});
    await expect.poll(()=>gm.evaluate(id=>game.actors.get(id).flags["shared-bastion"].calendarMode,fixtures.bastion)).toBe(true);
    const advance=days=>gm.evaluate(days=>{const d=game.time.calendar.days;return game.time.advance(days*d.hoursPerDay*d.minutesPerHour*d.secondsPerMinute);},days);
    await advance(3);
    await expect.poll(state).toMatchObject({progress:[17,17,0,0,17],native:10,gold:1096});
    // Repeated event, reversed clock and a return to an already processed date add no days.
    await gm.evaluate(()=>Hooks.callAll("updateWorldTime",game.time.worldTime,86400,{},game.user.id));
    await advance(-2);await advance(2);
    await expect.poll(state).toMatchObject({progress:[17,17,0,0,17],gold:1096});
    await gm.evaluate(async data=>{
      const b=game.actors.get(data.bastion);await b.items.get(data.rooms[1]).update({"system.disabled":true});
      await b.items.get(data.rooms[4]).update({"system.progress.max":18});await game.items.get(data.recipe._id).delete();
    },fixtures);
    await advance(1);
    await expect.poll(state).toMatchObject({progress:[18,17,0,0,17],issue:"OperationSourceUnavailable",gold:1096});
    await gm.evaluate(()=>game.dnd5e.bastion.advanceAllBastions());
    expect(await state()).toMatchObject({progress:[18,17,0,0,17],count:3,gold:1096});
    await expect(gm.locator('.bastion-turnbar [data-action="retryCalendar"]')).toBeVisible();
    await gm.locator('.bastion-sheet .bastion-shell').screenshot({path:"test-results/t08-calendar.png"});
    await gm.evaluate(data=>Item.create(data,{keepId:true}),fixtures.recipe);
    await expect.poll(state,{timeout:15000}).toMatchObject({issue:null,rewards:1,progress:[18,17,0,0,0]});
    await gm.reload();await gm.waitForFunction(()=>game.ready===true);
    expect(await state()).toMatchObject({gold:1096,rewards:1,progress:[18,17,0,0,0]});
    second=await join(secondContext,fixtures.secondName);
    await expect.poll(()=>gm.evaluate(()=>game.modules.get("shared-bastion").api.repository.bus.isExecutor)).toBe(true);
    await gmContext.close();gm=second;
    await expect.poll(()=>gm.evaluate(()=>game.modules.get("shared-bastion").api.repository.bus.isExecutor)).toBe(true);
    await advance(1);
    await expect.poll(state).toMatchObject({gold:1096,rewards:1,progress:[19,18,0,0,0]});
    console.log("T08 passed",JSON.stringify(await state()));
  } finally {
    await playerContext.close().catch(()=>{});
    if(fixtures&&!gm.isClosed()) await gm.evaluate(async data=>{
      for(const id of [data.bastion,data.owner,data.other,data.unrelated]) await game.actors.get(id)?.delete();
      await game.items.get(data.recipe._id)?.delete();
      await game.settings.set("dnd5e","calendarConfig",data.original.calendar);await game.settings.set("dnd5e","bastionConfiguration",data.original.bastion);
      await game.settings.set("dnd5e","bastionTurns",data.original.turns);await game.time.advance(data.original.time-game.time.worldTime);
      await game.users.get(data.player)?.delete();
      if(game.user.id!==data.second) await game.users.get(data.second)?.delete();
    },fixtures);
    await gmContext.close().catch(()=>{});await secondContext.close().catch(()=>{});
  }
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

test("T09: reviewed transfers keep backups, preserve progress and resume without active duplicates",async({browser})=>{
  const gmContext=await browser.newContext();const playerContext=await browser.newContext();
  const gm=await join(gmContext,"Gamemaster");let fixtures;
  try {
    fixtures=await gm.evaluate(async()=>{
      const prefix="SB T09 ";const api=game.modules.get("shared-bastion").api;
      for(const actor of game.actors.filter(a=>a.flags["shared-bastion"]?.integrationFixture).sort((a,b)=>Number(Boolean(b.flags["shared-bastion"].bastion))-Number(Boolean(a.flags["shared-bastion"].bastion)))) await actor.delete();
      for(const user of game.users.filter(u=>u.name.startsWith(prefix))) await user.delete();
      const flags={"shared-bastion":{integrationFixture:true}};
      const player=await User.create({name:prefix+"Player",role:CONST.USER_ROLES.PLAYER});
      const owner=await Actor.create({name:prefix+"Owner",type:"character",flags,ownership:{default:0,[player.id]:3},system:{currency:{gp:1000}},items:[{name:"Class",type:"class",system:{levels:13,identifier:"fighter"}}]});
      const other=await Actor.create({name:prefix+"Other",type:"character",flags,ownership:{default:0},system:{currency:{gp:9000}},items:[{name:"Class",type:"class",system:{levels:13,identifier:"fighter"}}]});
      const npc=await Actor.create({name:prefix+"Hireling",type:"npc",flags,ownership:{default:2}});
      const recipe=await Item.create({name:prefix+"Recipe",type:"loot",flags,ownership:{default:2},system:{price:{value:10,denomination:"gp"},quantity:1}});
      const create=(actor,name,subtype,order)=>actor.createEmbeddedDocuments("Item",[{name:prefix+name,type:"facility",system:{type:{value:subtype==="bedroom"?"basic":"special",subtype},size:"cramped",order,building:{built:true,size:"cramped"}}}]).then(items=>items[0]);
      const workshop=await create(owner,"Workshop","workshop","craft");const bedroom=await create(owner,"Bedroom","bedroom","");const garden=await create(other,"Garden","garden","harvest");
      const [privateRecipe]=await owner.createEmbeddedDocuments("Item",[{name:prefix+"Private Recipe",type:"loot",system:{price:{value:10,denomination:"gp"},quantity:1}}]);
      await workshop.update({"system.progress":{value:3,max:10,order:"craft",paid:true},"system.craft":{item:privateRecipe.uuid,quantity:1},"system.hirelings":{max:1,value:[npc.uuid]},"system.description.value":`@UUID[${bedroom.uuid}]{Bedroom}`});
      await bedroom.update({"system.building.built":false,"system.progress":{value:5,max:20,order:"build",paid:true}});
      await garden.update({"system.progress":{value:2,max:7,order:"harvest",paid:true},"system.craft":{item:recipe.uuid,quantity:2}});
      const bastion=await api.repository.create({name:prefix+"Bastion",participants:[owner.uuid,other.uuid]});await bastion.setFlag("shared-bastion","integrationFixture",true);
      return {bastion:bastion.id,owner:owner.id,other:other.id,npc:npc.id,recipe:recipe.id,player:player.id,playerName:player.name,sourceUuids:[workshop.uuid,bedroom.uuid,garden.uuid]};
    });
    const player=await join(playerContext,fixtures.playerName);
    const preview=()=>gm.evaluate(()=>game.modules.get("shared-bastion").api.transferPreview());
    const payload=preview=>preview.sources.map(({uuid,digest})=>({uuid,digest}));
    const attempt=(action,data)=>gm.evaluate(async({action,data})=>{try{await game.modules.get("shared-bastion").api.request(action,game.modules.get("shared-bastion").api.repository.find().uuid,data);return "ok";}catch(e){return e.code;}},{action,data});
    const counts=()=>gm.evaluate(data=>{const b=game.actors.get(data.bastion);return {sources:[data.owner,data.other].map(id=>game.actors.get(id).itemTypes.facility.length),
      pending:b.itemTypes.facility.filter(i=>i.flags["shared-bastion"]?.transferPending).length,active:b.itemTypes.facility.filter(i=>!i.flags["shared-bastion"]?.transferPending).length,
      gold:[data.owner,data.other].map(id=>game.actors.get(id).system.currency.gp)};},fixtures);
    let review=await preview();expect(review.sources).toHaveLength(3);
    await gm.evaluate(async uuid=>(await fromUuid(uuid)).update({name:"Changed since review"}),fixtures.sourceUuids[0]);
    expect(await attempt("stageTransfer",{sources:payload(review)})).toBe("TransferChanged");expect(await counts()).toMatchObject({sources:[2,1],pending:0,active:0});
    review=await preview();
    await gm.evaluate(()=>{globalThis.sbTransferVeto=Hooks.on("preCreateItem",item=>{if(item.parent===game.modules.get("shared-bastion").api.repository.find())return false;});});
    expect(await attempt("stageTransfer",{sources:payload(review)})).toBe("CommitFailed");
    await gm.evaluate(()=>Hooks.off("preCreateItem",globalThis.sbTransferVeto));
    expect((await preview()).pending).toHaveLength(0);expect(await counts()).toMatchObject({sources:[2,1],pending:0});
    expect(await attempt("stageTransfer",{sources:payload(await preview())})).toBe("ok");
    let pending=(await preview()).pending;expect(pending).toHaveLength(3);expect(pending.every(p=>p.ready)).toBe(true);
    expect(await counts()).toMatchObject({sources:[2,1],pending:3,active:0,gold:[1000,9000]});
    expect(await player.evaluate(async records=>{try{await game.modules.get("shared-bastion").api.request("finishTransfer",game.modules.get("shared-bastion").api.repository.find().uuid,{records});return "allowed";}catch(e){return e.code;}},pending.map(p=>p.id))).toBe("GMOnly");
    expect(await player.evaluate(()=>game.journal.get("SharedBastionLog")?.testUserPermission(game.user,"OBSERVER")??false)).toBe(false);
    await gm.evaluate(()=>game.modules.get("shared-bastion").api.advanceTurn());
    expect((await preview()).pending.every(p=>p.ready)).toBe(true);
    await gm.evaluate(async uuid=>(await fromUuid(uuid)).update({"system.progress.value":4}),fixtures.sourceUuids[0]);
    expect(await attempt("finishTransfer",{records:pending.map(p=>p.id)})).toBe("TransferChanged");
    expect(await counts()).toMatchObject({sources:[2,1],pending:3,active:0});
    expect(await attempt("discardTransfer",{records:pending.map(p=>p.id)})).toBe("ok");
    expect(await counts()).toMatchObject({sources:[2,1],pending:0,active:0});
    expect(await attempt("stageTransfer",{sources:payload(await preview())})).toBe("ok");
    pending=(await preview()).pending;
    await gm.evaluate(()=>{globalThis.sbTransferVeto=Hooks.on("preDeleteItem",item=>{if(item.parent?.name.startsWith("SB T09 ")&&!item.parent.flags["shared-bastion"]?.bastion)return false;});});
    expect(await attempt("finishTransfer",{records:pending.map(p=>p.id)})).toBe("CommitFailed");
    await gm.evaluate(()=>Hooks.off("preDeleteItem",globalThis.sbTransferVeto));
    expect(await counts()).toMatchObject({sources:[2,1],pending:3,active:0});
    await gm.reload();await gm.waitForFunction(()=>game.ready===true);
    expect((await preview()).pending.every(p=>p.ready)).toBe(true);
    await gm.evaluate(id=>game.actors.get(id).sheet.render({force:true}),fixtures.bastion);
    await gm.locator('[data-action="transferFacilities"]').click();
    await expect(gm.locator('dialog [data-action="finish"]')).toBeVisible();
    await gm.locator('dialog').screenshot({path:"test-results/t09-transfer.png"});
    await gm.locator('dialog [data-action="finish"]').click();
    await expect.poll(counts).toMatchObject({sources:[0,0],pending:0,active:3,gold:[1000,9000]});
    const transferred=await gm.evaluate(data=>{
      const b=game.actors.get(data.bastion);const find=uuid=>b.itemTypes.facility.find(i=>i.flags["shared-bastion"].source===uuid);
      const [workshop,bedroom,garden]=data.sourceUuids.map(find);
      const records=game.journal.get("SharedBastionLog").pages.filter(p=>{const r=p.flags["shared-bastion"]?.transfer;return r?.bastion===b.uuid&&r.bastionCreated===b._stats.createdTime;}).map(p=>p.flags["shared-bastion"].transfer);
      return {progress:[workshop,bedroom,garden].map(i=>({...i.system.progress})),built:bedroom.system.building.built,
        hirelings:workshop.system.hirelings.value,link:workshop.system.description.value,target:bedroom.uuid,
        backups:records.length,done:records.filter(r=>r.status==="done").length,backupProgress:records.filter(r=>r.status==="done").map(r=>r.source.system.progress.value).sort()};
    },fixtures);
    expect(transferred.progress.map(p=>p.value)).toEqual([4,5,2]);expect(transferred.progress.every(p=>p.paid)).toBe(true);
    expect(transferred.built).toBe(false);expect(transferred.hirelings).toEqual([`Actor.${fixtures.npc}`]);expect(transferred.link).toContain(transferred.target);
    expect(transferred).toMatchObject({backups:6,done:3,backupProgress:[2,4,5]});
    expect(await attempt("finishTransfer",{records:pending.map(p=>p.id)})).toBe("ok");expect(await counts()).toMatchObject({active:3,pending:0,sources:[0,0]});
    await gm.evaluate(()=>game.modules.get("shared-bastion").api.advanceTurn());
    expect(await gm.evaluate(data=>[data.owner,data.other].map(id=>game.actors.get(id).items.filter(i=>i.flags["shared-bastion"]?.resultFrom).map(i=>i.system.quantity)),fixtures)).toEqual([[1],[2]]);
    expect((await preview()).sources).toHaveLength(0);
    await gm.evaluate(async data=>{
      const [room]=await game.actors.get(data.other).createEmbeddedDocuments("Item",[{name:"SB T09 Additional room",type:"facility",system:{type:{value:"basic",subtype:"bedroom"},size:"cramped"}}]);
      await room.update({"system.building.built":false,"system.progress":{value:1,max:20,order:"build",paid:true}});
    },fixtures);
    await gm.locator('[data-action="transferFacilities"]').click();
    await expect(gm.locator('dialog [name="source-0"]')).toBeChecked();
    await gm.locator('dialog [data-action="stage"]').click();
    await expect.poll(counts).toMatchObject({sources:[0,0],pending:0,active:4,gold:[1000,9000]});
    console.log("T09 passed",JSON.stringify({transferred,counts:await counts()}));
  }finally{
    await playerContext.close().catch(()=>{});
    if(fixtures&&!gm.isClosed()) await gm.evaluate(async data=>{for(const id of [data.bastion,data.owner,data.other,data.npc])await game.actors.get(id)?.delete();await game.items.get(data.recipe)?.delete();await game.users.get(data.player)?.delete();},fixtures);
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
    const first=await add(bob,fixtures.bobUuid,fixtures.special);expect(first.ok).toBe(true);
    expect((await add(bob,fixtures.bobUuid,fixtures.special)).code).toBe("DuplicateFacility");
    expect((await attempt(gm,"setTemplateRules",`Actor.${fixtures.bastion}`,{template:fixtures.special,level:9,order:"",hirelings:0,defenders:0,requirements:["tool:smith"],exceptions:[],repeatable:true})).ok).toBe(true);
    const specials=[first.result.uuid];
    for(let i=1;i<5;i++){const result=await add(bob,fixtures.bobUuid,fixtures.special);expect(result.ok).toBe(true);specials.push(result.result.uuid);}
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

test("T07: native orders settle owner costs, goods and income once",async({browser})=>{
  const gmContext=await browser.newContext();const aliceContext=await browser.newContext();const bobContext=await browser.newContext();
  const gm=await join(gmContext,"Gamemaster");let fixtures;
  try {
    fixtures=await gm.evaluate(async()=>{
      const prefix="SB T07 ";
      for(const actor of game.actors.filter(a=>a.flags["shared-bastion"]?.integrationFixture).sort((a,b)=>Number(Boolean(b.flags["shared-bastion"].bastion))-Number(Boolean(a.flags["shared-bastion"].bastion)))) await actor.delete();
      for(const item of game.items.filter(i=>i.flags["shared-bastion"]?.integrationFixture)) await item.delete();
      for(const user of game.users.filter(u=>u.name.startsWith(prefix))) await user.delete();
      const alice=await User.create({name:prefix+"Alice",role:CONST.USER_ROLES.PLAYER});const bob=await User.create({name:prefix+"Bob",role:CONST.USER_ROLES.PLAYER});
      const flag={"shared-bastion":{integrationFixture:true}};
      const owner=await Actor.create({name:prefix+"Owner",type:"character",ownership:{default:0,[alice.id]:3},flags:flag,system:{currency:{gp:2000}},items:[{name:"Class",type:"class",system:{levels:13,identifier:"fighter"}}]});
      const other=await Actor.create({name:prefix+"Other",type:"character",ownership:{default:0,[bob.id]:3},flags:flag,system:{currency:{gp:9000}},items:[{name:"Class",type:"class",system:{levels:13,identifier:"fighter"}}]});
      await alice.update({character:owner.id});await bob.update({character:other.id});
      const bastion=await game.modules.get("shared-bastion").api.repository.create({name:prefix+"Bastion",participants:[owner.uuid,other.uuid]});
      await bastion.setFlag("shared-bastion","integrationFixture",true);await bastion.update({"system.currency.gp":7000});
      const recipe=await Item.create({name:prefix+"Crafted Tool",type:"loot",ownership:{default:2},flags:flag,system:{price:{value:100,denomination:"gp"},quantity:1}});
      const npc=await Actor.create({name:prefix+"Hireling",type:"npc",ownership:{default:2},flags:flag,system:{attributes:{price:{value:10,denomination:"gp"}}}});
      const definitions=[
        ["Bedroom","basic","bedroom","",{}],["Workshop","special","workshop","craft",{hirelings:{max:2},defenders:{max:1}}],
        ["Garden","special","garden","harvest",{}],["Storehouse","special","storehouse","trade",{trade:{stock:{max:1000},profit:20}}],
        ["Menagerie","special","menagerie","trade",{trade:{creatures:{max:2},profit:20}}],
        ["Armory","special","armory","empower",{enlargeable:true}]
      ];
      const facilities=await bastion.createEmbeddedDocuments("Item",definitions.map(([name,type,subtype,order,extras])=>({name:prefix+name,type:"facility",flags:{"shared-bastion":{owner:owner.uuid,revision:0}},
        system:{type:{value:type,subtype},order,size:"cramped",building:{built:true,size:"cramped"},...extras}})));
      const ids=Object.fromEntries(facilities.map(f=>[f.name.slice(prefix.length).toLowerCase(),f.uuid]));
      const craftCost=await recipe.system.getCraftCost({baseItem:"craft"});
      return {...ids,owner:owner.id,other:other.id,bastion:bastion.id,alice:alice.id,bob:bob.id,aliceName:alice.name,bobName:bob.name,recipe:recipe.uuid,recipeId:recipe.id,npc:npc.uuid,npcId:npc.id,craftCost};
    });
    const alice=await join(aliceContext,fixtures.aliceName);const bob=await join(bobContext,fixtures.bobName);
    const attempt=(page,action,uuid,payload)=>page.evaluate(async({action,uuid,payload})=>{
      try{return {ok:true,result:await game.modules.get("shared-bastion").api.request(action,uuid,payload)};}catch(error){return {ok:false,code:error.code};}
    },{action,uuid,payload});
    const order=(uuid,kind,options={})=>attempt(alice,"order",uuid,{order:kind,options});
    const advance=(uuid,days)=>attempt(gm,"advance",uuid,{days});
    const gold=()=>gm.evaluate(id=>game.actors.get(id).system.currency.gp,fixtures.owner);
    const state=uuid=>gm.evaluate(async uuid=>{const f=await fromUuid(uuid);return {size:f.system.size,progress:foundry.utils.deepClone(f.system.progress),trade:foundry.utils.deepClone(f.system.trade)};},uuid);
    expect((await attempt(bob,"order",fixtures.workshop,{order:"craft",options:{item:fixtures.recipe,buyBaseItem:false}})).code).toBe("NotOwner");
    expect((await attempt(alice,"setOccupants",fixtures.workshop,{role:"hirelings",actors:[fixtures.npc,fixtures.npc,fixtures.npc]})).code).toBe("OccupantCapacity");
    await alice.evaluate(id=>game.actors.get(id).sheet.render({force:true}),fixtures.bastion);
    const workshopId=fixtures.workshop.split(".").at(-1);
    await alice.locator(`[data-facility-id="${workshopId}"] [data-action="setOccupants"][data-role="hirelings"]`).click();
    await alice.locator('dialog [name="occupant-0"]').evaluate((element,uuid)=>{
      const transfer=new DataTransfer();transfer.setData("text/plain",JSON.stringify({type:"Actor",uuid}));
      element.dispatchEvent(new DragEvent("drop",{bubbles:true,cancelable:true,dataTransfer:transfer}));
    },fixtures.npc);
    await expect.poll(()=>alice.locator('dialog [name="occupant-0"]').evaluate(element=>element.value)).toBe(fixtures.npc);
    await alice.locator('dialog [data-action="save"]').click();
    await expect.poll(()=>gm.evaluate(async uuid=>(await fromUuid(uuid)).system.hirelings.value,fixtures.workshop)).toEqual([fixtures.npc]);
    expect((await attempt(alice,"setOccupants",fixtures.workshop,{role:"hirelings",actors:[fixtures.npc,fixtures.npc]})).ok).toBe(true);
    expect((await attempt(alice,"setOccupants",fixtures.workshop,{role:"defenders",actors:[fixtures.npc]})).ok).toBe(true);
    await alice.locator(`[data-facility-id="${workshopId}"] [data-action="issueOrder"][data-order="craft"]`).click();
    await alice.locator('.activity-usage [name="craft.item"]').evaluate((element,uuid)=>{
      const transfer=new DataTransfer();transfer.setData("text/plain",JSON.stringify({type:"Item",uuid}));
      element.dispatchEvent(new DragEvent("drop",{bubbles:true,cancelable:true,dataTransfer:transfer}));
    },fixtures.recipe);
    await expect(alice.locator('.activity-usage [name="costs.gold"]')).toHaveValue(String(fixtures.craftCost.gold));
    await alice.locator(".activity-usage").screenshot({path:"test-results/t07-native-craft.png"});
    await alice.locator('.activity-usage [data-action="use"]').click();
    await expect.poll(async()=> (await state(fixtures.workshop)).progress.max).toBe(fixtures.craftCost.days);
    expect(await gold()).toBe(2000-fixtures.craftCost.gold);
    expect((await order(fixtures.workshop,"craft",{item:fixtures.recipe,buyBaseItem:false})).code).toBe("OrderInProgress");
    expect((await advance(fixtures.workshop,fixtures.craftCost.days)).ok).toBe(true);
    const rewards=()=>gm.evaluate(id=>game.actors.get(id).items.filter(i=>i.flags["shared-bastion"]?.resultFrom).map(i=>({from:i.flags["shared-bastion"].resultFrom,quantity:i.system.quantity})),fixtures.owner);
    expect(await rewards()).toEqual([{from:fixtures.workshop,quantity:1}]);
    const replay=uuid=>gm.evaluate(uuid=>{
      const message=[...game.messages].reverse().find(m=>m.flags["shared-bastion"]?.request?.action==="advance"&&m.flags["shared-bastion"].request.facility===uuid);
      Hooks.callAll("createChatMessage",message,{},message.author.id);
    },uuid);
    await replay(fixtures.workshop);
    expect(await rewards()).toHaveLength(1);
    expect((await order(fixtures.garden,"harvest",{item:fixtures.recipe,quantity:3})).ok).toBe(true);
    await gm.evaluate(({owner,garden})=>{globalThis.sbT07Veto=Hooks.on("preCreateItem",item=>item.parent?.id===owner&&item.flags["shared-bastion"]?.resultFrom===garden?false:undefined);},fixtures);
    expect((await advance(fixtures.garden,7)).code).toBe("CommitFailed");
    expect((await state(fixtures.garden)).progress.max).toBe(7);expect(await rewards()).toHaveLength(1);
    await gm.evaluate(()=>Hooks.off("preCreateItem",globalThis.sbT07Veto));
    expect((await advance(fixtures.garden,7)).ok).toBe(true);
    expect(await rewards()).toHaveLength(2);expect((await rewards()).find(r=>r.from===fixtures.garden).quantity).toBe(3);
    const storehouseId=fixtures.storehouse.split(".").at(-1);
    await alice.locator(`[data-facility-id="${storehouseId}"] [data-action="issueOrder"][data-order="trade"]`).click();
    await alice.locator('.activity-usage [name="trade.stock.value"] input[type="number"]').fill("100");
    await alice.locator('.activity-usage [name="trade.stock.value"] input[type="number"]').press("Tab");
    await expect(alice.locator('.activity-usage [name="costs.gold"]')).toHaveValue("100");
    await alice.locator('.activity-usage [data-action="use"]').click();
    await expect.poll(async()=> (await state(fixtures.storehouse)).progress.max).toBe(7);
    expect((await advance(fixtures.storehouse,7)).ok).toBe(true);
    expect((await state(fixtures.storehouse)).trade.stock.value).toBe(100);
    const beforeSale=await gold();
    expect((await order(fixtures.storehouse,"trade",{mode:"stock",sell:true,value:40})).ok).toBe(true);
    expect((await advance(fixtures.storehouse,7)).ok).toBe(true);
    expect(await gold()).toBe(beforeSale+48);expect((await state(fixtures.storehouse)).trade.stock.value).toBe(60);
    await replay(fixtures.storehouse);expect(await gold()).toBe(beforeSale+48);
    expect((await order(fixtures.menagerie,"trade",{mode:"creatures",sell:false,actors:[fixtures.npc]})).ok).toBe(true);
    expect((await advance(fixtures.menagerie,7)).ok).toBe(true);
    expect((await state(fixtures.menagerie)).trade.creatures.value).toEqual([fixtures.npc]);
    expect((await order(fixtures.menagerie,"trade",{mode:"creatures",sell:true,indices:[0]})).ok).toBe(true);
    expect((await attempt(alice,"cancelOrder",fixtures.menagerie,{})).ok).toBe(true);
    expect((await state(fixtures.menagerie)).trade.creatures.value).toEqual([fixtures.npc]);
    expect((await order(fixtures.menagerie,"trade",{mode:"creatures",sell:true,indices:[0]})).ok).toBe(true);
    expect((await advance(fixtures.menagerie,7)).ok).toBe(true);
    // The native dialog configures enlargement but performs no world writes itself.
    await alice.evaluate(id=>game.actors.get(id).sheet.render({force:true}),fixtures.bastion);
    const bedroomId=fixtures.bedroom.split(".").at(-1);
    const button=alice.locator(`[data-facility-id="${bedroomId}"] [data-action="issueOrder"][data-order="enlarge"]`);
    const beforeDialog=await gold();
    await button.click();await expect(alice.locator('.activity-usage [name="costs.gold"]')).toHaveAttribute("readonly","");
    await alice.locator('.activity-usage .window-header [data-action="close"]').click();expect(await gold()).toBe(beforeDialog);
    await button.click();
    await alice.locator('.activity-usage [name="costs.gold"]').evaluate(input=>{input.value="0";input.dispatchEvent(new Event("change",{bubbles:true}));});
    await alice.locator('.activity-usage [data-action="use"]').click();
    await expect.poll(async()=> (await state(fixtures.bedroom)).progress.max).toBe(25);
    expect(await gold()).toBe(beforeDialog-500);
    expect((await advance(fixtures.bedroom,25)).ok).toBe(true);expect((await state(fixtures.bedroom)).size).toBe("roomy");
    expect((await order(fixtures.armory,"enlarge")).ok).toBe(true);expect((await state(fixtures.armory)).size).toBe("roomy");
    expect(await gold()).toBe(950-fixtures.craftCost.gold);
    for(const kind of ["research","recruit","maintain"]) {
      expect((await attempt(gm,"setFacilityRules",fixtures.workshop,{level:5,order:kind,hirelings:2,defenders:1,requirements:[],exceptions:[]})).ok).toBe(true);
      expect((await order(fixtures.workshop,kind)).ok).toBe(true);
      expect((await advance(fixtures.workshop,7)).ok).toBe(true);
    }
    expect((await order(fixtures.armory,"empower")).ok).toBe(true);expect((await advance(fixtures.armory,7)).ok).toBe(true);
    expect((await order(fixtures.garden,"change")).ok).toBe(true);expect((await advance(fixtures.garden,21)).ok).toBe(true);
    const identifier=await gm.evaluate(id=>game.actors.get(id).items.find(item=>item.flags["shared-bastion"]?.resultFrom).identifier,fixtures.owner);
    expect((await attempt(gm,"setFacilityRules",fixtures.armory,{level:5,order:"empower",hirelings:0,defenders:0,requirements:[`item:${identifier}`],exceptions:[]})).ok).toBe(true);
    expect((await order(fixtures.armory,"empower")).ok).toBe(true);expect((await advance(fixtures.armory,7)).ok).toBe(true);
    await alice.evaluate(id=>game.actors.get(id).sheet.render({force:true}),fixtures.bastion);
    await expect(alice.locator(".bastion-result").first()).toContainText("Last completed:");
    await alice.locator(".bastion-sheet .bastion-shell").screenshot({path:"test-results/t07-operations.png"});
    await gm.reload();await gm.waitForFunction(()=>game.ready===true);await replay(fixtures.workshop);
    expect(await rewards()).toHaveLength(2);expect(await gold()).toBe(950-fixtures.craftCost.gold);
    expect(await gm.evaluate(data=>({other:game.actors.get(data.other).system.currency.gp,carrier:game.actors.get(data.bastion).system.currency.gp}),fixtures)).toEqual({other:9000,carrier:7000});
    console.log("T07 passed",JSON.stringify({craftCost:fixtures.craftCost,gold:await gold(),rewards:await rewards(),nativeDialog:true}));
  } finally {
    await aliceContext.close().catch(()=>{});await bobContext.close().catch(()=>{});
    if(fixtures&&!gm.isClosed()) await gm.evaluate(async data=>{
      await game.actors.get(data.bastion)?.delete();for(const id of [data.owner,data.other,data.npcId]) await game.actors.get(id)?.delete();
      await game.items.get(data.recipeId)?.delete();for(const id of [data.alice,data.bob]) await game.users.get(id)?.delete();
    },fixtures);
    await gmContext.close();
  }
});
