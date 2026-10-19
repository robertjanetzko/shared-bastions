import test from "node:test";
import assert from "node:assert/strict";
import { validateOperationPayload } from "../scripts/services/operations.mjs";

test("orders cannot carry client prices, actor patches or arbitrary recipes",()=>{
  const recipe={order:"craft",options:{item:"Item.recipe",buyBaseItem:false}};
  validateOperationPayload("order",recipe);
  for(const payload of [{...recipe,gold:0},{...recipe,options:{...recipe.options,gold:0}},
    {...recipe,options:{...recipe.options,item:"Actor.private.Item.secret"}},
    {order:"harvest",options:{item:"Item.recipe",quantity:Infinity}},
    {order:"advance",options:{days:365}}, {order:"enlarge",options:{size:"vast"}}]) {
    assert.throws(()=>validateOperationPayload("order",payload),{code:"InvalidRequest"});
  }
});

test("trades and staffing reject duplicate sale indices, invalid references and capacity overflow inputs",()=>{
  validateOperationPayload("order",{order:"trade",options:{mode:"creatures",sell:true,indices:[0,1]}});
  validateOperationPayload("setOccupants",{role:"hirelings",actors:["Actor.npc"]});
  for(const options of [{mode:"creatures",sell:true,indices:[0,0]},{mode:"stock",sell:false,value:-1},
    {mode:"stock",sell:true,value:1.5},{mode:"creatures",sell:false,actors:["Item.fake"]}]) {
    assert.throws(()=>validateOperationPayload("order",{order:"trade",options}),{code:"InvalidRequest"});
  }
  assert.throws(()=>validateOperationPayload("setOccupants",{role:"owners",actors:["Actor.npc"]}),{code:"InvalidRequest"});
  assert.throws(()=>validateOperationPayload("cancelOrder",{refund:1000}),{code:"InvalidRequest"});
});
