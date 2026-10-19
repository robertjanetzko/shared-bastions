import { MODULE_ID } from "../constants.mjs";
import { BastionError } from "../core/errors.mjs";
import { resolveParticipantOwner } from "../core/ownership.mjs";
import { mapTransferReferences,transferContent,transferDigest } from "../core/transfer.mjs";

/** Durable two-phase transfer. Pending copies never participate in orders or progress. */
export class TransferService {
  constructor(adapter,repository,bus){this.adapter=adapter;this.repository=repository;this.bus=bus;}

  ledger() {
    if(!game.user.isGM) throw new BastionError("GMOnly");
    const ledger=game.journal.get("SharedBastionLog");
    if(!ledger?.flags[MODULE_ID]?.receiptLedger||ledger.ownership.default>0
      ||game.users.some(user=>!user.isGM&&ledger.getUserLevel(user)>0)) throw new BastionError("LedgerUnavailable");
    return ledger;
  }

  records(bastion) {return this.ledger().pages.filter(page=>{
    const record=page.flags[MODULE_ID]?.transfer;
    return record?.bastion===bastion.uuid&&record.bastionCreated===bastion._stats.createdTime;
  });}

  async preview() {
    if(!game.user.isGM) throw new BastionError("GMOnly");
    const bastion=this.repository.find();if(!bastion) throw new BastionError("InvalidBastion");
    const records=this.records(bastion);
    const sources=[];
    for(const uuid of bastion.flags[MODULE_ID].participants) {
      let owner;try{owner=await resolveParticipantOwner(bastion,uuid,value=>fromUuid(value));}catch{continue;}
      for(const item of owner.itemTypes.facility) {
        if(records.some(page=>{const r=page.flags[MODULE_ID].transfer;return r.sourceUuid===item.uuid&&r.status==="pending";})) continue;
        sources.push({uuid:item.uuid,name:item.name,owner:owner.name,digest:await transferDigest(item.toObject()),
          progress:this.adapter.facilityView(item).progress});
      }
    }
    const pending=[];
    for(const page of records) {
      const record=page.flags[MODULE_ID].transfer;if(record.status!=="pending") continue;
      const source=await fromUuid(record.sourceUuid);const target=bastion.items.get(record.target);
      const ready=Boolean(target&&await transferDigest(transferContent(target.toObject()))===record.copyDigest
        &&(!source||await transferDigest(source.toObject())===record.sourceDigest));
      pending.push({id:page.id,name:record.source.name,source:record.sourceUuid,target:`${bastion.uuid}.Item.${record.target}`,ready,canDiscard:Boolean(source)});
    }
    return {name:bastion.name,sources,pending,hasSources:Boolean(sources.length),hasPending:Boolean(pending.length),
      canFinish:pending.some(r=>r.ready),canDiscard:pending.some(r=>r.canDiscard)};
  }

  async plan(bastion,request,user) {
    if(!user.isGM) throw new BastionError("GMOnly");
    const ledger=this.ledger();const revision=request.revision+1;
    const operations=[];
    if(request.action==="stageTransfer") {
      const entries=[];
      for(const input of request.payload.sources) {
        const source=await fromUuid(input.uuid);
        if(source?.type!=="facility"||!source.parent||source.pack||source.parent.isToken) throw new BastionError("InvalidFacility");
        const owner=await resolveParticipantOwner(bastion,source.parent.uuid,value=>fromUuid(value));
        const original=source.toObject();
        if(await transferDigest(original)!==input.digest) throw new BastionError("TransferChanged");
        if(this.records(bastion).some(page=>{const r=page.flags[MODULE_ID].transfer;return r.sourceUuid===source.uuid&&r.status!=="discarded";})) throw new BastionError("TransferExists");
        entries.push({source,owner,original,id:foundry.utils.randomID(),target:foundry.utils.randomID()});
      }
      const mapping=new Map(entries.map(e=>[e.source.uuid,`${bastion.uuid}.Item.${e.target}`]));
      const copies=[];const backups=[];
      for(const entry of entries) {
        const copy=mapTransferReferences(entry.original,mapping);
        delete copy._stats;copy._id=entry.target;
        copy.flags[MODULE_ID]={...copy.flags[MODULE_ID],owner:entry.owner.uuid,revision:0,source:entry.source.uuid,
          calendarTime:game.time.worldTime,progressIssue:null,transferPending:entry.id};
        copy.flags[MODULE_ID].occupants={};
        for(const role of ["hirelings","defenders"]) {
          copy.flags[MODULE_ID].occupants[role]=await Promise.all((copy.system[role]?.value??[]).map(async uuid=>{
            const actor=await fromUuid(uuid).catch(()=>null);
            return {uuid,name:actor?.name??game.i18n.localize("SHARED_BASTION.MissingReference"),img:actor?.img??"icons/svg/mystery-man.svg"};
          }));
        }
        // Normalize using the native model before comparing the persisted copy.
        const normalized=new Item.implementation(copy,{parent:bastion}).toObject();
        const record={bastion:bastion.uuid,bastionCreated:bastion._stats.createdTime,status:"pending",sourceUuid:entry.source.uuid,source:entry.original,
          sourceDigest:await transferDigest(entry.original),target:entry.target,copy:normalized,
          copyDigest:await transferDigest(transferContent(normalized)),mapping:Object.fromEntries(mapping)};
        copies.push(normalized);
        backups.push({_id:entry.id,type:"text",name:entry.source.name,text:{content:""},flags:{[MODULE_ID]:{transfer:record}}});
      }
      operations.push({action:"create",documentName:"JournalEntryPage",parent:ledger,keepId:true,data:backups},
        {action:"create",documentName:"Item",parent:bastion,keepId:true,keepEmbeddedIds:true,sharedBastionConstruction:true,data:copies});
    } else {
      const deletions=new Map();const itemUpdates=[];const discarded=[];const recordUpdates=[];
      for(const id of request.payload.records) {
        const page=ledger.pages.get(id);const record=page?.flags[MODULE_ID]?.transfer;
        if(!record||record.bastion!==bastion.uuid||record.bastionCreated!==bastion._stats.createdTime) throw new BastionError("InvalidRequest");
        if(record.status==="done"&&request.action==="finishTransfer") continue;
        if(record.status==="discarded"&&request.action==="discardTransfer") continue;
        if(record.status!=="pending") throw new BastionError("TransferExists");
        const source=await fromUuid(record.sourceUuid);const target=bastion.items.get(record.target);
        if(!target||target.flags[MODULE_ID]?.transferPending!==id) throw new BastionError("TransferChanged");
        if(request.action==="discardTransfer") {
          if(!source) throw new BastionError("TransferChanged");
          discarded.push(target.id);
        } else {
          await resolveParticipantOwner(bastion,target.flags[MODULE_ID].owner,value=>fromUuid(value));
          if(await transferDigest(transferContent(target.toObject()))!==record.copyDigest
            ||(source&&await transferDigest(source.toObject())!==record.sourceDigest)) throw new BastionError("TransferChanged");
          if(source) {const entry=deletions.get(source.parent.id)??{parent:source.parent,ids:[]};entry.ids.push(source.id);deletions.set(source.parent.id,entry);}
          itemUpdates.push({_id:target.id,[`flags.${MODULE_ID}.-=transferPending`]:null,[`flags.${MODULE_ID}.revision`]:1,
            [`flags.${MODULE_ID}.calendarTime`]:game.time.worldTime});
        }
        recordUpdates.push({_id:id,[`flags.${MODULE_ID}.transfer.status`]:request.action==="discardTransfer"?"discarded":"done"});
      }
      // Targets have been read back and compared before any source deletion is planned.
      for(const entry of deletions.values()) operations.push({action:"delete",documentName:"Item",...entry});
      if(itemUpdates.length) operations.push({action:"update",documentName:"Item",parent:bastion,updates:itemUpdates});
      if(discarded.length) operations.push({action:"delete",documentName:"Item",parent:bastion,ids:discarded});
      if(recordUpdates.length) operations.push({action:"update",documentName:"JournalEntryPage",parent:ledger,updates:recordUpdates});
    }
    operations.push({action:"update",documentName:"Actor",updates:[{_id:bastion.id,[`flags.${MODULE_ID}.revision`]:revision}]});
    return {operations,revision,uuid:bastion.uuid};
  }

  async transfer(sources) {
    const bastion=this.repository.find();
    await this.bus.request("stageTransfer",bastion.uuid,{sources});
    const uuids=new Set(sources.map(s=>s.uuid));
    const records=this.records(bastion).filter(page=>page.flags[MODULE_ID].transfer.status==="pending"&&uuids.has(page.flags[MODULE_ID].transfer.sourceUuid)).map(p=>p.id);
    await this.bus.request("finishTransfer",bastion.uuid,{records});
  }
}
