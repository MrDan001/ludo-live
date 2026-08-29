"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import "./dbase.css";

type User = { id:string; username:string; email:string|null; coins:number; gems:number; xp:number; level:number; is_guest:boolean; is_banned:boolean; created_at:string; last_seen_at:string|null };
type Data = { admin?:{username:string;email:string|null}; stats?:{total:number;registered:number;guests:number;banned:number;coins:number|string;gems:number|string}; online?:number; users?:User[]; actions?:any[]; disputes?:any[]; tournaments?:any[]; visits?:any[] };

const sections = [
  ["Overview","Dashboard","/dbase","⌂"], ["Players","Players","/dbase/players","♟"], ["Players","Wallet Audit","/dbase/wallet-audit","◉"], ["Economy","Economy","/dbase/economy","◈"], ["Analytics","Visitors","/dbase/visitors","◒"], ["Moderation","Disputes","/dbase/disputes","⚑"], ["Moderation","Audit Log","/dbase/audit","◷"], ["Catalogue","Shop","/dbase/shop","▣"], ["Catalogue","Boards","/dbase/boards","▤"], ["Catalogue","Dice","/dbase/dice","◆"], ["Catalogue","Avatars","/dbase/avatars","●"], ["Catalogue","Yards","/dbase/yards","▧"], ["Rewards","Spin Wheel","/dbase/spin","✦"], ["Live Ops","Missions","/dbase/missions","✓"], ["Live Ops","Events","/dbase/events","◇"], ["Live Ops","Tournament","/dbase/tournament","♛"], ["Finance","Finance","/dbase/finance","₦"], ["Support","Support","/dbase/support","?"],
] as const;

function fmt(value:number|string|undefined){ return Number(value||0).toLocaleString(); }
function ago(value:string|null|undefined){ if(!value)return "—"; const n=Date.now()-new Date(value).getTime(); const m=Math.max(0,Math.floor(n/60000)); if(m<1)return "now"; if(m<60)return `${m}m ago`; const h=Math.floor(m/60); if(h<24)return `${h}h ago`; return `${Math.floor(h/24)}d ago`; }

export default function AdminDashboard(){
  const pathname=usePathname();
  const [open,setOpen]=useState(false), [data,setData]=useState<Data|null>(null), [loading,setLoading]=useState(true), [error,setError]=useState("");
  const active=useMemo(()=>sections.find(s=>s[2]===pathname)?.[1]||"Dashboard",[pathname]);

  useEffect(()=>{ let alive=true; const load=async()=>{ try{ setLoading(true); const r=await fetch("/api/admin",{cache:"no-store"}); const d=await r.json(); if(!alive)return; if(!r.ok){setError(d?.error||"Admin access required.");return;} setData(d); }catch{ if(alive)setError("Unable to reach the Admin service."); }finally{if(alive)setLoading(false)} }; load(); const t=setInterval(load,30000); return()=>{alive=false;clearInterval(t)} },[]);

  async function logout(){ await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout"})}); window.location.href="/"; }

  if(error) return <main className="dbase-auth"><div className="auth-card"><div className="shield">🛡️</div><h1>Admin access required</h1><p>{error}</p><Link className="primary" href="/">Return to Ludo Live</Link><small>Sign in with an account configured in the server Admin allow-list, then open <b>/dbase</b> again.</small></div></main>;
  if(loading || !data) return <main className="dbase-loading"><div className="loader-ring"/><strong>Checking Admin access…</strong></main>;

  const stats=data.stats||{total:0,registered:0,guests:0,banned:0,coins:0,gems:0};
  const cards=[ ["Total players",fmt(stats.total),"registered + guests","♟"],["Online now",fmt(data.online),"last 2 minutes","●"],["Coins in circulation",fmt(stats.coins),"all player balances","◈"],["Gems in circulation",fmt(stats.gems),"all player balances","◆"],["Tournaments",fmt(data.tournaments?.length),"configured","♛"],["Open disputes",fmt((data.disputes||[]).filter(x=>x.status!=="resolved"&&x.status!=="closed").length),"needs attention","⚑"] ];
  const recent=(data.users||[]).slice(0,6), actions=(data.actions||[]).slice(0,6), disputes=(data.disputes||[]).filter(x=>x.status!=="resolved"&&x.status!=="closed").slice(0,5), tournaments=(data.tournaments||[]).slice(0,5);

  return <div className="dbase-app">
    <aside className={`dbase-sidebar ${open?"is-open":""}`}>
      <div className="brand"><div className="brand-mark">♟</div><div><b>LUDO LIVE</b><span>ADMIN CONTROL</span></div></div>
      <nav>{sections.map(([group,label,href,icon])=><div key={href} className="nav-wrap"><small>{sections.findIndex(x=>x[0]===group)===sections.findIndex(x=>x[0]===group)&&sections.findIndex(x=>x[1]===label)===sections.findIndex(x=>x[0]===group)?group:""}</small><Link href={href} className={active===label?"active":""} onClick={()=>setOpen(false)}><i>{icon}</i><span>{label}</span></Link></div>)}</nav>
      <button className="logout side-logout" onClick={logout}>↪ <span>Sign out</span></button>
    </aside>
    {open&&<button aria-label="Close navigation" className="scrim" onClick={()=>setOpen(false)}/>}
    <div className="dbase-main">
      <header className="dbase-header"><button className="hamburger" onClick={()=>setOpen(true)} aria-label="Open Admin navigation"><span/><span/><span/></button><div className="header-title"><span>ADMIN CONTROL</span><h1>{active}</h1></div><div className="admin-user"><div className="user-avatar">{(data.admin?.username||"A").slice(0,1).toUpperCase()}</div><div className="user-copy"><b>{data.admin?.username||"Admin"}</b><span>{data.admin?.email||"Authorized administrator"}</span></div><button className="logout" onClick={logout} title="Sign out">↪</button></div></header>
      <main className="dbase-content">
        <section className="page-intro"><div><span className="eyebrow">CONTROL CENTER</span><h2>Good to see you, {data.admin?.username||"Admin"}.</h2><p>Monitor Ludo Live and manage players, economy, catalogue, rewards and live operations from one place.</p></div><div className="live-pill"><span/> LIVE DATA</div></section>
        <section className="stat-grid">{cards.map(([title,value,sub,icon])=><Link href={title==="Total players"?"/dbase/players":title==="Open disputes"?"/dbase/disputes":"/dbase"} className="stat-card" key={title}><div className="stat-icon">{icon}</div><div><span>{title}</span><strong>{value}</strong><small>{sub}</small></div></Link>)}</section>
        <section className="quick-grid"><Link href="/dbase/players"><b>Player management</b><span>Balances, moderation and permanent deletion</span><em>→</em></Link><Link href="/dbase/wallet-audit"><b>Wallet Audit</b><span>Trace every coin and gem movement</span><em>→</em></Link><Link href="/dbase/spin"><b>Spin Wheel</b><span>Rewards, weights and eligible Shop items</span><em>→</em></Link><Link href="/dbase/support"><b>Support</b><span>Player cases and admin replies</span><em>→</em></Link></section>
        <section className="panel-grid">
          <div className="panel"><div className="panel-head"><div><span>PLAYERS</span><h3>Recent players</h3></div><Link href="/dbase/players">View all →</Link></div><div className="player-list">{recent.length?recent.map(u=><div className="player-row" key={u.id}><div className="mini-avatar">{u.username.slice(0,1).toUpperCase()}</div><div className="row-main"><b>{u.username}</b><span>Level {u.level} · {u.email||"Guest account"}</span></div><div className="row-meta"><b>{fmt(u.coins)} 🪙</b><span className={u.is_banned?"bad":"good"}>{u.is_banned?"Banned":ago(u.last_seen_at)}</span></div></div>):<div className="empty">No players found.</div>}</div></div>
          <div className="panel"><div className="panel-head"><div><span>ADMIN ACTIVITY</span><h3>Recent actions</h3></div><Link href="/dbase/audit">Audit log →</Link></div><div className="activity-list">{actions.length?actions.map(a=><div className="activity" key={a.id}><div className="activity-dot">✓</div><div><b>{String(a.action||"Admin action").replaceAll("_"," ")}</b><span>{a.target_username?`Target: ${a.target_username}`:"System action"}</span></div><time>{ago(a.created_at)}</time></div>):<div className="empty">No admin activity yet.</div>}</div></div>
        </section>
        <section className="panel-grid lower">
          <div className="panel"><div className="panel-head"><div><span>MODERATION</span><h3>Open disputes</h3></div><Link href="/dbase/disputes">Manage →</Link></div>{disputes.length?disputes.map(d=><div className="case-row" key={d.id}><div><b>Case #{d.id}</b><span>{d.username||"Unknown player"} · {ago(d.updated_at||d.created_at)}</span></div><span className="status-badge">{d.status||"open"}</span></div>):<div className="empty">All clear — no open disputes.</div>}</div>
          <div className="panel"><div className="panel-head"><div><span>LIVE OPS</span><h3>Tournaments</h3></div><Link href="/dbase/tournament">Manage →</Link></div>{tournaments.length?tournaments.map(t=><div className="case-row" key={t.id}><div><b>{t.name}</b><span>{t.players_count||0}/{t.max_players||0} players</span></div><span className={`status-badge ${String(t.status)==="live"?"live":""}`}>{t.status||"draft"}</span></div>):<div className="empty">No tournaments configured.</div>}</div>
        </section>
      </main>
    </div>
  </div>;
}
