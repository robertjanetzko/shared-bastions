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

test("bastion configuration only accepts bounded names and distinct world-character references", () => {
  const request={...command(),action:"createBastion",facility:"Actor.SharedBastion001",payload:{name:"Shared",participants:["Actor.alice"]}};
  assert.equal(validateRequest(request),request);
  for(const payload of [{name:"",participants:[]},{name:"x".repeat(121),participants:[]},
    {name:"Shared",participants:["Actor.alice","Actor.alice"]},{name:"Shared",participants:["Compendium.private.alice"]},
    {name:"Shared",participants:[],ownership:{default:3}}]) {
    assert.throws(()=>validateRequest({...request,payload}),{code:"InvalidRequest"});
  }
});

test("facility commands reject rule patches, client currency and unreasoned exceptions",()=>{
  const add={...command(),action:"addFacility",facility:"Actor.central",payload:{owner:"Actor.alice",template:"Item.template",exceptions:[]}};
  assert.equal(validateRequest(add),add);
  for(const payload of [{...add.payload,gold:0},{...add.payload,exceptions:[{scope:"level",reason:""}]},
    {...add.payload,exceptions:[{scope:"level",reason:"Table"},{scope:"level",reason:"Again"}]},
    {...add.payload,template:"Actor.private.Item.secret"}]) assert.throws(()=>validateRequest({...add,payload}));
  const edit={...command(),action:"editFacility",payload:{name:"My Room",notes:"Note"}};
  assert.equal(validateRequest(edit),edit);
  assert.throws(()=>validateRequest({...edit,payload:{...edit.payload,level:1}}),{code:"InvalidRequest"});
});
