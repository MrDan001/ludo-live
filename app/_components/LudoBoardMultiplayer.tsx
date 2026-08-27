"use client";
import React,{useMemo}from"react";
import LudoBoardGame,{BOARD_NAMES,BOARD_PALETTES,type BoardThemeId,type DemoToken}from"./LudoBoardGame";
import{getTokenCell}from"../../lib/canonicalLudoBoard";
export type{BoardThemeId,DemoToken};
export{BOARD_NAMES,BOARD_PALETTES};

type Props={theme?:BoardThemeId;preview?:boolean;className?:string;style?:React.CSSProperties;demoTokens?:DemoToken[];onTokenClick?:(color:DemoToken["color"],id:number)=>void;snapOnUpdate?:boolean;finishSound?:boolean;animateUpdates?:boolean;legalTokenKeys?:string[]};
const COLORS:DemoToken["color"][]=["red","yellow","green","blue"];
const STATIC_TOKENS:DemoToken[]=COLORS.flatMap(color=>Array.from({length:4},(_,id)=>({color,id,position:0,state:"yard"as const})));
const YARD_CENTERS:Record<DemoToken["color"],Array<[number,number]>>={green:[[13.61,13.61],[13.61,26.39],[26.39,13.61],[26.39,26.39]],yellow:[[13.61,73.61],[13.61,86.39],[26.39,73.61],[26.39,86.39]],red:[[73.61,13.61],[73.61,26.39],[86.39,13.61],[86.39,26.39]],blue:[[73.61,73.61],[73.61,86.39],[86.39,73.61],[86.39,86.39]]};
const keyOf=(t:DemoToken)=>`${t.color}:${t.id}`;
function cellPosition(t:DemoToken){if(t.state==="yard"){const c=YARD_CENTERS[t.color]?.[t.id]||YARD_CENTERS[t.color]?.[0];return c?[c[1],c[0]]:null}if(t.state==="finished")return null;const cell=getTokenCell(t.color,Number(t.position));return cell?[(cell[1]+.5)*100/15,(cell[0]+.5)*100/15]:null}

export default function LudoBoardMultiplayer({theme="classic",preview=false,className="",style,demoTokens=[],onTokenClick,snapOnUpdate=false,finishSound=false,animateUpdates=true,legalTokenKeys=[]}:Props){
 const tokens=useMemo(()=>{const map=new Map(STATIC_TOKENS.map(t=>[keyOf(t),t]));for(const t of demoTokens)map.set(keyOf(t),t);return Array.from(map.values())},[demoTokens]);
 const legal=new Set(legalTokenKeys);
 const pulse=tokens.filter(t=>legal.has(keyOf(t))&&t.state!=="finished");
 return <div className="mp-board-wrap" style={{position:"relative",width:"100%",aspectRatio:"1",...style}}>
   <LudoBoardGame theme={theme} preview={preview} className={className} style={{width:"100%",height:"100%"}} demoTokens={tokens} onTokenClick={onTokenClick} snapOnUpdate={snapOnUpdate} finishSound={finishSound} animateUpdates={animateUpdates}/>
   {pulse.map(t=>{const pos=cellPosition(t);if(!pos)return null;const palette=BOARD_PALETTES[theme]||BOARD_PALETTES.classic;return <span key={`pulse-${keyOf(t)}`} aria-hidden="true" style={{position:"absolute",left:`${pos[0]}%`,top:`${pos[1]}%`,width:t.state==="yard"?"11.5%":"7%",aspectRatio:1,transform:"translate(-50%,-50%)",borderRadius:"50%",background:"transparent",border:`3px solid ${palette[t.color]}`,boxShadow:`0 0 0 2px rgba(255,255,255,.8),0 0 18px ${palette[t.color]}`,animation:"mpLegalBreath 1.2s ease-in-out infinite",pointerEvents:"none",zIndex:160}}/>})}
   <style jsx global>{`@keyframes mpLegalBreath{0%,100%{opacity:.35;transform:translate(-50%,-50%) scale(.92)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.12)}}.mp-board-wrap button{font-size:0!important;color:transparent!important;text-indent:-9999px!important}`}</style>
 </div>
}
