import test from "node:test";
import assert from "node:assert/strict";
import {validateRequest} from "../scripts/services/commands.mjs";
import {mapTransferReferences,transferDigest,transferContent} from "../scripts/core/transfer.mjs";
import {OrderAdapter} from "../scripts/adapters/orders.mjs";

test("transfers accept distinct facility references and reviewed fingerprints, never client item data",()=>{
  const r={v:1,nonce:"1234567890abcdef",revision:0,action:"stageTransfer",facility:"Actor.bastion",payload:{sources:[{uuid:"Actor.owner.Item.room",digest:"a".repeat(64)}]}};
  validateRequest(r);
  for(const sources of [[],[...r.payload.sources,...r.payload.sources],[{uuid:"Item.room",digest:"a".repeat(64)}],[{...r.payload.sources[0],data:{name:"forged"}}]]) {
    assert.throws(()=>validateRequest({...r,payload:{sources}}),{code:"InvalidRequest"});
  }
  validateRequest({...r,action:"finishTransfer",payload:{records:["1234567890abcdef"]}});
  assert.throws(()=>validateRequest({...r,action:"discardTransfer",payload:{records:["1234567890abcdef","1234567890abcdef"]}}),{code:"InvalidRequest"});
});

test("transfer mapping rewrites facility descendants and links while retaining other character references",()=>{
  const mapping=new Map([["Actor.owner.Item.room","Actor.bastion.Item.newroom"]]);
  const data={origin:"Actor.owner.Item.room.ActiveEffect.effect",text:"@UUID[Actor.owner.Item.room]{Room}",
    recipe:"Actor.owner.Item.recipe",similar:"Actor.owner.Item.roommate",owner:"Actor.owner"};
  assert.deepEqual(mapTransferReferences(data,mapping),{...data,origin:"Actor.bastion.Item.newroom.ActiveEffect.effect",text:"@UUID[Actor.bastion.Item.newroom]{Room}"});
  assert.equal(data.origin,"Actor.owner.Item.room.ActiveEffect.effect");
});

test("transfer verification ignores only native identity/statistics and detects changed progress or occupants",async()=>{
  const source={_id:"old",_stats:{modifiedTime:1},system:{progress:{value:3},hirelings:{value:["Actor.npc"]}},flags:{}};
  const reordered={flags:{},system:{hirelings:{value:["Actor.npc"]},progress:{value:3}},_stats:{modifiedTime:2},_id:"new"};
  assert.equal(await transferDigest(transferContent(source)),await transferDigest(transferContent(reordered)));
  assert.notEqual(await transferDigest(source),await transferDigest(reordered));
  reordered.system.progress.value=4;
  assert.notEqual(await transferDigest(transferContent(source)),await transferDigest(transferContent(reordered)));
});

test("existing native reward references may use only their actual owner's inventory",async()=>{
  const owner={id:"owner"};const foreign={id:"foreign"};
  const source={parent:owner,system:{price:{value:10},quantity:1},testUserPermission:()=>true};
  const adapter=new OrderAdapter({resolveUuid:async()=>source,game:{users:[{isGM:false}]}});
  assert.equal(await adapter.source("Actor.owner.Item.recipe",{isGM:true},{resultOwner:owner}),source);
  await assert.rejects(adapter.source("Actor.owner.Item.recipe",{isGM:true},{resultOwner:foreign}),{code:"OperationSourceUnavailable"});
  await assert.rejects(adapter.source("Actor.owner.Item.recipe",{isGM:true}),{code:"OperationSourceUnavailable"});
});
