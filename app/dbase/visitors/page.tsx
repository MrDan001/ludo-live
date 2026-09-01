"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "../dbase.css";
import "../players.css";

type Visitor = {
  id: string;
  username: string;
  created_at: string;
  last_seen_at: string | null;
  coins: number;
  gems: number;
};

const fmt = (v: number | string | undefined) => Number(v || 0).toLocaleString();
const ago = (value: string | null | undefined) => {
  if (!value) return "Never";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function AdminVisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Visitor | null>(null);

  const load = async () => {
    try {
      setError("");
      const r = await fetch("/api/admin/visitors", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Unable to load visitors.");
      setVisitors(Array.isArray(d.visitors) ? d.visitors : []);
    } catch (e: any) {
      setError(e?.message || "Unable to load visitors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const removeVisitor = async () => {
    if (!confirming) return;
    const visitor = confirming;
    setDeleting(visitor.id);
    try {
      const r = await fetch(`/api/admin/visitors?id=${encodeURIComponent(visitor.id)}`, {
        method: "DELETE",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Unable to delete visitor.");
      setConfirming(null);
      setVisitors((current) => current.filter((v) => v.id !== visitor.id));
    } catch (e: any) {
      setError(e?.message || "Unable to delete visitor.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <style>{`
        .visitor-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
        .visitor-card{border:1px solid #1f3d59;border-radius:16px;background:linear-gradient(180deg,#0d2236,#091827);padding:17px;box-shadow:0 12px 35px rgba(0,0,0,.16)}
        .visitor-top{display:flex;align-items:center;gap:12px}
        .visitor-avatar{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:#17395d;color:#a8d0ff;font-size:19px;font-weight:900}
        .visitor-name{min-width:0;flex:1}.visitor-name b{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.visitor-name span{display:block;margin-top:4px;color:#718da8;font-size:10px}
        .visitor-status{font-size:9px;font-weight:900;letter-spacing:.08em;color:#6ee0bd;background:#10382f;border:1px solid #286a57;border-radius:999px;padding:5px 8px}
        .visitor-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0}.visitor-meta div{padding:10px;border:1px solid #1c3851;border-radius:11px;background:#091b2b}.visitor-meta span{display:block;color:#6f8aa4;font-size:9px}.visitor-meta b{display:block;margin-top:4px;font-size:11px}
        .visitor-actions{display:flex;justify-content:space-between;align-items:center;gap:10px}.visitor-actions small{color:#6f8aa4;font-size:9px}.visitor-delete{border:1px solid #71384a!important;background:#341d29!important;color:#ff9db0!important}
        .visitor-overlay{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:16px;background:rgba(2,8,16,.74);backdrop-filter:blur(7px)}
        .visitor-modal{width:min(440px,100%);padding:22px;border:1px solid #71384a;border-radius:18px;background:linear-gradient(180deg,#102336,#091725);box-shadow:0 28px 90px rgba(0,0,0,.6)}
        .visitor-modal h3{margin:0;font-size:19px}.visitor-modal p{color:#8fa7be;font-size:12px;line-height:1.55;margin:12px 0 20px}.visitor-modal strong{color:#fff}.visitor-modal-actions{display:flex;justify-content:flex-end;gap:9px}.visitor-modal-actions button{min-width:105px}
        @media(max-width:560px){.visitor-grid{grid-template-columns:1fr}.visitor-modal-actions{display:grid;grid-template-columns:1fr 1fr}.visitor-modal-actions button{width:100%}}
      `}</style>

      <main className="dbase-app">
        <aside className="dbase-sidebar">
          <div className="brand"><div className="brand-mark">♟</div><div><b>LUDO LIVE</b><span>ADMIN CONTROL</span></div></div>
          <nav>
            <div className="nav-wrap"><small>Overview</small><Link href="/dbase">⌂ Dashboard</Link></div>
            <div className="nav-wrap"><small>Management</small>
              <Link href="/dbase/players">♟ Players</Link>
              <Link href="/dbase/economy">◈ Economy</Link>
              <Link href="/dbase/shop">▣ Shop</Link>
              <Link href="/dbase/spin">✦ Spin Wheel</Link>
              <Link href="/dbase/yards">▧ Yards</Link>
              <Link className="active" href="/dbase/visitors">◒ Visitors</Link>
              <Link href="/dbase/disputes">⚑ Disputes</Link>
              <Link href="/dbase/audit">◷ Audit Log</Link>
              <Link href="/dbase/missions">✓ Missions</Link>
              <Link href="/dbase/events">◇ Events</Link>
              <Link href="/dbase/tournament">♛ Tournament</Link>
              <Link href="/dbase/finance">₦ Finance</Link>
              <Link href="/dbase/support">? Support</Link>
            </div>
          </nav>
        </aside>

        <section className="dbase-main">
          <header className="dbase-header">
            <div className="header-title"><span>ADMIN CONTROL CENTER</span><h1>Visitors</h1></div>
            <div className="admin-user"><div className="user-avatar">A</div><div className="user-copy"><b>Administrator</b><span>Secure session</span></div></div>
          </header>

          <div className="dbase-content">
            <div className="page-intro">
              <div><span className="eyebrow">GUEST ACCOUNTS</span><h2>Visitors</h2><p>Every account created through Guest / Visitor login appears here. Registered players are kept out of this list.</p></div>
              <div className="live-pill"><span/> {visitors.length} VISITORS</div>
            </div>

            {error && <div className="panel" style={{marginBottom:14}}><div className="empty">{error}</div></div>}
            {loading ? <div className="panel"><div className="empty">Loading visitors…</div></div> : !visitors.length ? <div className="panel"><div className="empty">No visitor accounts found.</div></div> : (
              <div className="visitor-grid">
                {visitors.map((visitor) => (
                  <article className="visitor-card" key={visitor.id}>
                    <div className="visitor-top">
                      <div className="visitor-avatar">♙</div>
                      <div className="visitor-name"><b>{visitor.username || "Guest visitor"}</b><span>Visitor account · {ago(visitor.created_at)}</span></div>
                      <span className="visitor-status">GUEST</span>
                    </div>
                    <div className="visitor-meta">
                      <div><span>Coins</span><b>🪙 {fmt(visitor.coins)}</b></div>
                      <div><span>Gems</span><b>💎 {fmt(visitor.gems)}</b></div>
                    </div>
                    <div className="visitor-actions">
                      <small>Last seen {ago(visitor.last_seen_at)}</small>
                      <button className="admin-btn visitor-delete" disabled={deleting === visitor.id} onClick={() => setConfirming(visitor)}>{deleting === visitor.id ? "Deleting…" : "Delete visitor"}</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {confirming && <div className="visitor-overlay">
        <div className="visitor-modal">
          <div className="modal-icon danger-icon">🗑️</div>
          <h3>Delete visitor?</h3>
          <p>This permanently removes <strong>{confirming.username}</strong> and its guest session. The visitor's daily visit records will also disappear with the guest account.</p>
          <div className="visitor-modal-actions">
            <button className="admin-btn" disabled={!!deleting} onClick={() => setConfirming(null)}>Cancel</button>
            <button className="admin-btn danger-btn" disabled={!!deleting} onClick={removeVisitor}>{deleting ? "Deleting…" : "Delete visitor"}</button>
          </div>
        </div>
      </div>}
    </>
  );
}
