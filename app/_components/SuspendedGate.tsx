"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function SuspendedGate() {
  const pathname = usePathname();
  const [state, setState] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (pathname?.startsWith("/dbase") || pathname?.startsWith("/login") || pathname?.startsWith("/signup") || pathname === "/") return;
    let alive = true;
    const check = async () => {
      try {
        const r = await fetch("/api/account/suspension", { cache: "no-store" });
        const d = await r.json();
        if (alive) setState(d);
      } catch {}
    };
    void check();
    const timer = window.setInterval(check, 30000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [pathname]);

  if (!state?.suspended) return null;

  const submit = async () => {
    if (!message.trim()) return setError("Please explain why you are requesting a review.");
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/account/suspension", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Unable to submit review.");
      setState((s: any) => ({ ...s, reviewStatus: "pending", reviewRequestedAt: new Date().toISOString(), reviewMessage: message }));
      setMessage("");
    } catch (e: any) { setError(e?.message || "Unable to submit review."); }
    finally { setBusy(false); }
  };

  const deadline = state.suspendedUntil ? new Date(state.suspendedUntil).toLocaleString() : "30 days from suspension";

  return <div style={{ position: "fixed", inset: 0, zIndex: 999999, background: "radial-gradient(circle at top,#132b55 0,#050b18 55%,#02050b 100%)", color: "#fff", display: "grid", placeItems: "center", padding: 24, overflowY: "auto" }}>
    <div style={{ width: "min(560px,100%)", border: "1px solid rgba(255,255,255,.12)", background: "rgba(9,20,38,.92)", borderRadius: 28, padding: 28, boxShadow: "0 30px 90px rgba(0,0,0,.55)" }}>
      <div style={{ fontSize: 56, marginBottom: 8 }}>⛔</div>
      <div style={{ letterSpacing: 2, fontSize: 12, fontWeight: 800, opacity: .65 }}>ACCOUNT SECURITY</div>
      <h1 style={{ margin: "8px 0", fontSize: 34 }}>Account Suspended</h1>
      <p style={{ opacity: .8, lineHeight: 1.6 }}>Your Ludo Live account has been temporarily suspended.</p>
      <div style={{ padding: 18, borderRadius: 18, background: "rgba(255,255,255,.06)", margin: "20px 0" }}>
        <b>Reason</b><div style={{ marginTop: 7, opacity: .82 }}>{state.reason}</div>
        <div style={{ marginTop: 14, fontSize: 13, opacity: .65 }}>Review deadline: {deadline}</div>
      </div>
      {state.reviewStatus === "pending" ? <div style={{ padding: 18, borderRadius: 18, background: "rgba(45,212,191,.1)", border: "1px solid rgba(45,212,191,.25)" }}><b>Review request submitted ✓</b><p style={{ opacity: .75 }}>Your request is waiting for administrator review. Your account remains suspended while it is reviewed.</p></div> : <>
        <h2 style={{ fontSize: 18 }}>Apply for review</h2>
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Explain why you believe the suspension should be reviewed..." rows={5} style={{ width: "100%", resize: "vertical", boxSizing: "border-box", borderRadius: 16, padding: 15, background: "#071225", color: "#fff", border: "1px solid rgba(255,255,255,.12)", outline: "none" }} />
        {error && <div style={{ color: "#ff9b9b", marginTop: 10 }}>{error}</div>}
        <button disabled={busy} onClick={submit} style={{ marginTop: 14, width: "100%", padding: "14px 18px", border: 0, borderRadius: 15, background: "linear-gradient(135deg,#7dd3fc,#38bdf8)", color: "#03101d", fontWeight: 900 }}>{busy ? "Submitting…" : "Apply for Review"}</button>
      </>}
      <p style={{ fontSize: 12, opacity: .55, lineHeight: 1.5, marginTop: 20 }}>If no review request is approved before the suspension deadline, the account will be permanently banned and deleted and cannot be recovered.</p>
    </div>
  </div>;
}
