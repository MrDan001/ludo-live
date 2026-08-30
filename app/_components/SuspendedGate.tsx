"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type SuspensionState = { suspended?: boolean; reason?: string; suspendedUntil?: string; reviewStatus?: string; reviewRequestedAt?: string; reviewMessage?: string };
const glass: React.CSSProperties = { background: "rgba(8,18,35,.82)", border: "1px solid rgba(255,255,255,.12)", boxShadow: "0 32px 100px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.05)", backdropFilter: "blur(22px)" };

export default function SuspendedGate() {
  const pathname = usePathname();
  const [state, setState] = useState<SuspensionState | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (pathname?.startsWith("/dbase") || pathname?.startsWith("/login") || pathname?.startsWith("/signup") || pathname === "/") return;
    let alive = true;
    const check = async () => { try { const r = await fetch("/api/account/suspension", { cache: "no-store" }); const d = await r.json(); if (alive) setState(d); } catch {} };
    void check();
    const timer = window.setInterval(check, 30000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [pathname]);

  if (!state?.suspended) return null;

  const submit = async () => {
    if (!message.trim()) { setError("Please explain why you are requesting a review."); return; }
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/account/suspension", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: message.trim() }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Unable to submit review.");
      setState(s => ({ ...s, reviewStatus: "pending", reviewRequestedAt: new Date().toISOString(), reviewMessage: message.trim() }));
      setMessage("");
    } catch (e: any) { setError(e?.message || "Unable to submit review."); }
    finally { setBusy(false); }
  };

  const deadline = state.suspendedUntil ? new Date(state.suspendedUntil).toLocaleString() : "30 days from suspension";
  const pending = state.reviewStatus === "pending";

  return <div style={{ position: "fixed", inset: 0, zIndex: 999999, background: "radial-gradient(circle at 50% -10%,rgba(239,68,68,.22),transparent 32%),radial-gradient(circle at 10% 90%,rgba(59,130,246,.16),transparent 35%),linear-gradient(145deg,#020617,#071326 55%,#030712)", color: "#fff", display: "grid", placeItems: "center", padding: 18, overflowY: "auto" }}>
    <div style={{ position: "relative", width: "min(570px,100%)", borderRadius: 32, padding: 2, background: "linear-gradient(135deg,rgba(248,113,113,.65),rgba(96,165,250,.18),rgba(255,255,255,.08))" }}>
      <div style={{ ...glass, borderRadius: 30, padding: "30px clamp(20px,5vw,34px)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 88, height: 88, margin: "0 auto 18px", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 40, background: "radial-gradient(circle,rgba(239,68,68,.24),rgba(239,68,68,.06))", border: "1px solid rgba(248,113,113,.5)", boxShadow: "0 0 45px rgba(239,68,68,.2)" }}>🛡️</div>
          <div style={{ letterSpacing: 3, fontSize: 11, fontWeight: 900, color: "#fca5a5" }}>LUDO LIVE • ACCOUNT SECURITY</div>
          <h1 style={{ margin: "8px 0 6px", fontSize: "clamp(30px,7vw,42px)", lineHeight: 1.05 }}>Account Suspended</h1>
          <p style={{ margin: 0, opacity: .68, lineHeight: 1.6 }}>Your account is temporarily locked while this moderation action is active.</p>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", margin: "24px 0" }}>
          <div style={{ padding: 16, borderRadius: 18, background: "rgba(239,68,68,.08)", border: "1px solid rgba(248,113,113,.16)" }}><div style={{ fontSize: 11, opacity: .55, fontWeight: 800 }}>REASON</div><div style={{ marginTop: 5, fontWeight: 800, lineHeight: 1.35 }}>{state.reason || "Account policy review"}</div></div>
          <div style={{ padding: 16, borderRadius: 18, background: "rgba(59,130,246,.08)", border: "1px solid rgba(96,165,250,.16)" }}><div style={{ fontSize: 11, opacity: .55, fontWeight: 800 }}>REVIEW DEADLINE</div><div style={{ marginTop: 5, fontWeight: 800, lineHeight: 1.35 }}>{deadline}</div></div>
        </div>
        {pending ? <div style={{ padding: 20, borderRadius: 20, background: "rgba(34,197,94,.09)", border: "1px solid rgba(74,222,128,.24)" }}><div style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 900, color: "#86efac" }}><span style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(34,197,94,.16)" }}>✓</span> Review request submitted</div><p style={{ margin: "10px 0 0", opacity: .72, lineHeight: 1.55 }}>Your request is with the Ludo Live moderation team. Your account remains suspended while the review is processed.</p></div> : <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12 }}><div><div style={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 900, color: "#93c5fd" }}>REQUEST A REVIEW</div><h2 style={{ margin: "5px 0 0", fontSize: 20 }}>Tell us what happened</h2></div><div style={{ fontSize: 11, opacity: .4 }}>{message.length}/600</div></div>
          <textarea maxLength={600} value={message} onChange={e => setMessage(e.target.value)} placeholder="Explain why you believe this suspension should be reviewed…" rows={5} style={{ width: "100%", resize: "vertical", boxSizing: "border-box", marginTop: 12, borderRadius: 18, padding: 16, background: "rgba(2,6,23,.7)", color: "#fff", border: "1px solid rgba(148,163,184,.18)", outline: "none", fontSize: 14, lineHeight: 1.5 }} />
          {error && <div style={{ marginTop: 10, padding: 11, borderRadius: 12, background: "rgba(239,68,68,.09)", color: "#fca5a5", fontSize: 13 }}>{error}</div>}
          <button disabled={busy || !message.trim()} onClick={submit} style={{ marginTop: 12, width: "100%", padding: 15, border: 0, borderRadius: 16, background: message.trim() ? "linear-gradient(135deg,#60a5fa,#2563eb)" : "#334155", color: "#fff", fontWeight: 900, fontSize: 15, boxShadow: message.trim() ? "0 12px 35px rgba(37,99,235,.22)" : "none" }}>{busy ? "Submitting review…" : "✦ Submit Review Request"}</button>
        </div>}
        <div style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.07)", display: "flex", gap: 9, alignItems: "flex-start", color: "#94a3b8", fontSize: 12, lineHeight: 1.5 }}><span>⏳</span><span>If no review request is approved before the suspension deadline, the account will be permanently banned and deleted and cannot be recovered.</span></div>
      </div>
    </div>
  </div>;
}
