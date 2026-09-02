"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Player = Record<string, any>;
type Dialog = { type: "message" | "suspend" | "deny" | "review" | "delete" | "success" | "error"; player?: Player; text?: string; title?: string } | null;

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 1000000, background: "rgba(2,6,23,.78)", backdropFilter: "blur(12px)", display: "grid", placeItems: "center", padding: 18 };
const card: React.CSSProperties = { width: "min(520px,100%)", maxHeight: "92vh", overflowY: "auto", background: "linear-gradient(145deg,#111827,#071225)", color: "#fff", border: "1px solid rgba(148,163,184,.2)", borderRadius: 28, padding: 26, boxShadow: "0 30px 100px rgba(0,0,0,.65)" };
const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "rgba(2,6,23,.72)", color: "#fff", border: "1px solid rgba(148,163,184,.2)", borderRadius: 15, padding: 14, outline: "none", fontSize: 14 };

export default function AdminPlayerModeration() {
  const pathname = usePathname();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<Player | null>(null);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("Message from Ludo Live");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);

  const load = async () => {
    try {
      const r = await fetch("/api/admin/player-moderation", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setPlayers(d.users || []);
    } catch {}
  };

  useEffect(() => {
    if (pathname !== "/dbase/players") return;
    void load();
    const t = window.setInterval(load, 15000);
    return () => window.clearInterval(t);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/dbase/players") return;
    const attach = () => {
      const rows = Array.from(document.querySelectorAll<HTMLElement>(".case-row"));
      if (!rows.length || !players.length) return;
      rows.forEach(row => {
        const text = row.innerText || "";
        const player = players.find(p => (p.email && text.includes(String(p.email))) || (p.username && text.includes(String(p.username))));
        if (!player) return;
        const existing = row.querySelector<HTMLElement>("[data-player-moderation]");
        if (existing) existing.remove();
        const wrap = document.createElement("div");
        wrap.setAttribute("data-player-moderation", "true");
        wrap.style.cssText = "width:100%;margin-top:12px;";

        if (player.suspension_review_status === "pending") {
          const review = document.createElement("div");
          review.style.cssText = "width:100%;box-sizing:border-box;margin-bottom:10px;padding:14px 15px;border-radius:16px;background:linear-gradient(135deg,rgba(167,139,250,.13),rgba(59,130,246,.08));border:1px solid rgba(167,139,250,.34);color:#e9d5ff;cursor:pointer;";
          const requested = player.suspension_review_requested_at ? new Date(player.suspension_review_requested_at).toLocaleString() : "Time not recorded";
          const appeal = String(player.suspension_review_message || "").trim();
          const suspension = String(player.suspension_reason || "No suspension reason recorded.").trim();
          review.innerHTML = `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;"><strong style="font-size:14px;letter-spacing:.3px;">🛡️ SUSPENSION REVIEW PENDING</strong><span style="font-size:11px;opacity:.7;">Tap to read</span></div><div style="font-size:12px;opacity:.75;margin-top:8px;">Suspension reason: ${escapeHtml(suspension)}</div><div style="font-size:12px;opacity:.75;margin-top:4px;">Submitted: ${escapeHtml(requested)}</div><div style="font-size:13px;margin-top:9px;color:#f5f3ff;line-height:1.45;">${escapeHtml(appeal || "The player submitted a review without a message.")}</div>`;
          review.onclick = () => { setSelected(player); setReason(""); setDialog({ type: "review", player }); };
          wrap.appendChild(review);
        }

        const bar = document.createElement("div");
        bar.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center;width:100%;padding-top:4px;";
        const add = (label: string, kind: string, danger = false) => {
          const b = document.createElement("button");
          b.type = "button"; b.textContent = label; b.className = danger ? "admin-btn danger-btn" : "admin-btn";
          b.style.cssText = `min-height:40px;padding:9px 14px;border-radius:12px;cursor:pointer;font-weight:800;border:1px solid ${danger ? "rgba(248,113,113,.3)" : "rgba(96,165,250,.25)"};background:${danger ? "rgba(239,68,68,.12)" : "rgba(59,130,246,.1)"};color:${danger ? "#fca5a5" : "#bfdbfe"};`;
          b.onclick = () => {
            if (kind === "message") { setSelected(player); setMessage(""); setTitle("Message from Ludo Live"); setReason(""); setDialog({ type: "message", player }); }
            if (kind === "suspend") { setSelected(player); setReason(""); setMessage(""); setTitle("suspend"); setDialog({ type: "suspend", player }); }
            if (kind === "delete") setDialog({ type: "delete", player });
            if (kind === "unsuspend") void moderate("unsuspend", player);
            if (kind === "approve") void moderate("review_decision", player, { decision: "approved" });
            if (kind === "deny") { setSelected(player); setReason(""); setTitle("deny"); setDialog({ type: "deny", player }); }
          };
          bar.appendChild(b);
        };
        if (player.suspended_at) add("Unsuspend", "unsuspend"); else add("Suspend", "suspend", true);
        if (player.suspension_review_status === "pending") { add("Approve Review", "approve"); add("Deny Review", "deny", true); }
        add("Message", "message"); add("Delete", "delete", true);
        wrap.appendChild(bar);
        row.appendChild(wrap);
      });
    };
    attach();
    const observer = new MutationObserver(() => window.requestAnimationFrame(attach));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [players, pathname]);

  const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c] || c));

  const moderate = async (action: string, player: Player, extra: Record<string, any> = {}) => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/player-moderation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, userId: player.id, ...extra }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Action failed.");
      await load();
      setSelected(null); setDialog({ type: "success", player, text: action === "message" ? "Your message has been sent to this player." : action === "suspend" ? "The player has been suspended for 30 days." : action === "unsuspend" ? "The player has been restored." : action === "review_decision" ? (extra.decision === "approved" ? "The suspension review was approved." : "The suspension review was denied.") : "The player account has been permanently deleted." });
    } catch (e: any) { setDialog({ type: "error", text: e?.message || "Action failed." }); }
    finally { setBusy(false); }
  };

  const close = () => { if (!busy) { setSelected(null); setDialog(null); } };
  if (pathname !== "/dbase/players" || !dialog) return null;
  const player = dialog.player || selected;
  const name = player?.username || player?.email || "this player";
  const isSuspend = dialog.type === "suspend";
  const isDeny = dialog.type === "deny";
  const isReview = dialog.type === "review";
  const icon = dialog.type === "delete" ? "🗑️" : dialog.type === "suspend" ? "🛡️" : dialog.type === "message" ? "✉️" : dialog.type === "success" ? "✓" : dialog.type === "error" ? "!" : "🛡️";
  const accent = dialog.type === "delete" || dialog.type === "suspend" || dialog.type === "error" ? "#ef4444" : dialog.type === "success" ? "#22c55e" : dialog.type === "message" ? "#38bdf8" : "#a78bfa";
  const reviewRequested = player?.suspension_review_requested_at ? new Date(player.suspension_review_requested_at).toLocaleString() : "Time not recorded";

  return (
    <div style={overlay} onClick={close}>
      <div onClick={e => e.stopPropagation()} style={{ ...card, borderColor: `${accent}55` }}>
        <button onClick={close} disabled={busy} aria-label="Close" style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}>x</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 74, height: 74, margin: "0 auto 16px", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 34, fontWeight: 900, background: `${accent}18`, border: `1px solid ${accent}88`, boxShadow: `0 0 36px ${accent}33`, color: accent }}>{icon}</div>
          <div style={{ fontSize: 11, letterSpacing: 2, fontWeight: 900, color: accent }}>{dialog.type === "delete" ? "PERMANENT ACTION" : dialog.type === "suspend" ? "PLAYER MODERATION" : dialog.type === "message" ? "DIRECT MESSAGE" : dialog.type === "review" ? "SUSPENSION REVIEW" : dialog.type === "success" ? "ACTION COMPLETE" : "ADMIN NOTICE"}</div>
          <h2 style={{ margin: "7px 0 5px", fontSize: 25 }}>{dialog.type === "delete" ? "Delete Player Account" : dialog.type === "suspend" ? "Suspend Player" : dialog.type === "deny" ? "Deny Suspension Review" : dialog.type === "review" ? "Player Suspension Review" : dialog.type === "message" ? "Send Message" : dialog.type === "success" ? "Done!" : "Something went wrong"}</h2>
          {player && dialog.type !== "error" && <div style={{ opacity: .62, fontSize: 13, marginBottom: 18 }}>{name}{player.email ? ` • ${player.email}` : ""}</div>}
        </div>

        {isReview ? <>
          <div style={{ padding: 14, borderRadius: 16, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", lineHeight: 1.5, fontSize: 14, color: "#fecaca" }}><strong>Original suspension reason</strong><div style={{ marginTop: 7, color: "#fee2e2" }}>{player?.suspension_reason || "No suspension reason recorded."}</div></div>
          <div style={{ marginTop: 12, padding: 16, borderRadius: 16, background: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.25)", lineHeight: 1.6, fontSize: 14 }}><div style={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 900, color: "#c4b5fd", marginBottom: 8 }}>PLAYER'S REVIEW / APPEAL</div><div style={{ whiteSpace: "pre-wrap", color: "#f5f3ff" }}>{player?.suspension_review_message || "The player submitted a review without a message."}</div><div style={{ marginTop: 12, fontSize: 11, opacity: .55 }}>Submitted: {reviewRequested}</div></div>
          <button disabled={busy} onClick={() => moderate("review_decision", player!, { decision: "approved" })} style={{ width: "100%", marginTop: 12, padding: 14, border: 0, borderRadius: 15, background: "linear-gradient(135deg,#22c55e,#15803d)", color: "#fff", fontWeight: 900 }}>{busy ? "Saving…" : "✓ Approve Review"}</button>
          <button disabled={busy} onClick={() => { setReason(""); setDialog({ type: "deny", player: player || undefined }); }} style={{ width: "100%", marginTop: 9, padding: 14, border: "1px solid rgba(248,113,113,.3)", borderRadius: 15, background: "rgba(239,68,68,.12)", color: "#fca5a5", fontWeight: 900 }}>✕ Deny Review</button>
        </> : isSuspend ? <>
          <div style={{ padding: 14, borderRadius: 16, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", lineHeight: 1.5, fontSize: 14, color: "#fecaca" }}>The player will be blocked immediately and can apply for review. If the suspension is not approved within 30 days, the account will be permanently banned and deleted.</div>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} placeholder="Reason for suspension" style={{ ...field, marginTop: 14, resize: "vertical" }} />
          <button disabled={busy} onClick={() => moderate("suspend", player!, { days: 30, reason: reason.trim() || "Suspended by an administrator." })} style={{ width: "100%", marginTop: 12, padding: 14, border: 0, borderRadius: 15, background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontWeight: 900, boxShadow: "0 10px 30px rgba(239,68,68,.22)" }}>{busy ? "Suspending…" : "🛡 Suspend for 30 Days"}</button>
        </> : isDeny ? <>
          <p style={{ opacity: .75, lineHeight: 1.5 }}>The player requested a suspension review. Add an optional reason for denying the request.</p>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} placeholder="Optional denial reason" style={{ ...field, resize: "vertical" }} />
          <button disabled={busy} onClick={() => moderate("review_decision", player!, { decision: "denied", note: reason })} style={{ width: "100%", marginTop: 12, padding: 14, border: 0, borderRadius: 15, background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontWeight: 900 }}>{busy ? "Saving…" : "Deny Review"}</button>
        </> : dialog.type === "message" ? <>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Message title" style={field} />
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} maxLength={500} placeholder="Write the popup message…" style={{ ...field, marginTop: 10, resize: "vertical" }} />
          <div style={{ textAlign: "right", fontSize: 11, opacity: .45, marginTop: 5 }}>{message.length}/500</div>
          <button disabled={busy || !message.trim()} onClick={() => moderate("message", player!, { title, message })} style={{ width: "100%", marginTop: 8, padding: 14, border: 0, borderRadius: 15, background: "linear-gradient(135deg,#38bdf8,#2563eb)", color: "#fff", fontWeight: 900, boxShadow: "0 10px 30px rgba(37,99,235,.2)" }}>{busy ? "Sending…" : "✈ Send Popup Message"}</button>
        </> : dialog.type === "delete" ? <>
          <div style={{ padding: 14, borderRadius: 16, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.22)", color: "#fecaca", fontSize: 14, lineHeight: 1.5, marginBottom: 14 }}>⚠️ This permanently removes <strong>{name}</strong> and its server account. This action cannot be undone.</div>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Type DELETE to confirm" style={{ ...field, borderColor: reason === "DELETE" ? "#22c55e88" : "rgba(148,163,184,.2)" }} />
          <button disabled={busy || reason !== "DELETE"} onClick={() => moderate("delete", player!, { confirm: "DELETE" })} style={{ width: "100%", marginTop: 12, padding: 14, border: 0, borderRadius: 15, background: reason === "DELETE" ? "linear-gradient(135deg,#ef4444,#b91c1c)" : "#334155", color: "#fff", fontWeight: 900 }}>{busy ? "Deleting…" : "🗑 Delete Account Forever"}</button>
        </> : <>
          <div style={{ textAlign: "center", padding: "4px 8px 14px", lineHeight: 1.6, opacity: .78 }}>{dialog.text}</div>
          <button onClick={close} style={{ width: "100%", padding: 14, border: 0, borderRadius: 15, background: `linear-gradient(135deg,${accent},${accent}cc)`, color: "#fff", fontWeight: 900 }}>{dialog.type === "success" ? "✓ Got it" : "Close"}</button>
        </>}

        {dialog.type !== "success" && dialog.type !== "error" && dialog.type !== "review" && <button onClick={close} disabled={busy} style={{ width: "100%", marginTop: 9, padding: 12, border: "1px solid rgba(148,163,184,.16)", borderRadius: 15, background: "rgba(15,23,42,.55)", color: "#cbd5e1", fontWeight: 700 }}>Cancel</button>}
      </div>
    </div>
  );
}
