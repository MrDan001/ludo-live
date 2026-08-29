"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "../dbase.css";

type Event={id:string;user_id:string|null;username:string|null;email:string|null;currency:string;amount:number;balance_before:number|string;balance_after:number|string;source:string;source_ref:string|null;actor_username:string|null;status:string;reason:string|null;ip_address:string|null;user_agent:string|null;created_at:string};
const fmt=(v:any)=>Number(v||0).toLocaleString();
const date=(v:string)=>new Date(v).toLocaleString();

export default function WalletAuditPage(){
 const [events,setEvents]=useState<Event[]>([]),[suspicious,setSuspicious]=useState<Event[]>([]),[q,setQ]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=async()=>{try{const r=await fetch("/api/admin/wallet-audit?limit=500",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Admin access required.");setEvents(d.events||[]);setSuspicious(d.suspicious||[])}catch(e:any){setError(e.message||"Unable to load wallet audit.")}finally{setLoading(false)}};
 useEffect(()=>{load();const t=setInterval(load,15000);return()=>clearInterval(t)},[]);
 const filtered=events.filter(e=>{const s=q.toLowerCase();return !s||[e.username,e.email,e.currency,e.source,e.source_ref,e.status,e.actor_username].filter(Boolean).join(" ").toLowerCase().includes(s)});
 return <div className="dbase-app"><div className="dbase-main" style={{width:"100%"}}><header className="dbase-header"><Link className="admin-btn" href="/dbase">← Admin</Link><div className="header-title"><span>SECURITY & ECONOMY</span><h1>Wallet Audit</h1></div><Link className="admin-btn" href="/dbase/players-audit">Player Audits</Link></header><main className="dbase-content">
  <section className="page-intro"><div><span className="eyebrow">ANTI-CHEAT MONITOR</span><h2>Currency movement</h2><p>Every server-side change to player coins or gems is recorded with its before/after balance and source. Unexpected changes are marked for review.</p></div><button className="admin-btn" onClick={load}>↻ Refresh</button></section>
  {error?<div className="panel"><div className="empty">{error}</div></div>:null}
  <section className="stat-grid"><div className="stat-card"><div><span>Events shown</span><strong>{fmt(filtered.length)}</strong><small>latest wallet changes</small></div></div><div className="stat-card"><div><span>Needs review</span><strong>{fmt(suspicious.length)}</strong><small>unknown/unattributed source</small></div></div></section>
  {suspicious.length>0&&<section className="panel" style={{marginBottom:18}}><div className="panel-head"><div><span>ATTENTION REQUIRED</span><h3>Unattributed wallet changes</h3></div><span className="status-badge">{suspicious.length} REVIEW</span></div>{suspicious.map(e=><div className="case-row" key={`s-${e.id}`}><div><b>⚠ {e.username||"Deleted player"} · {e.amount>0?"+":""}{fmt(e.amount)} {e.currency}</b><span>Balance {fmt(e.balance_before)} → {fmt(e.balance_after)} · {date(e.created_at)}</span><span>{e.ip_address?`IP ${e.ip_address} · `:""}{e.user_agent||"No client metadata"}</span></div><span className="status-badge">REVIEW</span></div>)}</section>}
  <section className="panel"><div className="panel-head"><div><span>COMPLETE LEDGER</span><h3>Currency movement history</h3></div><input className="admin-search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search player, source, currency…"/></div>{loading?<div className="empty">Loading wallet events…</div>:filtered.length?<div>{filtered.map(e=><div className="case-row" key={e.id}><div><b>{e.amount>0?"+":""}{fmt(e.amount)} {e.currency} · {e.username||"Deleted player"}</b><span>{e.source}{e.source_ref?` · ${e.source_ref}`:""} · {date(e.created_at)}</span><span>{e.actor_username?`Actor: ${e.actor_username} · `:""}Balance {fmt(e.balance_before)} → {fmt(e.balance_after)}</span></div><span className={`status-badge ${e.status==='verified'?"":"bad"}`}>{e.status}</span></div>)}</div>:<div className="empty">No wallet events found.</div>}</section>
 </main></div></div>;
}
