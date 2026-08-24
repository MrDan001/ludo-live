"use client";
import React from "react";
import LudoBoard,{BOARD_NAMES,BOARD_PALETTES,type BoardThemeId,type DemoToken} from "./LudoBoard";
import {getTokenCell} from "../../lib/canonicalLudoBoard";
export type {BoardThemeId,DemoToken};

type Props={theme?:BoardThemeId;demoTokens?:DemoToken[];onTokenClick?:(color:DemoToken["color"],id:number)=>void;legalTokenKeys?:string[]};
const YARD_CENTERS:Record<DemoToken["color"],Array<[string,string]>>={
 green:[["calc(13.61% + 2.85px)","calc(13.61% + 2.85px)"],["calc(26.39% - 2.85px)","calc(13.61% + 2.85px)"],["calc(13.61% + 2.85px)","calc(26.39% - 2.85px)"],["calc(26.39% - 2.85px)","calc(26.39% - 2.85px)"]],
 yellow:[["calc(73.61% + 2.85px)","calc(13.61% + 2.85px)"],["calc(86.39% - 2.85px)","calc(13.61% + 2.85px)"],["calc(73.61% + 2.85px)","calc(26.39% - 2.85px)"],["calc(86.39% - 2.85px)","calc(26.39% - 2.85px)"]],
 red:[["calc(13.61% + 2.85px)","calc(73.61% + 2.85px)"],["calc(26.39% - 2.85px)","calc(73.61% + 2.85px)"],["calc(13.61% + 2.85px)","calc(86.39% - 2.85px)"],["calc(26.39% - 2.85px)","calc(86.39% - 2.85px)"]],
 blue:[["calc(73.61% + 2.85px)","calc(73.61% + 2.85px)"],["calc(86.39% - 2.85px)","calc(73.61% + 2.85px)"],["calc(73.61% + 2.85px)","calc(86.39% - 2.85px)"],["calc(86.39% - 2.85px)","calc(86.39% - 2.85px)"]]
};
export default function CanonicalLudoBoard({theme="classic",demoTokens=[],onTokenClick,legalTokenKeys=[]}:Props){
 const p=BOARD_PALETTES[theme]||BOARD_PALETTES.classic;
 const moving=demoTokens.filter(t=>t.state!=="yard"&&t.state!=="finished").map(t=>{const cell=getTokenCell(t.color,t.position);return cell?{...t,row:cell[0],col:cell[1]}:null}).filter(Boolean) as Array<DemoToken&{row:number;col:number}>;
 const finished=demoTokens.filter(t=>t.state==="finished");
 const legalSet=new Set(legalTokenKeys);
 const yardTokens=demoTokens.filter(t=>t.state==="yard");
 const movingLegal=new Set(moving.filter(t=>legalSet.has(`${t.color}-${t.id}`)).map(t=>`${t.color}-${t.id}`));
 const yardTokenStyle=(color:DemoToken["color"],id:number,left:string,top:string,legal:boolean):React.CSSProperties=>({position:"absolute",left,top,transform:"translate(-50%,-50%)",width:"10.9%",aspectRatio:1,borderRadius:"50%",border:`3px solid ${p.accent}`,background:p[color],boxShadow:legal?`inset 0 2px 3px rgba(255,255,255,.55),0 0 0 2px ${p.accent},0 0 18px ${p.accent}`:"inset 0 2px 3px rgba(255,255,255,.55),0 2px 5px rgba(0,0,0,.25)",animation:legal?"legalYardTokenBreath 1.45s ease-in-out infinite":undefined,zIndex:30,padding:0,cursor:"pointer",fontSize:0,color:"transparent"});
 const markerStyle=(row:number,col:number):React.CSSProperties=>({position:"absolute",left:`${(col+.5)*100/15}%`,top:`${(row+.5)*100/15}%`,transform:"translate(-50%,-50%)",width:"6.8%",aspectRatio:1,borderRadius:"50%",border:`2px solid ${p.accent}`,background:"transparent",boxShadow:`0 0 0 2px ${p.accent}, 0 0 14px ${p.accent}`,animation:"legalMoveBreath 1.45s ease-in-out infinite",zIndex:24,padding:0,pointerEvents:"none"});
 return <div className="canonical-ludo-frame" style={{position:"relative",width:"100%",aspectRatio:"1"} as React.CSSProperties} aria-label={`${BOARD_NAMES[theme]} canonical Ludo board`}>
  <style>{`\n    .canonical-ludo-frame{isolation:isolate}\n    .canonical-ludo-frame .shared-ludo-board{box-shadow:none!important;border:0!important;outline:none!important;filter:none!important;position:relative;z-index:1}\n    @keyframes legalMoveBreath{\n      0%,100%{opacity:.45;transform:translate(-50%,-50%) scale(.9)}\n      50%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}\n    }\n    @keyframes legalYardTokenBreath{\n      0%,100%{transform:translate(-50%,-50%) scale(.94);filter:saturate(1)}\n      50%{transform:translate(-50%,-50%) scale(1.08);filter:saturate(1.12)}\n    }\n  `}</style>
  <LudoBoard theme={theme} demoTokens={[]} onTokenClick={onTokenClick} style={{width:"100%",height:"100%"}}/>
  {yardTokens.map(t=>{const [left,top]=YARD_CENTERS[t.color][t.id]||YARD_CENTERS[t.color][0];const legal=legalSet.has(`${t.color}-${t.id}`);return <button key={`yard-${t.color}-${t.id}`} type="button" onClick={()=>onTokenClick?.(t.color,t.id)} aria-label={`${legal?"Legal move for ":""}${t.color} token`} style={yardTokenStyle(t.color,t.id,left,top,legal)} />;})}
  {moving.map(t=><React.Fragment key={`${t.color}-${t.id}`}>
    {movingLegal.has(`${t.color}-${t.id}`)&&<span aria-hidden="true" style={markerStyle(t.row,t.col)} />}
    <button type="button" onClick={()=>onTokenClick?.(t.color,t.id)} aria-label={`${t.color} token`} style={{position:"absolute",left:`${(t.col+.5)*100/15}%`,top:`${(t.row+.5)*100/15}%`,transform:"translate(-50%,-50%)",width:"5.1%",aspectRatio:1,borderRadius:"50%",border:"2px solid #222",background:BOARD_PALETTES[theme][t.color],zIndex:30,fontWeight:900,padding:0,color:"transparent",fontSize:0}} />
  </React.Fragment>)}
  <div aria-label={`Finished tokens: ${finished.length}`} style={{position:"absolute",left:"40%",top:"40%",width:"20%",height:"20%",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gridTemplateRows:"repeat(4,1fr)",gap:"2%",padding:"4%",boxSizing:"border-box",placeItems:"center",pointerEvents:"none",zIndex:40}}>{finished.map(t=><span key={`${t.color}-${t.id}`} style={{width:"92%",height:"92%",borderRadius:"50%",background:BOARD_PALETTES[theme][t.color],border:"2px solid #fff",boxShadow:"0 2px 5px rgba(0,0,0,.35)"}} />)}</div>
 </div>;
}