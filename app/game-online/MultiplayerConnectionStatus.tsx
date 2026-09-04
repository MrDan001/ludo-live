"use client";

import { useEffect, useState } from "react";

type Status = "connected" | "reconnecting" | "disconnected";
type Detail = { status?: Status; reason?: string; opponentId?: string };

export default function MultiplayerConnectionStatus() {
  const [status, setStatus] = useState<Status>("connected");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const onStatus = (event: Event) => {
      const detail = (event as CustomEvent<Detail>).detail || {};
      if (detail.reason === "opponent_disconnected") {
        setStatus("reconnecting");
        setReason("opponent");
        return;
      }
      if (detail.reason === "opponent_reconnected") {
        setStatus("connected");
        setReason("");
        return;
      }
      if (detail.status === "connected" || detail.status === "reconnecting" || detail.status === "disconnected") setStatus(detail.status);
      setReason(String(detail.reason || ""));
    };
    window.addEventListener("ludo-multiplayer-connection", onStatus);
    return () => window.removeEventListener("ludo-multiplayer-connection", onStatus);
  }, []);

  if (status === "connected") return null;

  const opponent = reason === "opponent";
  return (
    <div style={{
      position: "fixed",
      top: "max(12px, env(safe-area-inset-top))",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 120,
      padding: "9px 14px",
      borderRadius: 999,
      background: "rgba(14,10,4,.94)",
      border: "1px solid rgba(225,190,84,.55)",
      color: "#f4df9a",
      fontSize: 11,
      fontWeight: 900,
      boxShadow: "0 8px 26px rgba(0,0,0,.4)",
      pointerEvents: "none",
      whiteSpace: "nowrap",
    }}>
      {opponent ? "⏳ Opponent connection lost — waiting for reconnect…" : status === "reconnecting" ? "🔄 Reconnecting to match…" : "⚠️ Connection lost — waiting to reconnect…"}
    </div>
  );
}
