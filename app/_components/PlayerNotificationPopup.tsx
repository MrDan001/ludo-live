"use client";

import { useEffect, useState } from "react";

export default function PlayerNotificationPopup() {
  const [items, setItems] = useState<any[]>([]);
  const [current, setCurrent] = useState<any | null>(null);

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
        setCurrent((old: any) => old || next[0] || null);
      } catch {}
    };
    void load();
    const timer = window.setInterval(load, 10000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  if (!current) return null;

  const close = async () => {
    try { await fetch("/api/player/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: current.id }) }); } catch {}
    const rest = items.filter(x => x.id !== current.id);
    setItems(rest);
    setCurrent(rest[0] || null);
  };

  return <div style={{ position: "fixed", inset: 0, zIndex: 999998, pointerEvents: "none", display: "grid", placeItems: "center", padding: 22 }}>
    <div style={{ pointerEvents: "auto", width: "min(460px,100%)", borderRadius: 24, padding: 24, background: "linear-gradient(145deg,#102748,#071326)", color: "#fff", border: "1px solid rgba(125,211,252,.28)", boxShadow: "0 25px 90px rgba(0,0,0,.65)" }}>
      <div style={{ fontSize: 12, letterSpacing: 2, opacity: .65, fontWeight: 900 }}>LUDO LIVE • NOTICE</div>
      <h2 style={{ margin: "8px 0 10px", fontSize: 25 }}>{current.title}</h2>
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, opacity: .88 }}>{current.message}</div>
      <button onClick={close} style={{ marginTop: 20, width: "100%", border: 0, borderRadius: 14, padding: 13, background: "#7dd3fc", color: "#03101d", fontWeight: 900 }}>Got it</button>
    </div>
  </div>;
}
