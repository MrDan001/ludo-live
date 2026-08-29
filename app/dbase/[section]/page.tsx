"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import "../dbase.css";

type AdminData = {
  stats?: { total?: number; registered?: number; guests?: number; banned?: number; coins?: number | string; gems?: number | string };
  online?: number;
  users?: Array<{ id: string; username: string; email?: string | null; coins?: number; gems?: number; level?: number; is_guest?: boolean; is_banned?: boolean; created_at?: string; last_seen_at?: string | null }>;
  actions?: any[];
  disputes?: any[];
  tournaments?: any[];
  visits?: any[];
};

const pages: Record<string, { title: string; eyebrow: string; description: string; icon: string }> = {
  players: { title: "Players", eyebrow: "PLAYER MANAGEMENT", description: "View player accounts, balances, levels, activity and moderation status.", icon: "♟" },
  economy: { title: "Economy", eyebrow: "GAME ECONOMY", description: "Monitor coins, gems and the movement of value across Ludo Live.", icon: "◈" },
  visitors: { title: "Visitors", eyebrow: "ANALYTICS", description: "Review traffic, recent visits and activity across the platform.", icon: "◒" },
  disputes: { title: "Disputes", eyebrow: "MODERATION", description: "Review player disputes and keep unresolved cases visible to Admin.", icon: "⚑" },
  audit: { title: "Audit Log", eyebrow: "SECURITY", description: "Track recent administrative actions and operational changes.", icon: "◷" },
  shop: { title: "Shop", eyebrow: "CATALOGUE", description: "Manage the items players can discover and purchase in the shop.", icon: "▣" },
  boards: { title: "Boards", eyebrow: "CATALOGUE", description: "Manage Ludo board themes and availability.", icon: "▤" },
  dice: { title: "Dice", eyebrow: "CATALOGUE", description: "Manage dice styles and catalogue availability.", icon: "◆" },
  avatars: { title: "Avatars", eyebrow: "CATALOGUE", description: "Manage player avatars and their catalogue state.", icon: "●" },
  yards: { title: "Yards", eyebrow: "CATALOGUE", description: "Manage yard backgrounds, backgroundless assets and unlocks.", icon: "▧" },
  spin: { title: "Spin Wheel", eyebrow: "REWARDS", description: "Configure spin rewards including coins, gems and item prizes.", icon: "✦" },
  missions: { title: "Missions", eyebrow: "LIVE OPS", description: "Manage missions, objectives and player reward targets.", icon: "✓" },
  events: { title: "Events", eyebrow: "LIVE OPS", description: "Manage limited-time events and their live status.", icon: "◇" },
  tournament: { title: "Tournament", eyebrow: "LIVE OPS", description: "Monitor tournament configuration, participation and status.", icon: "♛" },
  finance: { title: "Finance", eyebrow: "FINANCE", description: "Review financial activity and economy-related records.", icon: "₦" },
  support: { title: "Support", eyebrow: "SUPPORT", description: "Keep player support activity organized and visible.", icon: "?" },
};

const quick = [
  ["players", "Players"], ["economy", "Economy"], ["shop", "Shop"], ["spin", "Spin Wheel"],
  ["yards", "Yards"], ["missions", "Missions"], ["events", "Events"], ["tournament", "Tournament"],
];

function fmt(value: unknown) { return Number(value || 0).toLocaleString(); }
function date(value?: string | null) { return value ? new Date(value).toLocaleString() : "—"; }

export default function AdminSectionPage() {
  const params = useParams<{ section: string }>();
  const section = String(params.section || "").toLowerCase();
  const meta = pages[section];
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/admin", { cache: "no-store" })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d?.error || "Admin access required."); return d; })
      .then(d => alive && setData(d))
      .catch(e => alive && setError(e.message || "Unable to load Admin data."));
    return () => { alive = false; };
  }, []);

  const users = data?.users || [];
  const stats = data?.stats || {};
  const rows = useMemo(() => {
    if (section === "players") return users.slice(0, 25).map(u => ({ title: u.username, sub: u.email || (u.is_guest ? "Guest account" : "Registered account"), meta: `Lv ${u.level || 1} · ${fmt(u.coins)} coins`, status: u.is_banned ? "Banned" : "Active" }));
    if (section === "economy") return users.slice(0, 20).map(u => ({ title: u.username, sub: `Player ${u.id.slice(0, 8)}`, meta: `${fmt(u.coins)} coins · ${fmt(u.gems)} gems`, status: "Balance" }));
    if (section === "disputes") return (data?.disputes || []).slice(0, 25).map((x: any) => ({ title: x.title || x.subject || x.username || "Player dispute", sub: x.description || x.reason || "Dispute record", meta: date(x.created_at), status: x.status || "Open" }));
    if (section === "tournament") return (data?.tournaments || []).slice(0, 25).map((x: any) => ({ title: x.name || x.title || "Tournament", sub: x.description || "Tournament configuration", meta: x.status || "Configured", status: "Live Ops" }));
    if (section === "audit") return (data?.actions || []).slice(0, 25).map((x: any) => ({ title: x.action || x.type || "Admin action", sub: x.username || x.admin_username || "System", meta: date(x.created_at || x.timestamp), status: "Logged" }));
    if (section === "visitors") return (data?.visits || []).slice(0, 25).map((x: any) => ({ title: x.path || x.page || "Visit", sub: x.ip || x.user_agent || "Visitor activity", meta: date(x.created_at || x.timestamp), status: "Visit" }));
    return [];
  }, [section, users, data]);

  if (!meta) return <main className="dbase-auth"><div className="auth-card"><div className="shield">🧭</div><h1>Admin page not found</h1><p>This Admin section does not exist.</p><Link className="primary" href="/dbase">Back to Admin</Link></div></main>;
  if (error) return <main className="dbase-auth"><div className="auth-card"><div className="shield">🛡️</div><h1>Admin access required</h1><p>{error}</p><Link className="primary" href="/">Return to Ludo Live</Link></div></main>;

  const liveStats = [
    ["Total players", fmt(stats.total)], ["Online now", fmt(data?.online)], ["Coins", fmt(stats.coins)], ["Gems", fmt(stats.gems)],
  ];

  return <main className="dbase-app">
    <aside className="dbase-sidebar">
      <div className="brand"><div className="brand-mark">♟</div><div><b>LUDO LIVE</b><span>ADMIN CONTROL</span></div></div>
      <nav><div className="nav-wrap"><small>Overview</small><Link href="/dbase">⌂ Dashboard</Link></div><div className="nav-wrap"><small>Management</small>{quick.map(([key,label]) => <Link key={key} className={key === section ? "active" : ""} href={`/dbase/${key}`}>{pages[key].icon} {label}</Link>)}</div><div className="nav-wrap"><small>Other</small><Link className={section === "visitors" ? "active" : ""} href="/dbase/visitors">◒ Visitors</Link><Link className={section === "disputes" ? "active" : ""} href="/dbase/disputes">⚑ Disputes</Link><Link className={section === "audit" ? "active" : ""} href="/dbase/audit">◷ Audit Log</Link><Link className={section === "finance" ? "active" : ""} href="/dbase/finance">₦ Finance</Link><Link className={section === "support" ? "active" : ""} href="/dbase/support">? Support</Link></div></nav>
      <div className="side-logout"><Link href="/dbase" className="logout">← Dashboard</Link></div>
    </aside>
    <section className="dbase-main">
      <header className="dbase-header"><div className="header-title"><span>ADMIN CONTROL CENTER</span><h1>{meta.title}</h1></div><div className="admin-user"><div className="user-avatar">A</div><div className="user-copy"><b>Administrator</b><span>Secure session</span></div></div></header>
      <div className="dbase-content">
        <div className="page-intro"><div><span className="eyebrow">{meta.eyebrow}</span><h2>{meta.icon} {meta.title}</h2><p>{meta.description}</p></div><div className="live-pill"><span/> ADMIN ONLINE</div></div>
        <div className="stat-grid">{liveStats.map(([label,value]) => <div className="stat-card" key={label}><div className="stat-icon">◈</div><div><span>{label}</span><strong>{value}</strong><small>Live Admin data</small></div></div>)}</div>
        <div className="panel-grid lower">
          <div className="panel"><div className="panel-head"><div><span>DATA</span><h3>{meta.title} records</h3></div><span>{rows.length} shown</span></div>{rows.length ? rows.map((r,i) => <div className="case-row" key={i}><div className="mini-avatar">{meta.icon}</div><div><b>{r.title}</b><span>{r.sub}</span></div><div className="row-meta"><b>{r.meta}</b><span className={String(r.status).toLowerCase().includes("open") || String(r.status).toLowerCase().includes("banned") ? "bad" : "good"}>{r.status}</span></div></div>) : <div className="empty">No records are available for this section yet. The Admin page is ready for the underlying records as they are created.</div>}</div>
          <div className="panel"><div className="panel-head"><div><span>CONTROL CENTER</span><h3>Quick actions</h3></div></div>{quick.slice(0,6).map(([key,label]) => <Link key={key} href={`/dbase/${key}`} className="case-row" style={{textDecoration:"none",color:"inherit"}}><div className="activity-dot">{pages[key].icon}</div><div><b>{label}</b><span>Open {label} management</span></div><div className="row-meta"><b>OPEN →</b></div></Link>)}</div>
        </div>
      </div>
    </section>
  </main>;
}
