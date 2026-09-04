"use client";
import {useEffect} from "react";
import {Socket} from "socket.io-client";

type CosmeticPayload={board?:string;dice?:string;yard?:string};
type GameSocket=Socket & {__ludoHostCosmeticsHostId?:string;__ludoHostCosmeticsPlayerId?:string;__ludoHostCosmeticsLast?:string;__ludoSelfCosmetics?:CosmeticPayload};
const PATCH=Symbol.for("ludo.game-online.host-cosmetics-runtime-v2");
const proto=Socket.prototype as any;
const hostSockets=((Socket as any).__ludoHostSockets||(Socket as any).__ludoHostSockets=new Set<GameSocket>()) as Set<GameSocket>;
if(!proto[PATCH]){
 proto[PATCH]=true;
 const originalOn=Socket.prototype.on;
 const originalEmit=Socket.prototype.emit;
 proto.on=function(this:GameSocket,event:string,listener:(...args:any[])=>void){
  if(event!=="roster"&&event!=="host-cosmetics")return originalOn.call(this,event,listener);
  if(event==="roster")return originalOn.call(this,event,(members:any[])=>{const list=Array.isArray(members)?members:[];const host=list.find(m=>m?.host);if(host?.playerId){this.__ludoHostCosmeticsHostId=String(host.playerId);apply({board:host.board,dice:host.dice,yard:host.yard});if(String(host.playerId)===String(this.__ludoHostCosmeticsPlayerId)&&this.__ludoSelfCosmetics)this.emit("host-cosmetics-update",this.__ludoSelfCosmetics);}listener(list);});
  return originalOn.call(this,event,(payload:CosmeticPayload={})=>{apply(payload);listener(payload);});
 };
 proto.emit=function(this:GameSocket,event:string,...args:any[]){
  if(event==="join-room"){
   const payload={...(args[0]||{})};this.__ludoHostCosmeticsPlayerId=String(payload.playerId||"");hostSockets.add(this);
   void fetch("/api/customization",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(c=>{if(!c)return;const yard=Array.isArray(c.equippedItems)?String(c.equippedItems.find((x:string)=>String(x).startsWith("yard-"))||""):"";const cosmetics={board:String(c.equippedBoard||"classic"),dice:String(c.equippedDice||"classic"),yard};this.__ludoSelfCosmetics=cosmetics;try{localStorage.setItem("ludo-self-cosmetics",JSON.stringify(cosmetics))}catch{}if(String(this.__ludoHostCosmeticsHostId||"")===String(this.__ludoHostCosmeticsPlayerId||"")){this.__ludoHostCosmeticsLast=JSON.stringify(cosmetics);this.emit("host-cosmetics-update",cosmetics);}}).catch(()=>{});
   return originalEmit.call(this,event,payload);
  }
  return originalEmit.call(this,event,...args);
 };
 function apply(payload:CosmeticPayload){try{if(payload.board)localStorage.setItem("ludo-match-board",String(payload.board));if(payload.dice)localStorage.setItem("ludo-match-dice",String(payload.dice));localStorage.setItem("ludo-match-yard",String(payload.yard||""));window.dispatchEvent(new CustomEvent("ludo-host-cosmetics-updated"));}catch{}}
}

export default function HostCosmeticsRuntime(){
 useEffect(()=>{const timer=window.setInterval(async()=>{try{const response=await fetch("/api/customization",{cache:"no-store"});if(!response.ok)return;const c=await response.json();const yard=Array.isArray(c?.equippedItems)?String(c.equippedItems.find((x:string)=>String(x).startsWith("yard-"))||""):"";const self={board:String(c?.equippedBoard||"classic"),dice:String(c?.equippedDice||"classic"),yard};for(const socket of hostSockets){if(!socket.connected||!socket.__ludoHostCosmeticsHostId||String(socket.__ludoHostCosmeticsHostId)!==String(socket.__ludoHostCosmeticsPlayerId))continue;const key=JSON.stringify(self);socket.__ludoSelfCosmetics=self;if(key===socket.__ludoHostCosmeticsLast)continue;socket.__ludoHostCosmeticsLast=key;socket.emit("host-cosmetics-update",self);}}catch{}},2000);return()=>window.clearInterval(timer)},[]);
 return null;
}
