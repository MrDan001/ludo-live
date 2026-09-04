"use client";
import {useEffect} from "react";
import {Socket} from "socket.io-client";

type CosmeticPayload={board?:string;dice?:string;yard?:string};
type GameSocket=Socket & {__ludoHostCosmeticsStarted?:boolean;__ludoHostCosmeticsHostId?:string;__ludoHostCosmeticsLast?:string};
const PATCH=Symbol.for("ludo.game-online.host-cosmetics-runtime");
const proto=Socket.prototype as any;
if(!proto[PATCH]){
  proto[PATCH]=true;
  const originalOn=Socket.prototype.on;
  const originalEmit=Socket.prototype.emit;
  proto.on=function(this:GameSocket,event:string,listener:(...args:any[])=>void){
    if(event!=="roster"&&event!=="host-cosmetics")return originalOn.call(this,event,listener);
    if(event==="roster")return originalOn.call(this,event,(members:any[])=>{const list=Array.isArray(members)?members:[];const host=list.find(m=>m?.host);if(host?.playerId){this.__ludoHostCosmeticsHostId=String(host.playerId);apply({board:host.board,dice:host.dice,yard:host.yard});}listener(list);});
    return originalOn.call(this,event,(payload:CosmeticPayload={})=>{apply(payload);listener(payload);});
  };
  proto.emit=function(this:GameSocket,event:string,...args:any[]){
    if(event==="join-room"){
      const payload={...(args[0]||{})};
      void fetch("/api/customization",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(c=>{if(!c)return;const yard=Array.isArray(c.equippedItems)?String(c.equippedItems.find((x:string)=>String(x).startsWith("yard-"))||""):"";const cosmetics={board:String(c.equippedBoard||"classic"),dice:String(c.equippedDice||"classic"),yard};try{localStorage.setItem("ludo-self-cosmetics",JSON.stringify(cosmetics))}catch{}this.__ludoHostCosmeticsLast=JSON.stringify(cosmetics);this.emit("host-cosmetics-update",cosmetics);}).catch(()=>{});
      return originalEmit.call(this,event,payload);
    }
    return originalEmit.call(this,event,...args);
  };
  function apply(payload:CosmeticPayload){try{if(payload.board)localStorage.setItem("ludo-match-board",String(payload.board));if(payload.dice)localStorage.setItem("ludo-match-dice",String(payload.dice));localStorage.setItem("ludo-match-yard",String(payload.yard||""));window.dispatchEvent(new CustomEvent("ludo-host-cosmetics-updated"));}catch{}}
}

export default function HostCosmeticsRuntime(){
 useEffect(()=>{
  const timer=window.setInterval(async()=>{
   try{
    const raw=localStorage.getItem("ludo-self-cosmetics");const self=raw?JSON.parse(raw):null;
    const sockets=(Socket as any).__ludoHostSockets as Set<GameSocket>|undefined;
    if(!sockets||!self)return;
    for(const socket of sockets){if(!socket.connected||!socket.__ludoHostCosmeticsHostId)continue;if(String(socket.__ludoHostCosmeticsHostId)!==String(socket.__ludoHostCosmeticsHostId))continue;const key=JSON.stringify(self);if(key===socket.__ludoHostCosmeticsLast)continue;socket.__ludoHostCosmeticsLast=key;socket.emit("host-cosmetics-update",self);}
   }catch{}
  },2000);
  return()=>window.clearInterval(timer);
 },[]);
 return null;
}
