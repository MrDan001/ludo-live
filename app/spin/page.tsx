"use client";
import { useEffect, useRef, useState } from "react";
import AppFrame from "../_components/AppFrame";

const prizes=["500 COINS","1,000 COINS","50 GEMS","FREE ROLL","250 COINS","2,000 COINS","100 GEMS","MYSTERY"];
const icons=["🪙","🪙","💎","🎟️","🪙","🪙","💎","🎁"];
const colors=["#d91e36","#1769d5","#f0b51a","#168b51","#d91e36","#1769d5","#f0b51a","#168b51"];
function updateStats(patch:Record<string,number>){try{const current=JSON.parse(localStorage.getItem("ludo-stats")||"{}");localStorage.setItem("ludo-stats",JSON.stringify({...current,...patch}));window.dispatchEvent(new Event("ludo-stats-updated"))}catch{}}
export default function SpinPage(){
 const [spinning,setSpinning]=useState(false);const [rotation,setRotation]=useState(0);const [result,setResult]=useState<string|null>(null);const [credits,setCredits]=useState(1);const rotationRef=useRef(0);const timer=useRef<number|null>(null);
 useEffect(()=>{const saved=localStorage.getItem("ludo-spin-credits");if(saved)setCredits(Math.max(0,Number(saved)||0));return()=>{if(timer.current)window.clearTimeout(timer.current)}},[]);
 const spin=()=>{
  if(spinning||credits<1)return;
  const winner=Math.floor(Math.random()*prizes.length);const segment=360/prizes.length;
  const landing=360-(winner*segment+segment/2);const next=rotationRef.current+360*9+landing;
  rotationRef.current=next;setResult(null);setCredits(c=>{const n=c-1;localStorage.setItem("ludo-spin-credits",String(n));return n});setSpinning(true);
  requestAnimationFrame(()=>requestAnimationFrame(()=>setRotation(next)));
  timer.current=window.setTimeout(()=>{setSpinning(false);setResult(prizes[winner]);updateStats({spinsUsed:(JSON.parse(localStorage.getItem("ludo-stats")||"{}").spinsUsed||0)+1})},6200);
 };
 return <AppFrame back="/home"><div style={{maxWidth:650,margin:"0 auto",paddingBottom:50,textAlign:"center"}}>
  <div style={{color:"#f8cf48",fontSize:13,fontWeight:950,letterSpacing:3}}>LUCKY WHEEL</div><h1 style={{fontSize:42,margin:"6px 0"}}>🎰 Spin & Win</h1><p style={{color:"#94a3b8",marginTop:0}}>Watch the wheel accelerate, coast and stop under the pointer.</p>
  <div style={{position:"relative",width:"min(88vw,460px)",aspectRatio:"1",margin:"26px auto 26px",filter:"drop-shadow(0 28px 40px rgba(0,0,0,.6))"}}>
   <div style={{position:"absolute",zIndex:20,left:"50%",top:-5,transform:"translateX(-50%)",width:0,height:0,borderLeft:"22px solid transparent",borderRight:"22px solid transparent",borderTop:"46px solid #ffdf5d",filter:"drop-shadow(0 4px 3px #000)"}}/>
   <div style={{position:"absolute",inset:0,borderRadius:"50%",padding:10,background:"linear-gradient(145deg,#fff0a1,#8a5a0a 28%,#ffdc59 50%,#6b4105 75%,#ffe58a)",boxShadow:"0 0 0 2px #2a1803,0 0 35px rgba(255,202,59,.25)"}}>
    <div style={{position:"relative",width:"100%",height:"100%",borderRadius:"50%",overflow:"hidden",border:"7px solid #281704",background:`conic-gradient(${colors.map((c,i)=>`${c} ${i*45}deg ${(i+1)*45}deg`).join(",")})`,transform:`rotate(${rotation}deg)`,transition:spinning?"transform 6.1s cubic-bezier(.08,.72,.12,1)":"none",willChange:"transform",boxShadow:"inset 0 0 0 4px rgba(255,236,137,.85),inset 0 0 35px rgba(0,0,0,.45)"}}>
      {prizes.map((p,i)=><div key={p} style={{position:"absolute",left:"50%",top:"50%",width:"48%",height:2,transform:`rotate(${i*45+22.5}deg)`,transformOrigin:"0 50%",pointerEvents:"none"}}><span style={{display:"block",transform:`translateY(-50%) rotate(${-(i*45+22.5)}deg)`,textAlign:"right",whiteSpace:"nowrap",paddingRight:9,color:"#fff",fontSize:12,fontWeight:950,textShadow:"0 2px 4px #000",letterSpacing:.2}}>{icons[i]} {p}</span></div>)}
      {Array.from({length:8},(_,i)=><div key={i} style={{position:"absolute",left:"50%",top:"50%",width:"50%",height:2,transform:`rotate(${i*45}deg)`,transformOrigin:"0 50%",background:"rgba(255,255,255,.4)"}}/>)}
      <div style={{position:"absolute",inset:"7%",borderRadius:"50%",border:"2px solid rgba(255,255,255,.25)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:108,height:108,borderRadius:"50%",background:"radial-gradient(circle at 35% 30%,#fff7bd,#f6c43d 45%,#8c4f06 100%)",border:"8px solid #291703",display:"grid",placeItems:"center",boxShadow:"0 6px 18px rgba(0,0,0,.6),inset 0 3px 6px rgba(255,255,255,.7)",fontSize:34}}>🎲</div>
    </div>
   </div>
  </div>
  <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:18,flexWrap:"wrap"}}><span style={pill}>🎟️ Spins: <b>{credits}</b></span><span style={pill}>🪙 Balance: <b>25,680</b></span></div>
  <button onClick={spin} disabled={spinning||credits<1} style={{border:"2px solid #ffe27a",borderRadius:16,padding:"15px 52px",fontSize:20,fontWeight:950,color:"#271500",background:spinning?"linear-gradient(180deg,#a8a8a8,#707070)":"linear-gradient(180deg,#ffe46b,#e79b16)",boxShadow:"0 7px 0 #70420a,0 12px 24px #0006",cursor:spinning?"wait":credits<1?"not-allowed":"pointer"}}>{spinning?"SPINNING…":"SPIN NOW"}</button>
  {result&&<div style={{marginTop:24,padding:18,borderRadius:18,background:"linear-gradient(135deg,#132e1b,#071c13)",border:"1px solid #35d17c",boxShadow:"0 0 35px rgba(34,197,94,.16)",animation:"prizePop .45s ease-out"}}><div style={{fontSize:12,color:"#86efac",fontWeight:900,letterSpacing:2}}>🎉 YOU WON</div><div style={{fontSize:28,fontWeight:950,marginTop:6}}>{result}</div></div>}
  <p style={{color:"#64748b",fontSize:11,marginTop:22}}>Virtual rewards only. No cash wagering or real-money prizes.</p>
  <style>{`@keyframes prizePop{0%{transform:scale(.85);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
 </div></AppFrame>
}
const pill={padding:"8px 12px",borderRadius:999,background:"rgba(15,23,42,.9)",border:"1px solid #334155",color:"#cbd5e1",fontSize:12};
