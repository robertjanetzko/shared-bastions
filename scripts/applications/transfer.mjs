import { MODULE_ID } from "../constants.mjs";
import { reportError } from "../services/bastion.mjs";

export async function transferFacilities() {
  try {
    const preview=await this.api.transferPreview();
    const buttons=[];
    if(preview.hasSources) buttons.push({action:"stage",label:"SHARED_BASTION.TransferStart",default:true,
      callback:(event,button,dialog)=>({action:"stage",sources:preview.sources.filter((source,index)=>dialog.element.querySelector(`[name="source-${index}"]`)?.checked).map(({uuid,digest})=>({uuid,digest}))})});
    if(preview.canFinish) buttons.push({action:"finish",label:"SHARED_BASTION.TransferResume",callback:()=>({action:"finish",records:preview.pending.filter(p=>p.ready).map(p=>p.id)})});
    if(preview.canDiscard) buttons.push({action:"discard",label:"SHARED_BASTION.TransferDiscard",callback:()=>({action:"discard",records:preview.pending.filter(p=>p.canDiscard).map(p=>p.id)})});
    buttons.push({action:"close",label:"SHARED_BASTION.Close"});
    const result=await foundry.applications.api.DialogV2.wait({window:{title:"SHARED_BASTION.TransferTitle"},position:{width:680},
      content:await foundry.applications.handlebars.renderTemplate(`modules/${MODULE_ID}/templates/transfer.hbs`,preview),buttons,rejectClose:false});
    if(!result||typeof result!=="object") return;
    if(result.action==="stage"&&result.sources.length) await this.api.transfer(result.sources);
    if(result.action==="finish") await this.api.request("finishTransfer",this.actor.uuid,{records:result.records});
    if(result.action==="discard") {
      const confirmed=await foundry.applications.api.DialogV2.confirm({window:{title:"SHARED_BASTION.TransferDiscard"},
        content:`<p>${game.i18n.localize("SHARED_BASTION.TransferDiscardHint")}</p>`,rejectClose:false});
      if(confirmed) await this.api.request("discardTransfer",this.actor.uuid,{records:result.records});
    }
  }catch(error){reportError(error);}
}
