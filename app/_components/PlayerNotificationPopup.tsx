"use client";

import { useEffect, useState } from "react";

type Notice = { id: string; title?: string; message?: string; createdAt?: string; kind?: string };

export default function PlayerNotificationPopup() {
  const [items, setItems] = useState<Notice[]>([]);
  const [current, setCurrent] = useState<Notice | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/player/notifications", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (!alive) return;
        const next = Array.isArray(d.notifications) ? d.notifications : [];
        setItems(next);
        setCurrent(old => old || next[0] || null);
      } catch {}
    };
    void load();
    const timer = window.setInterval(load, 10000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  if (!current) return null;

  const close = async () => {
    if (closing) return;
    setClosing(true);
    try { await fetch("/api/player/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: current.id }) }); } catch {}
    const rest = items.filter(x => x.id !== current.id);
    setItems(rest);
    setCurrent(rest[0] || null);
    setClosing(false);
  };

  const created = current.createdAt ? new Date(current.createdAt).toLocaleString() : "";
  const kind = current.kind === "warning" ? "⚠" : current.kind === "success" ? "✓" : "✦";

  return <div style={{ position: "fixed", inset: 0, zIndex: 999998, pointerEvents: "none", display: "grid", placeItems: "center", padding: 18, background: "rgba(2,6,23,.48)", backdropFilter: "blur(5px)" }}>
    <div style={{ pointerEvents: "auto", width: "min(480px,100%)", position: "relative", borderRadius: 30, padding: 2, background: "linear-gradient(135deg,rgba(96,165,250,.8),rgba(168,85,247,.55),rgba(45,212,191,.45))", boxShadow: "0 30px 110px rgba(0,0,0,.7)" }}>
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 28, padding: "27px 24px 22px", color: "#fff", background: "linear-gradient(145deg,rgba(15,35,66,.98),rgba(5,14,29,.98))" }}>
        <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", right: -90, top: -90, background: "rgba(96,165,250,.16)", filter: "blur(2px)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ width: 54, height: 54, flex: "0 0 auto", borderRadius: 17, display: "grid", placeItems: "center", fontSize: 25, background: "linear-gradient(145deg,rgba(96,165,250,.25),rgba(168,85,247,.2))", border: "1px solid rgba(147,197,253,.3)", boxShadow: "0 0 28px rgba(96,165,250,.16)" }}>{kind}</div>
          <div style={{ minWidth: 0 }}><div style={{ fontSize: 10, letterSpacing: 2.2, color: "#93c5fd", fontWeight: 900 }}>LUDO LIVE • MESSAGE</div><h2 style={{ margin: "4px 0 0", fontSize: 24, lineHeight: 1.15 }}>{current.title || "A message for you"}</h2></div>
          <button onClick={close} aria-label="Close notification" style={{ marginLeft: "auto", alignSelf: "flex-start", width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#cbd5e1", fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ marginTop: 21, padding: 17, borderRadius: 18, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.07)", whiteSpace: "pre-wrap", lineHeight: 1.65, fontSize: 15, color: "#e2e8f0" }}>{current.message}</div>
        {created && <div style={{ marginTop: 10, fontSize: 10, color: "#64748b" }}>{created}</div>}
        {items.length > 1 && <div style={{ marginTop: 12, fontSize: 11, color: "#94a3b8", textAlign: "center" }}>{items.length - 1} more message{items.length - 1 === 1 ? "" : "s"} waiting</div>}
        <button disabled={closing} onClick={close} style={{ marginTop: 17, width: "100%", border: 0, borderRadius: 16, padding: 14, background: "linear-gradient(135deg,#60a5fa,#2563eb)", color: "#fff", fontWeight: 900, fontSize: 14, boxShadow: "0 12px 30px rgba(37,99,235,.25)" }}>{closing ? "Closing…" : "✓ Got it"}</button>
      </div>
    </div>
  </div>;
}
