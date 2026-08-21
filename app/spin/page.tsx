"use client";
import { useEffect, useRef, useState } from "react";
import AppFrame from "../_components/AppFrame";

const prizes=["500 COINS","1000 COINS","50 GEMS","FREE ROLL","250 COINS","2000 COINS","100 GEMS","MYSTERY"];
const icons=["🪙","🪙","💎","🎟️","🪙","🪙","💎","🎁"];
export default function SpinPage(){
 const [spinning,setSpinning]=useState(false);const [rotation,setRotation]=useState(0);const [result,setResult]=useState<string|null>(null);const [credits,setCredits]=useState(1);const rotationRef=useRef(0);
 useEffect(()=>{const saved=localStorage.getItem("ludo-spin-credits");if(saved)setCredits(Math.max(0,Number(saved)||1))},[]);
 const spin=()=>{if(spinning||credits<1)return;const winner=Math.floor(Math.random()*prizes.length);const segment=360/prizes.length;const target=360*7+(360-(winner*segment+segment/2));const next=rotationRef.current+target;rotationRef.current=next;setCredits(c=>{const n=c-1;localStorage.setItem("ludo-spin-credits",String(n));return n});setResult(null);setSpinning(true);setRotation(next);window.setTimeout(()=>{setSpinning(false);setResult(prizes[winner])},5200)};
 return <AppFrame back="/home"><div style={{maxWidth:620,margin:"0 auto",paddingBottom:50,textAlign:"center"}}>
  <div style={{color:"#f8cf48",fontSize:13,fontWeight:950,letterSpacing:3}}>LUCKY WHEEL</div><h1 style={{fontSize:42,margin:"6px 0"}}>🎰 Spin & Win</h1><p style={{color:"#94a3b8",marginTop:0}}>A real animated prize wheel. Every spin is one random virtual reward.</p>
  <div style={{position:"relative",width:"min(86vw,430px)",aspectRatio:"1",margin:"26px auto 22px",filter:"drop-shadow(0 24px 38px rgba(0,0,0,.55))"}}>
   <div style={{position:"absolute",zIndex:5,left:"50%",top:-10,transform:"translateX(-50%)",width:0,height:0,borderLeft:"18px solid transparent",borderRight:"18px solid transparent",borderTop:"34px solid #f8d34f",filter:"drop-shadow(0 3px 3px #000)"}}/>
   <div style={{position:"absolute",inset:0,borderRadius:"50%",padding:12,background:"linear-gradient(135deg,#ffe98a,#8b5e14,#ffe98a,#a96b10)",boxSizing:"border-box"}}>
    <div style={{width:"100%",height:"100%",borderRadius:"50%",overflow:"hidden",border:"7px solid #271603",boxShadow:"inset 0 0 0 5px #f4c95d",transform:`rotate(${rotation}deg)`,transition:spinning?"transform 5.2s cubic-bezier(.12,.68,.12,1)":"none",background:"conic-gradient(#d91e36 0deg 45deg,#1769d5 45deg 90deg,#f0b51a 90deg 135deg,#168b51 135deg 180deg,#d91e36 180deg 225deg,#1769d5 225deg 270deg,#f0b51a 270deg 315deg,#168b51 315deg 360deg)",position:"relative"}}>
     {prizes.map((p,i)=><div key={p} style={{position:"absolute",left:"50%",top:"50%",width:"42%",height:"1px",transform:`rotate(${i*45+22.5}deg)`,transformOrigin:"0 0",color:"#fff",fontWeight:950,fontSize:11,textShadow:"0 2px 3px #000",textAlign:"right",paddingRight:4,boxSizing:"border-box"}}><span style={{display:"inline-block",transform:`rotate(${-(i*45+22.5)}deg)`,whiteSpace:"nowrap"}}>{icons[i]} {p}</span></div>)}
     <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:92,height:92,borderRadius:"50%",background:"radial-gradient(circle,#fff5b0 0,#f4b52c 42%,#8a4d06 100%)",border:"7px solid #2b1602",display:"grid",placeItems:"center",boxShadow:"0 5px 14px #0008",fontSize:29}}>🎲</div>
    </div>
   </div>
  </div>
  <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:16}}><span style={pill}>🎟️ Spins: <b>{credits}</b></span><span style={pill}>🪙 Balance: <b>25,680</b></span></div>
  <button onClick={spin} disabled={spinning||credits<1} style={{border:"2px solid #ffe27a",borderRadius:16,padding:"15px 46px",fontSize:20,fontWeight:950,color:"#271500",background:spinning?"#9ca3af":"linear-gradient(180deg,#ffe46b,#e79b16)",boxShadow:"0 7px 0 #70420a,0 12px 24px #0006",cursor:spinning?"wait":"pointer"}}>{spinning?"SPINNING…":"SPIN NOW"}</button>
  {result&&<div style={{marginTop:24,padding:18,borderRadius:18,background:"linear-gradient(135deg,#132e1b,#071c13)",border:"1px solid #35d17c",boxShadow:"0 0 35px rgba(34,197,94,.16)"}}><div style={{fontSize:12,color:"#86efac",fontWeight:900,letterSpacing:2}}>🎉 JACKPOT RESULT</div><div style={{fontSize:28,fontWeight:950,marginTop:6}}>{result}</div></div>}
  <p style={{color:"#64748b",fontSize:11,marginTop:22}}>Virtual rewards only. No cash wagering or real-money prizes.</p>
 </div></AppFrame>
}
const pill={padding:"8px 12px",borderRadius:999,background:"rgba(15,23,42,.9)",border:"1px solid #334155",color:"#cbd5e1",fontSize:12};
