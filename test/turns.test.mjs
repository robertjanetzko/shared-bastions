import test from "node:test";
import assert from "node:assert/strict";
import { validateRequest } from "../scripts/services/commands.mjs";
import { CalendarAdapter } from "../scripts/adapters/calendar.mjs";

test("turn requests accept no client duration, currency, item patches or future overflow",()=>{
  const request={v:1,nonce:"1234567890abcdef",action:"advanceTurn",facility:"Actor.bastion",revision:0,payload:{}};
  validateRequest(request);
  validateRequest({...request,action:"calendarAdvance",payload:{until:123,retry:false}});
  for(const payload of [{days:7},{gold:100},{ready:true}]) assert.throws(()=>validateRequest({...request,payload}),{code:"InvalidRequest"});
  for(const payload of [{until:Infinity,retry:false},{until:123,retry:"yes"},{until:123,retry:false,days:7}]) {
    assert.throws(()=>validateRequest({...request,action:"calendarAdvance",payload}),{code:"InvalidRequest"});
  }
  assert.throws(()=>validateRequest({...request,facility:"Actor.bastion.Item.room"}),{code:"InvalidRequest"});
});

test("calendar cursors ignore reversed dates and suppress same-day failed retries",()=>{
  class Calendar {
    toObject(){return {name:"test"};}
    timeToComponents(time){return time;}
    static dayDifference(from,to){return Math.floor(to/86400)-Math.floor(from/86400);}
  }
  const adapter={game:{time:{worldTime:172800,calendar:new Calendar()},settings:{get:()=>({enabled:true,duration:7})}}};
  const clock=new CalendarAdapter(adapter);
  const bastion={flags:{"shared-bastion":{version:1,...clock.initialState()}},items:[{type:"facility",flags:{"shared-bastion":{calendarTime:0,progressIssue:{until:172800}}}}]};
  assert.equal(clock.days(172800,86400),0);
  assert.equal(clock.hasWork(bastion,172800),false);
  assert.equal(clock.hasWork(bastion,172800,true),true);
  assert.equal(clock.hasWork(bastion,259200),true);
});
