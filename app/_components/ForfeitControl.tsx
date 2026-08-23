"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { usePathname } from "next/navigation";

export default function ForfeitControl() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (pathname !== "/game") return;
    return () => setOpen(false);
  }, [pathname]);

  if (pathname !== "/game") return null;

  const forfeit = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("Submitting forfeit…");
    try {
      const auth = await fetch("/api/auth", { cache: "no-store" }).then(r => r.json());
      const playerId = String(auth?.user?.id || "");
      const params = new URLSearchParams(window.location.search);
      const roomCode = String(params.get("room") || "");
      if (!playerId || !roomCode) {
        setMessage("This game cannot be forfeited from this screen.");
        setBusy(false);
        return;
      }
      const socket = io(window.location.origin, { transports: ["websocket", "polling"], forceNew: true });
      socket.once("connect", () => socket.emit("game-forfeit", { roomCode, playerId, reason: "player-forfeit" }));
      socket.once("game-forfeit-result", (result: { winnerId?: string; loserId?: string }) => {
        setMessage(result.loserId === playerId ? "You forfeited this match." : "Forfeit recorded.");
        window.dispatchEvent(new CustomEvent("ludo-winner", { detail: { winnerName: result.winnerId === playerId ? "You" : "Opponent", mode: params.get("tournament") ? "tournament" : Number(params.get("size")) === 2 ? "2p" : "4p", tournament: params.has("tournament") } }));
        window.setTimeout(() => socket.disconnect(), 1500);
      });
      socket.once("game-forfeit-error", (error: { message?: string }) => {
        setMessage(error?.message || "Forfeit could not be recorded.");
        socket.disconnect();
        setBusy(false);
      });
    } catch {
      setMessage("Forfeit could not be recorded. Please try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={busy} aria-label="Forfeit match" style={{ position:"fixed", right:12, bottom:18, zIndex:100001, border:0, borderRadius:999, padding:"10px 15px", background:"rgba(120,20,35,.9)", color:"#fff", fontWeight:900, letterSpacing:1, fontSize:11, boxShadow:"0 8px 24px rgba(0,0,0,.35)", cursor:"pointer" }}>
        {busy ? "FORFEITING…" : "FORFEIT"}
      </button>
      {open && <div style={{ position:"fixed", inset:0, zIndex:100002, display:"grid", placeItems:"center", padding:20, background:"rgba(0,0,0,.68)" }}>
        <div style={{ width:"min(420px,92vw)", borderRadius:24, padding:24, background:"#0b1220", color:"#fff", boxShadow:"0 20px 70px rgba(0,0,0,.5)", textAlign:"center" }}>
          <div style={{ fontSize:42 }}>🏳️</div>
          <h2 style={{ margin:"8px 0", fontSize:26 }}>Forfeit this match?</h2>
          <p style={{ margin:"0 0 20px", color:"#aeb8cc", lineHeight:1.5 }}>You will lose the match immediately and the opponent will become the winner. This cannot be undone.</p>
          {message && <p style={{ color:"#ffd166", fontWeight:800 }}>{message}</p>}
          <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
            <button type="button" onClick={() => setOpen(false)} disabled={busy} style={{ border:0, borderRadius:999, padding:"12px 20px", fontWeight:900, cursor:"pointer" }}>KEEP PLAYING</button>
            <button type="button" onClick={forfeit} disabled={busy} style={{ border:0, borderRadius:999, padding:"12px 20px", fontWeight:900, color:"#fff", background:"#b4233c", cursor:"pointer" }}>FORFEIT</button>
          </div>
        </div>
      </div>}
    </>
  );
}
