"use client";
import React from "react";
import LudoBoard,{BOARD_NAMES,BOARD_PALETTES,type BoardThemeId,type DemoToken} from "./LudoBoard";
import YardSkinOverlay from "./YardSkinOverlay";
import {getTokenCell} from "../../lib/canonicalLudoBoard";
export type {BoardThemeId,DemoToken};
type Props={theme?:BoardThemeId;demoTokens?:DemoToken[];onTokenClick?:(color:DemoToken["color"],id:number)=>void;legalTokenKeys?:string[]};
const YARD_CENTERS:Record<DemoToken["color"],Array<[string,string]>>={green:[["calc(13.61% + 2.85px)","calc(13.61% + 2.85px)"],["calc(26.39% - 2.85px)","calc(13.61% + 2.85px)"],["calc(13.61% + 2.85px)","calc(26.39% - 2.85px)"],["calc(26.39% - 2.85px)","calc(26.39% - 2.85px)"]],yellow:[["calc(73.61% + 2.85px)","calc(13.61% + 2.85px)"],["calc(86.39% - 2.85px)","calc(13.61% + 2.85px)"],["calc(73.61% + 2.85px)","calc(26.39% - 2.85px)"],["calc(86.39% - 2.85px)","calc(26.39% - 2.85px)"]],red:[["calc(13.61% + 2.85px)","calc(73.61% + 2.85px)"],["calc(26.39% - 2.85px)","calc(73.61% + 2.85px)"],["calc(13.61% + 2.85px)","calc(86.39% - 2.85px)"],["calc(26.39% - 2.85px)","calc(86.39% - 2.85px)"]],blue:[["calc(73.61% + 2.85px)","calc(73.61% + 2.85px)"],["calc(86.39% - 2.85px)","calc(73.61% + 2.85px)"],["calc(73.61% - 2.85px)","calc(86.39% - 2.85px)"],["calc(86.39% - 2.85px)","calc(86.39% - 2.85px) "]]};
const FINISH_SLOTS:Array<[string,string]>=[
 ["46%","46%"],["50%","46%"],["54%","46%"],["58%","46%"],
 ["46%","50%"],["50%","50%"],["54%","50%"],["58%","50%"],
 ["46%","54%"],["50%","54%"],["54%","54%"],["58%","54%"],
 ["46%","58%"],["50%","58%"],["54%","58%"],["58%","58%"]
];
const FINISH_ORDER:{[key:string]:number}={red:0,yellow:1,green:2,blue:3};
export default function CanonicalLudoBoard({theme="classic",demoTokens=[],onTokenClick,legalTokenKeys=[]}:Props){
 const p=BOARD_PALETTES[theme]||BOARD_PALETTES.classic;
 const moving=demoTokens.filter(t=>t.state!=="yard"&&t.state!=="finished").map(t=>{const cell=getTokenCell(t.color,t.position);return cell?{...t,row:cell[0],col:cell[1]}:null}).filter(Boolean) as Array<DemoToken&{row:number;col:number}>;
 const finished=demoTokens.filter(t=>t.state==="finished");
 const legalSet=new Set(legalTokenKeys); const yardTokens=demoTokens.filter(t=>t.state==="yard");
 const yardTokenStyle=(color:DemoToken["color"],id:number,left:string,top:string,legal:boolean):React.CSSProperties=>({position:"absolute",left,top,transform:"translate(-50%,-50%)",width:"10.9%",aspectRatio:1,borderRadius:"50%",border:`3px solid ${p.accent}`,background:p[color],boxShadow:legal?`inset 0 2px 3px rgba(255,255,255,.55),0 0 0 2px ${p.accent},0 0 18px ${p.accent}`:"inset 0 2px 3px rgba(255,255,255,.55),0 2px 5px rgba(0,0,0,.25)",animation:legal?"legalYardTokenBreath 1.45s ease-in-out infinite":undefined,zIndex:30,padding:0,cursor:"pointer",fontSize:0,color:"transparent"});
 return <div className="canonical-ludo-frame" style={{position:"relative",width:"100%",aspectRatio:"1",touchAction:"none",overscrollBehavior:"contain",userSelect:"none",WebkitUserSelect:"none"} as React.CSSProperties} aria-label={`${BOARD_NAMES[theme]} canonical Ludo board`}>
  <style>{`.canonical-ludo-frame{isolation:isolate}.canonical-ludo-frame .shared-ludo-board{box-shadow:none!important;border:0!important;outline:none!important;filter:none!important;position:relative;z-index:1}@keyframes legalMoveBreath{0%,100%{opacity:.45;transform:translate(-50%,-50%) scale(.9)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}}@keyframes legalYardTokenBreath{0%,100%{transform:translate(-50%,-50%) scale(.94);filter:saturate(1)}50%{transform:translate(-50%,-50%) scale(1.08);filter:saturate(1.12)}}@keyframes canonicalTokenBreath{0%,100%{transform:translate(-50%,-50%) scale(.94);filter:saturate(1);box-shadow:0 2px 5px rgba(0,0,0,.35)}50%{transform:translate(-50%,-50%) scale(1.07);filter:saturate(1.12);box-shadow:0 0 0 2px currentColor,0 0 14px currentColor}}`}</style>
  <LudoBoard theme={theme} demoTokens={[]} onTokenClick={onTokenClick} style={{width:"100%",height:"100%"}}/>
  <YardSkinOverlay />
  {yardTokens.map(t=>{const [left,top]=YARD_CENTERS[t.color][t.id]||YARD_CENTERS[t.color][0];const legal=legalSet.has(`${t.color}-${t.id}`);return <button key={`yard-${t.color}-${t.id}`} type="button" onClick={()=>onTokenClick?.(t.color,t.id)} aria-label={`${legal?"Legal move for ":""}${t.color} token`} style={yardTokenStyle(t.color,t.id,left,top,legal)} />;})}
  {moving.map(t=>{const key=`${t.color}-${t.id}`,legal=legalSet.has(key);return <button key={`moving-${key}`} type="button" onClick={()=>onTokenClick?.(t.color,t.id)} aria-label={`${legal?"Legal move for ":""}${t.color} token`} style={{position:"absolute",left:`${(t.col+.5)*100/15}%`,top:`${(t.row+.5)*100/15}%`,transform:"translate(-50%,-50%)",width:"6.8%",aspectRatio:1,borderRadius:"50%",border:`2px solid ${p.accent}`,background:p[t.color],boxShadow:legal?`inset 0 2px 3px rgba(255,255,255,.55),0 0 0 2px ${p.accent},0 0 18px ${p.accent}`:"inset 0 2px 3px rgba(255,255,255,.55),0 2px 5px rgba(0,0,0,.3)",animation:legal?"canonicalTokenBreath 1.45s ease-in-out infinite":undefined,zIndex:30,padding:0,cursor:legal?"pointer":"default",fontSize:0,color:"transparent"}}/>;})}
  {finished.map((t,index)=>{const order=(FINISH_ORDER[t.color]??9)*4+t.id;const slot=FINISH_SLOTS[order%FINISH_SLOTS.length]||FINISH_SLOTS[index%FINISH_SLOTS.length];return <div key={`finished-${t.color}-${t.id}`} aria-label={`${t.color} finished token`} style={{position:"absolute",left:slot[0],top:slot[1],transform:"translate(-50%,-50%)",width:"4%",aspectRatio:1,borderRadius:"50%",background:p[t.color],border:`2px solid ${p.accent}`,zIndex:35}}/>;})}
 </div>;
}
