"use client";

import { useEffect, useMemo, useState } from "react";
import AppFrame from "../_components/AppFrame";

type Tab = "items" | "awards";
type Item = { id:string; name:string; type:string; icon?:string; rarity?:string; owned:boolean; equipped:boolean };
type Award = { source:string; period_type:string; title:string; description:string; reward_coins:number; reward_gems:number; claimed_at:string|null };

const iconForType = (type:string) => type === "board" ? "🎨" : type === "dice" ? "🎲" : type === "avatar" ? "👤" : "✨";
const awardIcon = (source:string) => source === "game_win" ? "🏆" : source === "store" ? "🛍️" : source.includes("bonus") ? "🎁" : "🎖️";

export default function InventoryPage(){
  const [tab,setTab]=useState<Tab>("items");
  const [items,setItems]=useState<Item[]>([]);
  const [awards,setAwards]=useState<Award[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState("");

  const load=async()=>{
    setLoading(true);setError("");
    try{
      const [custom,achievement]=await Promise.all([fetch("/api/customization",{cache:"no-store"}),fetch("/api/missions/achievements",{cache:"no-store"})]);
      const c=await custom.json(); const a=await achievement.json();
      if(!custom.ok) throw new Error(c.error||"Unable to load your inventory.");
      const groups=[...(c.boards||[]).map((x:any)=>({...x,type:"board",owned:(c.ownedBoards||[]).includes(x.id),equipped:c.equippedBoard===x.id})),...(c.dice||[]).map((x:any)=>({...x,type:"dice",owned:(c.ownedDice||[]).includes(x.id),equipped:c.equippedDice===x.id})),...(c.avatars||[]).map((x:any)=>({...x,type:"avatar",owned:(c.ownedAvatars||[]).includes(x.id),equipped:c.equippedAvatar===x.id})),...(c.items||[]).map((x:any)=>({...x,type:"item",owned:(c.ownedItems||[]).includes(x.id),equipped:(c.equippedItems||[]).includes(x.id)}))];
      setItems(groups.filter(x=>x.owned));
      setAwards(achievement.ok ? (a.achievements||[]) : []);
    }catch(e){setError(e instanceof Error?e.message:"Unable to load your inventory.")}finally{setLoading(false)}
  };
  useEffect(()=>{void load();const r=()=>void load();window.addEventListener("focus",r);window.addEventListener("ludo-wallet-updated",r);return()=>{window.removeEventListener("focus",r);window.removeEventListener("ludo-wallet-updated",r)}},[]);

  const groups=useMemo(()=>({board:items.filter(x=>x.type==="board"),dice:items.filter(x=>x.type==="dice"),avatar:items.filter(x=>x.type==="avatar"),item:items.filter(x=>x.type==="item")}),[items]);
  const equip=async(item:Item)=>{if(item.equipped||busy===item.id)return;setBusy(item.id);try{const r=await fetch("/api/customization",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:item.type,id:item.id,action:"equip"})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to equip item.");await load();window.dispatchEvent(new Event("ludo-wallet-updated"))}catch(e){setError(e instanceof Error?e.message:"Unable to equip item.")}finally{setBusy("")}};

  return <AppFrame back="/home"><main style={page}>
    <header style={header}><div><div style={eyebrow}>PLAYER COLLECTION</div><h1 style={title}>🎒 Inventory</h1><p style={subtitle}>Everything you own, plus the awards you have earned.</p></div></header>
    <div style={tabs}><button style={{...tabStyle,...(tab==="items"?tabActive:{})}} onClick={()=>setTab("items")}>🎒 MY ITEMS</button><button style={{...tabStyle,...(tab==="awards"?awardActive:{})}} onClick={()=>setTab("awards")}>🏆 AWARD ROOM</button></div>
    {error&&<div style={errorBox}>{error}</div>}
    {loading?<div style={empty}>Loading your collection…</div>:tab==="items"?<>
      {(["board","dice","avatar","item"] as const).map(type=>groups[type].length>0&&<section key={type} style={section}><h2 style={sectionTitle}>{type==="board"?"🎨 Boards":type==="dice"?"🎲 Dice":type==="avatar"?"👤 Avatars":"✨ Items"}</h2><div style={grid}>{groups[type].map(item=><article key={`${item.type}:${item.id}`} style={card}><div style={icon}>{item.icon||iconForType(item.type)}</div><b>{item.name}</b><small>{item.rarity||item.type.toUpperCase()}</small>{item.equipped?<span style={equipped}>✓ EQUIPPED</span>:<button style={equipBtn} disabled={busy===item.id} onClick={()=>void equip(item)}>{busy===item.id?"…":"EQUIP"}</button>}</article>)}</div></section>)}
      {items.length===0&&<div style={empty}><div style={{fontSize:44}}>🎒</div><h2>No acquired items yet</h2><p>Items you successfully purchase from the Shop will appear here.</p><a href="/shop" style={shopLink}>OPEN SHOP</a></div>}
    </>:<section style={awardRoom}><div style={trophyHero}>🏆<div><h2>Award Room</h2><p>Your permanent collection of earned badges, trophies and rewards.</p></div></div>{awards.length===0?<div style={empty}><div style={{fontSize:44}}>🏆</div><h2>No awards yet</h2><p>Win tournaments, complete achievements and earn rewards to build your collection.</p></div>:<div style={awardGrid}>{awards.map((a,i)=><article key={`${a.source}-${a.claimed_at}-${i}`} style={awardCard}><div style={awardIconStyle}>{awardIcon(a.source)}</div><div style={{flex:1,minWidth:0}}><b>{a.title}</b><p>{a.description}</p><small>{a.period_type}{a.claimed_at?` • ${new Date(a.claimed_at).toLocaleDateString()}`:""}</small></div><div style={awardReward}>{a.reward_coins?`🪙 +${Number(a.reward_coins).toLocaleString()}`:""}{a.reward_gems?` 💎 +${Number(a.reward_gems).toLocaleString()}`:""}</div></article>)}</div>}</section>}
  </main></AppFrame>
}

const page={maxWidth:760,margin:"0 auto",paddingBottom:45};
const header={marginBottom:14};
const eyebrow={fontSize:11,letterSpacing:2,fontWeight:950,color:"#60a5fa"};
const title={fontSize:"clamp(30px,7vw,42px)",margin:"4px 0 0",fontWeight:950};
const subtitle={color:"#94a3b8",margin:"6px 0 0",fontSize:13};
const tabs={display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,padding:5,borderRadius:14,background:"#07162d",border:"1px solid #17345d"};
const tabStyle={border:0,borderRadius:10,padding:"12px 8px",color:"#fff",background:"transparent",fontSize:11,fontWeight:950,cursor:"pointer"};
const tabActive={background:"#1769e8"};
const awardActive={background:"linear-gradient(135deg,#8b4dff,#d6a126)"};
const section={marginTop:18};
const sectionTitle={fontSize:17,margin:"0 0 9px"};
const grid={display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9};
const card={minHeight:145,padding:12,borderRadius:15,background:"linear-gradient(145deg,#0b2342,#071327)",border:"1px solid #173a63",display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",textAlign:"center" as const,gap:4};
const icon={width:58,height:58,borderRadius:16,display:"grid",placeItems:"center",background:"#102b52",fontSize:31};
const equipBtn={marginTop:5,border:0,borderRadius:9,padding:"8px 13px",background:"#1769e8",color:"#fff",fontWeight:900,fontSize:10,cursor:"pointer"};
const equipped={marginTop:5,color:"#5fe38a",fontSize:10,fontWeight:950};
const empty={marginTop:14,padding:40,borderRadius:16,background:"#07162d",border:"1px solid #17345d",textAlign:"center" as const,color:"#94a3b8"};
const shopLink={display:"inline-block",marginTop:10,padding:"10px 16px",borderRadius:10,background:"#1769e8",color:"#fff",textDecoration:"none",fontWeight:900,fontSize:11};
const errorBox={marginTop:10,padding:10,borderRadius:10,background:"#3b1020",border:"1px solid #7f2842",color:"#fecdd3",fontSize:12};
const awardRoom={marginTop:16};
const trophyHero={display:"flex",alignItems:"center",gap:14,padding:18,borderRadius:16,background:"linear-gradient(135deg,#28195a,#5b2d12)",border:"1px solid #6d4a8d"};
const awardGrid={display:"grid",gap:9,marginTop:12};
const awardCard={display:"flex",alignItems:"center",gap:12,padding:14,borderRadius:14,background:"#071a40",border:"1px solid rgba(78,125,211,.22)"};
const awardIconStyle={width:52,height:52,borderRadius:14,display:"grid",placeItems:"center",background:"#172a50",fontSize:29,flex:"0 0 52px"};
const awardReward={fontSize:11,color:"#dbe8f8",textAlign:"right" as const};