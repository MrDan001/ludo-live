"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import AppFrame from "../_components/AppFrame";

const friends=["Neha123","Aman","Karan","Riya","Vikram","Pooja"];
const quick=["👋 Hi!","😂 LOL","🔥 Nice!","😮 Wow!","👏 Good move","🎉 GG","❤️","😎"];
const tabs=["friends","chat","tournament","spin","events","leaderboard","inbox","inventory","missions","history"];

function SocialContent(){
 const params=useSearchParams();
 const initial=params.get("tab")||"friends";
 const [tab,setTab]=useState(tabs.includes(initial)?initial:"friends");
 const [message,setMessage]=useState("");
 const [messages,setMessages]=useState(["Neha123: Good luck!","Aman: Thanks!","Karan: Let's play well."]);
 const [spin,setSpin]=useState<string|null>(null);
 const [claimed,setClaimed]=useState<string[]>([]);
 const [query,setQuery]=useState("");
 const filtered=useMemo(()=>friends.filter(x=>x.toLowerCase().includes(query.toLowerCase())),[query]);
 const send=()=>{if(!message.trim())return;setMessages(m=>[...m,`PlayerOne: ${message.trim()}`]);setMessage("")};
 const spinNow=()=>{const rewards=["1,000 🪙","5 💎","5,000 🪙","15 💎","2,000 🪙","10 💎"];setSpin(rewards[Math.floor(Math.random()*rewards.length)])};
 const claim=(x:string)=>setClaimed(c=>c.includes(x)?c:c.concat(x));
 return <AppFrame back="/home"><div style={{maxWidth:980,margin:"0 auto"}}>
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><h1 style={{marginBottom:4,fontSize:34}}>Ludo Social</h1><p style={{color:"#94a3b8",marginTop:0}}>Friends, chat, competition and rewards — all connected to your game.</p></div><Link href="/lobby" style={primary}>🎮 Play</Link></header>
  <div style={tabBar}>{tabs.map(t=><button key={t} onClick={()=>setTab(t)} style={{...tabBtn,background:tab===t?"#2563eb":"transparent",color:tab===t?"#fff":"#94a3b8"}}>{t[0].toUpperCase()+t.slice(1)}</button>)}</div>
  {tab==="friends"&&<Section title="Friends List"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="🔎 Search players" style={input}/><div style={grid}>{filtered.map((f,i)=><Card key={f}><div style={avatar}>{["👩🏻","🧔🏽","👨🏽","👩🏽","🧑🏾","👩🏾"][i]}</div><div style={{flex:1}}><b>{f}</b><div style={{color:"#4ade80",fontSize:12}}>● Online · Level {20+i+1}</div></div><button style={smallGreen}>Invite</button><button style={smallBlue}>Join</button></Card>)}</div><button style={{...primary,marginTop:12}} onClick={()=>setTab("add")}>＋ Add Friend</button></Section>}
  {tab==="add"&&<Section title="Add Friend"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Enter Player ID" style={input}/><Card><div style={avatar}>🧑🏽</div><div style={{flex:1}}><b>{query||"PlayerTwo"}</b><div style={{color:"#94a3b8",fontSize:12}}>ID: 9876ABCD · 145 games · 68% win rate</div></div><button style={smallGreen}>Send Request</button></Card></Section>}
  {tab==="chat"&&<Section title="Room Chat"><div style={chatBox}>{messages.map((m,i)=><div key={i} style={bubble}>{m}</div>)}</div><div style={quickRow}>{quick.map(q=><button key={q} onClick={()=>setMessages(m=>[...m,`PlayerOne: ${q}`])} style={quickBtn}>{q}</button>)}</div><div style={{display:"flex",gap:8}}><input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Type a message…" style={input}/><button onClick={send} style={sendBtn}>➤</button></div></Section>}
  {tab==="tournament"&&<Section title="Grand Tournament"><Hero icon="🏆" title="GRAND TOURNAMENT" subtitle="Ends in 2d 14h 30m"/><div style={stats}><Stat label="Prize Pool" value="100,000 🪙"/><Stat label="Gems" value="2,000 💎"/><Stat label="Entry Fee" value="1,000 🪙"/><Stat label="Players" value="256 / 512"/></div><p>Rules · 4 Players · Standard rules · Top 3 win prizes</p><button style={primary}>Join Tournament</button></Section>}
  {tab==="spin"&&<Section title="Spin Wheel"><div style={{display:"grid",placeItems:"center",padding:20}}><div style={wheel}>🎁<span>SPIN</span></div><button style={primary} onClick={spinNow}>SPIN NOW</button>{spin&&<div style={{marginTop:14,color:"#facc15",fontWeight:900}}>You won {spin}!</div>}</div></Section>}
  {tab==="events"&&<Section title="Events"><div style={grid}>{[["🎁","Login & Win","Login every day & win rewards"],["🎲","Dice Challenge","Win matches to earn points"],["🪙","Weekend Bonanza","Extra coins on weekend!"],["💎","Gem Rush","Collect gems in special modes"]].map(([i,t,s])=><Card key={t}><span style={{fontSize:30}}>{i}</span><div style={{flex:1}}><b>{t}</b><div style={{fontSize:12,color:"#94a3b8"}}>{s}</div></div><span>🎁</span></Card>)}</div></Section>}
  {tab==="leaderboard"&&<Section title="Global Leaderboard"><div style={list}>{["KingPlayer","LudoMaster","QueenLudo","LuckyStar","ProGamer","PlayerOne"].map((n,i)=><Card key={n}><b style={{width:30}}>{i+1}</b><span style={avatarSmall}>🧑🏽</span><div style={{flex:1}}><b>{n}</b><div style={{fontSize:12,color:"#94a3b8"}}>Level {40-i}</div></div><strong>{[12540,10230,9875,8660,7890,1240][i].toLocaleString()} wins</strong></Card>)}</div></Section>}
  {tab==="inbox"&&<Section title="Inbox"><div style={list}>{["Daily Reward","Tournament Reward","Friend Request Accepted","System Update","Event Reward"].map((n,i)=><Card key={n}><span style={{fontSize:25}}>{i===3?"⚙️":"🎁"}</span><div style={{flex:1}}><b>{n}</b><div style={{fontSize:12,color:"#94a3b8"}}>{i===2?"Aman accepted your request.":"You have a new reward waiting."}</div></div><span style={{color:"#64748b",fontSize:11}}>{i+2}m</span></Card>)}</div><button style={primary}>Claim All</button></Section>}
  {tab==="inventory"&&<Section title="Inventory"><div style={grid}>{["⚪ Classic Dice","🔴 Fire Dice","🔵 Ice Dice","🟡 Gold Dice","🟣 Neon Dice","🟠 Cube Dice","🔷 Crystal Dice","💀 Skull Dice","🌌 Galaxy Dice","💗 Heart Dice","🤖 Robot Dice","🟢 Lucky Dice"].map(x=><Card key={x}><span style={{fontSize:28}}>{x.split(" ")[0]}</span><b>{x.substring(x.indexOf(" ")+1)}</b></Card>)}</div></Section>}
  {tab==="missions"&&<Section title="Missions"><div style={list}>{[["Win 3 matches","2 / 3","1,000 🪙"],["Play 5 matches","5 / 5","1,000 🪙"],["Win a match with 4 players","1 / 1","1,000 🪙"],["Collect 500 coins","200 / 500","1,000 🪙"],["Use spin wheel 2 times","1 / 2","500 🪙"]].map(([t,p,r])=><Card key={t}><span style={{fontSize:22}}>{p==="5 / 5"||p==="1 / 1"?"✅":"🟡"}</span><div style={{flex:1}}><b>{t}</b><div style={{height:7,background:"#172554",borderRadius:9,marginTop:7}}><div style={{height:"100%",width:p.startsWith("5")||p==="1 / 1"?"100%":"55%",background:"#22c55e",borderRadius:9}}/></div><small style={{color:"#94a3b8"}}>{p}</small></div><button style={smallGreen} onClick={()=>claim(t)}>{claimed.includes(t)?"Claimed":"Claim"}</button></Card>)}</div></Section>}
  {tab==="history"&&<Section title="Match History"><div style={list}>{["Victory · vs Neha123, Aman, Karan","Defeat · vs Aman, Riya, Vikram","Victory · vs Pooja, Karan, Rahul","Victory · vs Neha123, Sneha, Aman","Defeat · vs Vikram, Riya, Pooja"].map((x,i)=><Card key={x}><span style={{fontSize:25}}>{i===1||i===4?"❌":"🏆"}</span><div style={{flex:1}}><b>{x}</b><div style={{fontSize:11,color:"#64748b"}}>Today · 10:{30-i} AM</div></div><strong style={{color:i===1||i===4?"#f87171":"#4ade80"}}>{i===1||i===4?"-50":"+100"} 🪙</strong></Card>)}</div></Section>}
 </div></AppFrame>
}
function Section({title,children}:{title:string;children:ReactNode}){return <section style={{marginTop:18,padding:18,borderRadius:20,background:"linear-gradient(145deg,#071b3c,#050d20)",border:"1px solid rgba(96,165,250,.18)"}}><h2 style={{marginTop:0}}>{title}</h2>{children}</section>}
function Card({children}:{children:ReactNode}){return <div style={{display:"flex",alignItems:"center",gap:12,padding:12,borderRadius:14,background:"rgba(15,31,62,.78)",border:"1px solid rgba(96,165,250,.12)"}}>{children}</div>}
function Hero({icon,title,subtitle}:{icon:string;title:string;subtitle:string}){return <div style={{padding:28,textAlign:"center",borderRadius:18,background:"linear-gradient(135deg,#43106d,#102b68)"}}><div style={{fontSize:64}}>{icon}</div><h2>{title}</h2><span style={{color:"#facc15"}}>{subtitle}</span></div>}
function Stat({label,value}:{label:string;value:string}){return <div style={{padding:14,borderRadius:12,background:"#08172f"}}><small style={{color:"#64748b"}}>{label}</small><div style={{fontWeight:900,marginTop:5}}>{value}</div></div>}
const grid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:10};
const list={display:"grid",gap:9};
const stats={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:9,marginTop:14};
const input={width:"100%",boxSizing:"border-box" as const,padding:13,borderRadius:11,border:"1px solid #334155",background:"#071225",color:"#fff",marginBottom:12};
const tabBar={display:"flex",gap:6,overflowX:"auto" as const,padding:"12px 0",marginTop:8};
const tabBtn={border:0,borderRadius:999,padding:"8px 12px",whiteSpace:"nowrap" as const,cursor:"pointer",fontWeight:800};
const primary={display:"inline-block",border:0,borderRadius:11,padding:"11px 16px",background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",fontWeight:900,textDecoration:"none",cursor:"pointer"};
const smallGreen={border:0,borderRadius:9,padding:"8px 10px",background:"#22c55e",color:"#fff",fontWeight:800,cursor:"pointer"};
const smallBlue={border:0,borderRadius:9,padding:"8px 10px",background:"#2563eb",color:"#fff",fontWeight:800,cursor:"pointer"};
const quickBtn={border:"1px solid #334155",borderRadius:999,padding:"7px 10px",background:"#0b1730",color:"#fff",cursor:"pointer"};
const quickRow={display:"flex",gap:6,flexWrap:"wrap" as const,margin:"10px 0"};
const chatBox={minHeight:250,display:"grid",alignContent:"start",gap:9,padding:12,borderRadius:14,background:"#020b1c"};
const bubble={padding:"10px 12px",borderRadius:12,background:"#10264b",width:"fit-content",maxWidth:"90%"};
const sendBtn={border:0,borderRadius:11,padding:"0 18px",background:"#2563eb",color:"#fff",fontWeight:900};
const avatar={width:44,height:44,borderRadius:"50%",display:"grid",placeItems:"center",fontSize:26,background:"#102b58"};
const avatarSmall={width:36,height:36,borderRadius:"50%",display:"grid",placeItems:"center",background:"#102b58"};
const wheel={width:190,height:190,borderRadius:"50%",display:"grid",placeItems:"center",fontSize:45,background:"conic-gradient(#f59e0b 0 12.5%,#7c3aed 12.5% 25%,#22c55e 25% 37.5%,#2563eb 37.5% 50%,#f59e0b 50% 62.5%,#7c3aed 62.5% 75%,#22c55e 75% 87.5%,#2563eb 87.5% 100%)",border:"8px solid #facc15",boxShadow:"0 0 35px rgba(59,130,246,.35)",color:"#fff"};

export default function SocialPage(){return <Suspense fallback={<AppFrame back="/home"><p>Loading social hub…</p></AppFrame>}><SocialContent/></Suspense>}
