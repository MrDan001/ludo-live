"use client";
import { useEffect, useState } from "react";
import AppFrame from "../_components/AppFrame";

type Wallet={coins:number;gems:number;spins:number;mystery:number};
const dice=[
 ["⚪","Classic Dice",true],["🎲","Fire Dice",false],["🔵","Ice Dice",false],["🟡","Gold Dice",false],
 ["🟣","Neon Dice",false],["🟠","Cube Dice",false],["🔷","Crystal Dice",false],["⚫","Skull Dice",false],
 ["🔮","Galaxy Dice",false],["💗","Heart Dice",false],["⚙️","Robot Dice",false],["🟢","Lucky Dice",false]
];
export default function InventoryPage(){const [tab,setTab]=useState("Dice");const [wallet,setWallet]=useState<Wallet>({coins:25680,gems:320,spins:0,mystery:0});useEffect(()=>{const r=()=>{try{setWallet({...wallet,...JSON.parse(localStorage.getItem("ludo-wallet")||"{}")})}catch{}};r();window.addEventListener("ludo-wallet-updated",r);window.addEventListener("storage",r);return()=>{window.removeEventListener("ludo-wallet-updated",r);window.removeEventListener("storage",r)}},[]);return <AppFrame back="/home"><main style={page}><header style={header}><div><div style={eyebrow}>PLAYER INVENTORY</div><h1 style={title}>Inventory</h1></div><div style={wallet}>{wallet.coins.toLocaleString()} 🪙<br/><span>{wallet.gems.toLocaleString()} 💎</span></div></header><div style={tabs}>{["Dice","Boards","Avatar","Friends"].map(t=><button key={t} onClick={()=>setTab(t)} style={{...tab,background:tab===t?"#1769e8":"#0d1f39"}}>{t}</button>)}</div>{tab==="Dice"?<><section style={grid}>{dice.map(([icon,name,owned])=><article key={name} style={{...item,opacity:owned?1:.82}}><div style={{fontSize:42,filter:owned?"none":"grayscale(.45)"}}>{icon}</div><b>{name}</b>{owned?<span style={ownedTag}>✓ Owned</span>:<span style={locked}>🔒</span>}</article>)}</section><div style={hint}>Collect more dice from events, missions and the shop.</div></>:<section style={empty}><div style={{fontSize:42}}>✨</div><h2>{tab}</h2><p>Customize this part of your player inventory as you unlock more items.</p></section>}</main></AppFrame>}
const page={maxWidth:720,margin:"0 auto",paddingBottom:45};
const header={display:"flex",justifyContent:"space-between",alignItems:"center",gap:12};
const eyebrow={fontSize:12,letterSpacing:2,fontWeight:950,color:"#60a5fa"};
const title={fontSize:38,margin:"4px 0 0",fontWeight:950};
const wallet={textAlign:"right" as const,fontSize:12,color:"#f5c84b",fontWeight:900};
const tabs={display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,padding:5,borderRadius:12,background:"#07162d",border:"1px solid #17345d",marginTop:14};
const tab={border:0,borderRadius:8,padding:"10px 3px",color:"#fff",fontSize:11,fontWeight:900,cursor:"pointer"};
const grid={display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginTop:12};
const item={minHeight:115,padding:"9px 4px",borderRadius:10,background:"linear-gradient(145deg,#0b2342,#071327)",border:"1px solid #173a63",display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",textAlign:"center" as const,position:"relative" as const};
const ownedTag={marginTop:5,color:"#65dc80",fontSize:9,fontWeight:900};
const locked={position:"absolute" as const,right:6,top:5,fontSize:11};
const hint={marginTop:15,padding:13,borderRadius:9,background:"#102c50",textAlign:"center" as const,color:"#9fb0c9",fontSize:12};
const empty={marginTop:14,padding:42,borderRadius:14,background:"#07162d",textAlign:"center" as const,color:"#9fb0c9"};
