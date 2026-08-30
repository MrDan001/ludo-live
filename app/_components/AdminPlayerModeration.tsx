"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Player = Record<string, any>;

export default function AdminPlayerModeration() {
  const pathname = usePathname();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<Player | null>(null);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("Message from Ludo Live");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

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

  // The Players page renders its cards separately. Use a MutationObserver so
  // moderation controls are attached after the cards arrive, and re-attached
  // after client-side pagination/rerenders instead of depending on a race
  // between this component and the Players page.
  useEffect(() => {
    if (pathname !== "/dbase/players") return;

    const attach = () => {
      const rows = Array.from(document.querySelectorAll<HTMLElement>(".case-row"));
      if (!rows.length || !players.length) return;

      rows.forEach(row => {
        const text = row.innerText || "";
        const player = players.find(p =>
          (p.email && text.includes(String(p.email))) ||
          (p.username && text.includes(String(p.username)))
        );
        if (!player) return;

        const existing = row.querySelector<HTMLElement>("[data-player-moderation]");
        if (existing) existing.remove();

        const bar = document.createElement("div");
        bar.setAttribute("data-player-moderation", "true");
        bar.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px;width:100%;padding-top:4px;";

        const add = (label: string, kind: string, danger = false) => {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = label;
          b.className = danger ? "admin-btn danger-btn" : "admin-btn";
          b.style.cssText = "min-height:40px;padding:9px 14px;border-radius:10px;cursor:pointer;font-weight:800;";
          b.onclick = () => {
            if (kind === "message") {
              setSelected(player); setMessage(""); setTitle("Message from Ludo Live"); setReason("");
            }
            if (kind === "suspend") {
              setSelected(player); setReason(""); setMessage(""); setTitle("suspend");
            }
            if (kind === "delete") void deletePlayer(player);
            if (kind === "unsuspend") void moderate("unsuspend", player);
            if (kind === "approve") void moderate("review_decision", player, { decision: "approved" });
            if (kind === "deny") { setSelected(player); setReason(""); setTitle("deny"); }
          };
          bar.appendChild(b);
        };

        if (player.suspended_at) add("Unsuspend", "unsuspend");
        else add("Suspend", "suspend", true);
        if (player.suspension_review_status === "pending") {
          add("Approve Review", "approve");
          add("Deny Review", "deny", true);
        }
        add("Message", "message");
        add("Delete", "delete", true);
        row.appendChild(bar);
      });
    };

    attach();
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(attach);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [players, pathname]);

  const moderate = async (action: string, player: Player, extra: Record<string, any> = {}) => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/player-moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId: player.id, ...extra })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Action failed.");
      await load();
      setSelected(null);
      alert(
        action === "message" ? "Message sent." :
        action === "suspend" ? "Player suspended." :
        action === "unsuspend" ? "Player unsuspended." :
        action === "review_decision" ? (extra.decision === "approved" ? "Review approved." : "Review denied.") :
        "Player deleted."
      );
    } catch (e: any) {
      alert(e?.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const deletePlayer = async (player: Player) => {
    const name = player.username || player.email || "this player";
    if (!window.confirm(`Delete ${name} permanently? This removes the player from the server and cannot be undone.`)) return;
    const typed = window.prompt(`Type DELETE to permanently delete ${name}.`);
    if (typed !== "DELETE") return;
    await moderate("delete", player, { confirm: "DELETE" });
  };

  const close = () => { if (!busy) setSelected(null); };
  if (pathname !== "/dbase/players" || !selected) return null;
  const isSuspend = title === "suspend";
  const isDeny = title === "deny";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000000, background: "rgba(0,0,0,.68)", display: "grid", placeItems: "center", padding: 20 }} onClick={close}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(520px,100%)", background: "#0a1729", color: "#fff", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: 24, boxShadow: "0 30px 100px rgba(0,0,0,.6)" }}>
        <div style={{ fontSize: 12, opacity: .6, fontWeight: 800, letterSpacing: 1.5 }}>{isSuspend ? "SUSPEND PLAYER" : isDeny ? "DENY SUSPENSION REVIEW" : "DIRECT PLAYER MESSAGE"}</div>
        <h2 style={{ margin: "7px 0 4px" }}>{selected.username || selected.email}</h2>
        <div style={{ opacity: .6, fontSize: 13 }}>{selected.email}</div>
        {isSuspend ? <>
          <p style={{ lineHeight: 1.5, opacity: .8 }}>The player will be blocked immediately. They can apply for review. If the suspension is not approved before 30 days, the account will be permanently banned and deleted.</p>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} placeholder="Reason for suspension" style={{ width: "100%", boxSizing: "border-box", background: "#071225", color: "#fff", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: 13 }} />
          <button disabled={busy} onClick={() => moderate("suspend", selected, { days: 30, reason: reason.trim() || "Suspended by an administrator." })} style={{ width: "100%", marginTop: 12, padding: 14, border: 0, borderRadius: 14, background: "#ef4444", color: "#fff", fontWeight: 900 }}>{busy ? "Suspending…" : "Suspend for 30 Days"}</button>
        </> : isDeny ? <>
          <p style={{ opacity: .8, lineHeight: 1.5 }}>The player requested a suspension review. Add an optional reason for denying the request.</p>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} placeholder="Optional denial reason" style={{ width: "100%", boxSizing: "border-box", background: "#071225", color: "#fff", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: 13 }} />
          <button disabled={busy} onClick={() => moderate("review_decision", selected, { decision: "denied", note: reason })} style={{ width: "100%", marginTop: 12, padding: 14, border: 0, borderRadius: 14, background: "#ef4444", color: "#fff", fontWeight: 900 }}>{busy ? "Saving…" : "Deny Review"}</button>
        </> : <>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Message title" style={{ width: "100%", boxSizing: "border-box", background: "#071225", color: "#fff", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: 13, marginTop: 18 }} />
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} placeholder="Write the popup message…" style={{ width: "100%", boxSizing: "border-box", background: "#071225", color: "#fff", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: 13, marginTop: 10 }} />
          <button disabled={busy || !message.trim()} onClick={() => moderate("message", selected, { title, message })} style={{ width: "100%", marginTop: 12, padding: 14, border: 0, borderRadius: 14, background: "#38bdf8", color: "#03101d", fontWeight: 900 }}>{busy ? "Sending…" : "Send Popup Message"}</button>
        </>}
        <button onClick={close} disabled={busy} style={{ width: "100%", marginTop: 9, padding: 12, border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, background: "transparent", color: "#fff" }}>Cancel</button>
      </div>
    </div>
  );
}
