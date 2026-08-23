"use client";
import { useEffect, useState } from "react";

type Achievement={
  source:string;
  period_type:string;
  title:string;
  description:string;
  reward_coins:number;
  reward_gems:number;
  claimed_at:string|null;
  period_date:string;
};

export default function MissionAchievements(){
  const [items,setItems]=useState<Achievement[]>([]);
  const [totals,setTotals]=useState({coins:0,gems:0});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  const load=async()=>{
    setLoading(true);
    try{
      const r=await fetch("/api/missions/achievements",{cache:"no-store"});
      const x=await r.json();
      if(!r.ok)throw Error(x.error||"Unable to load mission achievements.");
      setItems(x.achievements||[]);
      setTotals(x.totals||{coins:0,gems:0});
      setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to load mission achievements.")}
    finally{setLoading(false)}
  };

  useEffect(()=>{
    void load();
    const f=()=>load();
    window.addEventListener("ludo-mission-updated",f);
    return()=>window.removeEventListener("ludo-mission-updated",f);
  },[]);

  const formatDate=(value:string|null)=>value?new Date(value).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}):"";

  if(loading)return <section style={empty}>Loading your mission achievements…</section>;
  if(error)return <section style={empty}>{error}</section>;

  return <section style={{marginTop:12}}>
    <div style={summary}>
      <div><div style={eyebrow}>MISSION ACHIEVEMENTS</div><h2 style={{margin:"4px 0"}}>Everything you've won</h2><p style={muted}>Your claimed rewards from every daily and weekly mission, kept across resets.</p></div>
      <div style={count}>{items.length}<small> wins</small></div>
    </div>

    <div style={totalsCard}>
      <div><span style={muted}>Total coins won</span><strong>🪙 {totals.coins.toLocaleString()}</strong></div>
      <div><span style={muted}>Total gems won</span><strong>💎 {totals.gems.toLocaleString()}</strong></div>
    </div>

    {items.length===0?<div style={empty}><div style={{fontSize:40}}>🏆</div><h3 style={{margin:"8px 0 4px"}}>No mission wins yet</h3><p style={muted}>Complete and claim a daily or weekly mission and it will appear here permanently.</p></div>:<div style={list}>
      {items.map((x,i)=><article key={`${x.source}-${x.claimed_at}-${i}`} style={card}>
        <div style={icon}>{x.source.includes("bonus")?"🎁":"🏆"}</div>
        <div style={body}>
          <div style={top}><strong>{x.title}</strong><span style={period}>{x.period_type}</span></div>
          <div style={description}>{x.description}</div>
          <div style={bottom}><span>{formatDate(x.claimed_at||x.period_date)}</span><span>🪙 {Number(x.reward_coins||0).toLocaleString()}{x.reward_gems?` · 💎 ${x.reward_gems}`:""}</span></div>
        </div>
      </article>)}
    </div>}
  </section>
}

const summary={display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,padding:16,borderRadius:16,background:"linear-gradient(135deg,#18264f,#07162d)",border:"1px solid #3f4d8a"};
const eyebrow={fontSize:10,color:"#9b9cff",fontWeight:950,letterSpacing:2};
const count={fontSize:28,fontWeight:950,whiteSpace:"nowrap" as const};
const totalsCard={display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10};
const muted={color:"#8fa5c5",fontSize:12};
const list={display:"grid",gap:7,marginTop:10};
const card={display:"flex",gap:12,alignItems:"center",padding:"13px 10px",background:"#06162d",border:"1px solid rgba(38,83,130,.35)",borderRadius:10};
const icon={flex:"0 0 38px",width:38,height:38,borderRadius:10,display:"grid",placeItems:"center",background:"#0b2445",fontSize:21};
const body={flex:1,minWidth:0};
const top={display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,fontSize:14};
const period={fontSize:9,color:"#69adff",fontWeight:900,textTransform:"uppercase" as const,letterSpacing:1};
const description={fontSize:11,color:"#8fa5c5",marginTop:3};
const bottom={display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginTop:8,color:"#91a5c0",fontSize:11};
const empty={marginTop:12,padding:38,background:"#07172d",borderRadius:12,border:"1px solid #17385f",textAlign:"center" as const,color:"#9db0c8"};
