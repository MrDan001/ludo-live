"use client";
import {useEffect,useState} from "react";
import AppFrame from "../_components/AppFrame";

type Wallet={coins:number;gems:number;spins:number;mystery:number};
type Reward={coins:number;gems:number};
const defaultWallet:Wallet={coins:25680,gems:320,spins:0,mystery:0};
const rewards:Reward[]=[{coins:1000,gems:0},{coins:1500,gems:0},{coins:0,gems:5},{coins:2000,gems:0},{coins:0,gems:10},{coins:3000,gems:0},{coins:5000,gems:20}];
function readWallet():Wallet{try{return {...defaultWallet,...JSON.parse(localStorage.getItem("ludo-wallet")||"{}")}}catch{return defaultWallet}}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function readState(){try{const s=JSON.parse(localStorage.getItem("ludo-daily-reward")||"null");return s?.date===today()?s:{date:today(),claimed:false,streak:s?.streak||1,day:s?.day||1}}catch{return {date:today(),claimed:false,streak:1,day:1}}}
function saveWallet(w:Wallet){localStorage.setItem("ludo-wallet",JSON.stringify(w));window.dispatchEvent(new Event("ludo-wallet-updated"))}
export default function RewardsPage(){
 const[state,setState]=useState(readState);const[wallet,setWallet]=useState<Wallet>(defaultWallet);
 useEffect(()=>{const refresh=()=>{setWallet(readWallet());setState(readState())};refresh();window.addEventListener("ludo-wallet-updated",refresh);window.addEventListener("storage",refresh);return()=>{window.removeEventListener("ludo-wallet-updated",refresh);window.removeEventListener("storage",refresh)}},[]);
 const reward=rewards[state.day-1]||rewards[0];
 const claim=()=>{if(state.claimed)return;const w=readWallet();const next={...w,coins:w.coins+reward.coins,gems:w.gems+reward.gems};const nextState={...state,claimed:true,streak:Math.min(7,state.streak+1),day:state.day>=7?1:state.day+1};saveWallet(next);const saved={...nextState};localStorage.setItem("ludo-daily-reward",JSON.stringify(saved));localStorage.setItem("ludo-reward-claimed","1");setWallet(next);setState(saved)};
 return <AppFrame back="/home"><div style={{maxWidth:720,margin:"0 auto"}}><section style={{textAlign:"center"}}><h1 style={{color:"#facc15",fontSize:38}}>DAILY REWARD</h1><p>Login everyday and win rewards!</p></section><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>{rewards.slice(0,6).map((r,n)=>{const dayNo=n+1;const claimed=dayNo<state.day;return <div key={n} style={day}><strong>Day {dayNo}</strong><div style={{fontSize:34,margin:"10px 0 3px"}}>{r.gems?"💎":"🪙"}</div><span>{r.gems?r.gems.toLocaleString():r.coins.toLocaleString()}</span>{claimed&&<small style={{display:"block",color:"#86efac"}}>✓ Claimed</small>}</div>})}</div><div style={{...day,marginTop:9,display:"flex",alignItems:"center",justifyContent:"space-around",minHeight:120,background:"linear-gradient(110deg,#2d0a55,#190a3e)"}}><div><strong>Day 7</strong><div style={{color:"#fde047",fontSize:25,fontWeight:900}}>5,000 + 💎 20</div></div><span style={{fontSize:70}}>🎁</span></div><button onClick={claim} disabled={state.claimed} style={{width:"100%",marginTop:18,padding:17,border:0,borderRadius:14,background:state.claimed?"#3f6212":"#39a51d",color:"#fff",fontWeight:950,fontSize:20}}>{state.claimed?"CLAIMED ✓":"CLAIM"}</button><p style={{textAlign:"center",color:"#64748b"}}>Current streak: {state.streak}</p>{state.claimed&&<p style={{textAlign:"center",color:"#86efac",fontWeight:800}}>Reward added to your player wallet.</p>}</div></AppFrame>
}
const day={padding:"16px 8px",borderRadius:14,border:"1px solid rgba(80,126,215,.28)",textAlign:"center" as const,color:"#fff",minHeight:132,background:"#0b1c4b"};