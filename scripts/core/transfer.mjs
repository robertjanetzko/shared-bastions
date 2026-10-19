import { BastionError } from "./errors.mjs";

export const TRANSFER_ACTIONS=new Set(["stageTransfer","finishTransfer","discardTransfer"]);
export function validateTransferPayload(action,payload) {
  const keys=Object.keys(payload).join();
  if(action==="stageTransfer") {
    if(keys!=="sources"||!Array.isArray(payload.sources)||!payload.sources.length||payload.sources.length>100
      ||new Set(payload.sources.map(s=>s?.uuid)).size!==payload.sources.length
      ||payload.sources.some(s=>!s||Object.keys(s).sort().join()!=="digest,uuid"||!/^Actor\.[A-Za-z0-9]+\.Item\.[A-Za-z0-9]+$/.test(s.uuid)||! /^[a-f0-9]{64}$/.test(s.digest))) throw new BastionError("InvalidRequest");
  } else if(!["finishTransfer","discardTransfer"].includes(action)||keys!=="records"||!Array.isArray(payload.records)||!payload.records.length||payload.records.length>100
    ||new Set(payload.records).size!==payload.records.length||payload.records.some(id=>typeof id!=="string"||!/^[A-Za-z0-9]{16}$/.test(id))) throw new BastionError("InvalidRequest");
}

export function stableTransfer(value) {
  if(Array.isArray(value)) return `[${value.map(stableTransfer).join(",")}]`;
  if(value&&typeof value==="object") return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stableTransfer(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export async function transferDigest(data) {
  const bytes=new TextEncoder().encode(stableTransfer(data));
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}

export function transferContent(data) {
  const {_stats,_id,...content}=data;
  return content;
}

/** Rewrite facility references, including effect origins and @UUID links; keep other character refs. */
export function mapTransferReferences(data,mapping) {
  if(typeof data==="string") {
    for(const [source,target] of mapping) {
      const escaped=source.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
      data=data.replace(new RegExp(`${escaped}(?=$|[^A-Za-z0-9])`,"g"),()=>target);
    }
    return data;
  }
  if(Array.isArray(data)) return data.map(value=>mapTransferReferences(value,mapping));
  if(data&&typeof data==="object") return Object.fromEntries(Object.entries(data).map(([key,value])=>[key,mapTransferReferences(value,mapping)]));
  return data;
}
