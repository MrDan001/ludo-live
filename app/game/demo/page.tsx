"use client";

import { useState } from "react";
import CanonicalLudoBoard, { type DemoToken } from "../../_components/CanonicalLudoBoard";
import { BOARD_PALETTES } from "../../_components/LudoBoard";
import { FINISH_PROGRESS } from "../../../lib/canonicalLudoBoard";

type Scenario = "stack" | "safe" | "kill" | null;
type Color = DemoToken["color"];
const base: DemoToken[] = [
  ...[0,1,2,3].map(id=>({color:"red" as Color,id,position:0,state:"yard" as const})),
  ...[0,1,2,3].map(id=>({color:"yellow" as Color,id,position:0,state:"yard" as const})),
  ...[0,1,2,3].map(id=>({color:"green" as Color,id,position:0,state:"yard" as const})),
  ...[0,1,2,3].map(id=>({color:"blue" as Color,id,position:0,state:"yard" as const})),
];

export default function MechanicsDemo(){
  const [scenario,setScenario]=useState<Scenario>(null);
  const [tokens,setTokens]=useState<DemoToken[]>(base);
  const [selected,setSelected]=useState<string|null>(null);
  const [message,setMessage]=useState("Choose a test below. This is temporary and does not alter a live match.");
  const p=BOARD_PALETTES.classic;
  const load=(kind:Exclude<Scenario,null>)=>{
    setScenario(kind);setSelected(null);
    if(kind==="stack"){
      setTokens(base.map(t=>t.color==="red"&&t.id===0?{...t,position:18,state:"track" as const}:t.color==="yellow"&&t.id===0?{...t,position:18,state:"track" as const}:t));
      setMessage("STACK TEST: two of your different-color tokens share one square. Tap either token independently.");
    } else if(kind==="safe"){
      setTokens(base.map(t=>t.color==="red"&&t.id===0?{...t,position:8,state:"track" as const}:t.color==="green"&&t.id===0?{...t,position:8,state:"track" as const}:t));
      setMessage("SAFE STACK TEST: your red token is underneath an opponent green token. Select RED; it must remain selectable and no capture should occur.");
    } else {
      setTokens(base.map(t=>t.color==="red"&&t.id===0?{...t,position:20,state:"track" as const}:t.color==="green"&&t.id===0?{...t,position:21,state:"track" as const}:t));
      setMessage("KILL TEST: RED is one step from GREEN. The expected result is GREEN → yard and RED → center Home/finished.");
    }
  };
  const select=(color:Color,id:number)=>{setSelected(`${color}-${id}`);if(scenario==="kill"&&color==="red"&&id===0){setTokens(prev=>prev.map(t=>t.color==="green"&&t.id===0?{...t,position:0,state:"yard" as const}:t.color==="red"&&t.id===0?{...t,position:FINISH_PROGRESS,state:"finished" as const}:t));setMessage("KILL TEST RESULT: opponent returned to yard; killing token moved to center Home and is finished.");}else if(scenario==="safe"&&color==="red"&&id===0){setMessage("SAFE TEST RESULT: RED was selectable even though GREEN was visually stacked above it. No capture was performed.");}};
  return <main style={page}><div style={card}><div style={eyebrow}>TEMPORARY DEVELOPER DEMO</div><h1 style={{margin:"6px 0 4px"}}>Ludo mechanics test lab</h1><p style={muted}>Test the three locked selection/page behaviors and the new kill rule without playing a full match.</p><div style={buttons}><button onClick={()=>load("stack")} style={button}>1 · STACK TEST</button><button onClick={()=>load("safe")} style={button}>2 · SAFE STACK</button><button onClick={()=>load("kill")} style={button}>3 · KILL TEST</button><button onClick={()=>{setScenario(null);setTokens(base);setSelected(null);setMessage("Choose a test below.")}} style={reset}>RESET</button></div><div style={status}>{message}</div><div style={board}><CanonicalLudoBoard theme="classic" demoTokens={tokens} onTokenClick={select} legalTokenKeys={scenario==="stack"?["red-0","yellow-0"]:scenario==="safe"?["red-0"]:scenario==="kill"?["red-0"]:[]} /></div><div style={tips}><b>Page-lock test:</b> try pinching, swiping, or dragging on the board. It should stay fixed. <br/><b>Selection test:</b> when tokens share a square, tap the exact token you want. <br/><b>Selected:</b> {selected||"none"}</div></div></main>;
}
const page:React.CSSProperties={minHeight:"100vh",padding:"20px 14px 40px",boxSizing:"border-box",background:"#06101f",color:"#fff",touchAction:"none",overscrollBehavior:"none"};
const card:React.CSSProperties={width:"min(100%,760px)",margin:"0 auto",padding:"18px",boxSizing:"border-box",borderRadius:22,background:"rgba(11,26,49,.92)",border:"1px solid rgba(255,255,255,.14)",boxShadow:"0 18px 60px rgba(0,0,0,.35)"};
const eyebrow:React.CSSProperties={fontSize:10,fontWeight:900,letterSpacing:2,color:"#8fb4ff"};
const muted:React.CSSProperties={margin:"0 0 14px",color:"#a9bad5",lineHeight:1.5};
const buttons:React.CSSProperties={display:"flex",flexWrap:"wrap",gap:8};
const button:React.CSSProperties={border:0,borderRadius:10,padding:"11px 13px",fontWeight:900,cursor:"pointer",background:"#2f80ed",color:"white"};
const reset:React.CSSProperties={border:"1px solid rgba(255,255,255,.2)",borderRadius:10,padding:"11px 13px",fontWeight:900,cursor:"pointer",background:"transparent",color:"white"};
const status:React.CSSProperties={margin:"14px 0",padding:12,borderRadius:12,background:"rgba(255,255,255,.06)",color:"#dce7fa",lineHeight:1.45};
const board:React.CSSProperties={width:"min(100%,620px)",margin:"0 auto"};
const tips:React.CSSProperties={marginTop:14,padding:12,borderRadius:12,background:"rgba(255,255,255,.045)",color:"#a9bad5",fontSize:13,lineHeight:1.7};
