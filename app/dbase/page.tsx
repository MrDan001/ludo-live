"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import "./dbase.css";

type Player={id:string;username:string;email?:string|null;coins:number|string;gems:number|string};
const n=(v:any)=>Number(v||0).toLocaleString();
export default function AdminDashboard(){
 const [players,setPlayers]=useState<Player[]>([]),[q,setQ]=useState(""),[msg,setMsg]=useState("");
 const load=async()=>{const r=await fetch("/api/admin/players",{cache:"no-store"});if(r.ok){const d=await r.json();setPlayers(d.players||[])}};
 useEffect(()=>{load()},[]);
 const change=async(id:string,currency:"coins"|"gems",amount:number)=>{setMsg("");const r=await fetch("/api/admin/players/wallet",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({playerId:id,currency,amount})});const d=await r.json();setMsg(r.ok?`${currency} updated successfully.`:(d.error||"Update failed."));if(r.ok)load()};
 const filtered=players.filter(p=>`${p.username} ${p.email||""}`.toLowerCase().includes(q.toLowerCase()));
 return <div className="dbase-app"><div className="dbase-main" style={{width:"100%"}}><header className="dbase-header"><Link className="admin-btn" href="/dbase">← Admin</Link><div className="header-title"><span>ADMINISTRATION</span><h1>Player Management</h1></div><div/></header><main className="dbase-content"><section className="page-intro"><div><span className="eyebrow">PLAYER MANAGEMENT</span><h2>Manage player wallets</h2><p>Add or remove coins and gems from a player wallet. Every change is recorded in the wallet audit ledger.</p></div><Link className="admin-btn" href="/dbase/wallet-audit">Wallet Audit</Link></section>{msg&&<div className="panel"><div className="empty">{msg}</div></div>}<section className="panel"><div className="panel-head"><div><span>PLAYERS</span><h3>Player wallets</h3></div><input className="admin-search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search player…"/></div>{filtered.map(p=><div className="case-row" key={p.id}><div><b>{p.username}</b><span>{p.email||""}</span><span>💰 {n(p.coins)} coins · 💎 {n(p.gems)} gems</span></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="admin-btn" onClick={()=>{const x=prompt("Coins amount (+ add, - remove)","0");if(x)change(p.id,"coins",Number(x))}}>💰 Coins</button><button className="admin-btn" onClick={()=>{const x=prompt("Gems amount (+ add, - remove)","0");if(x)change(p.id,"gems",Number(x))}}>💎 Gems</button></div></div>)}</section></main></div></div>
}