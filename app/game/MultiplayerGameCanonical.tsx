"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import LudoBoard, { type BoardThemeId, type DemoToken } from "../_components/LudoBoardMultiplayer";
import DemoDice from "../_components/DemoDice";

type Color = "red" | "yellow" | "green" | "blue";
type Player = { playerId: string; name: string; seat: number; level?: number; avatar?: string; colors?: Color[]; connected?: boolean };
type GameState = { currentPlayerId: string | null; dice: number | null; pendingMove: number | null; players: Player[]; tokens: Record<string, Record<string, { position: number }>> };

const colors: Color[] = ["red", "yellow", "green", "blue"];
const initialTokens = (): DemoToken[] => colors.flatMap((color) => Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })));

function Avatar({ value, fallback }: { value?: string; fallback: string }) {
  const image = !!value && (value.startsWith("http") || value.startsWith("/") || value.startsWith("data:"));
  return image ? <img src={value} alt="Player avatar" className="mp-avatar-image" /> : <span>{value || fallback}</span>;
}

export default function MultiplayerGameCanonical() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [me, setMe] = useState("");
  const [roomCode, setRoomCode] = useState("W100NB");
  const [game, setGame] = useState<GameState | null>(null);
  const [tokens, setTokens] = useState<DemoToken[]>(initialTokens);
  const [roll, setRoll] = useState(6);
  const [pending, setPending] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRoomCode(params.get("room") || "W100NB");
    let mounted = true;
    let s: Socket | null = null;
    const connect = async () => {
      let playerId = "";
      let name = "Bambiii";
      let avatar = "";
      try {
        const response = await fetch("/api/auth", { cache: "no-store" });
        const data = await response.json();
        playerId = String(data?.user?.id || "");
        name = String(data?.user?.username || name);
        avatar = String(data?.user?.avatar || data?.user?.image || "");
      } catch {}
      if (!mounted) return;
      setMe(playerId);
      s = io(window.location.origin, { transports: ["websocket", "polling"], reconnection: true });
      setSocket(s);
      s.on("connect", () => {
        if (playerId) s?.emit("join-room", { roomCode: params.get("room") || "W100NB", name, avatar, roomSize: Number(params.get("size") || 2), playerId });
      });
      s.on("roster", (players: Player[]) => setGame((g) => g ? { ...g, players } : { currentPlayerId: playerId, dice: null, pendingMove: null, players, tokens: {} }));
      s.on("game-dice", (event: { value: number }) => { setRoll(event.value); setRolling(true); window.setTimeout(() => setRolling(false), 800); });
      s.on("game-state", (next: GameState) => {
        if (!mounted) return;
        setGame(next);
        if (next.dice != null) setRoll(next.dice);
        setPending(next.currentPlayerId === playerId ? next.pendingMove : null);
        const nextTokens = colors.flatMap((color) => Array.from({ length: 4 }, (_, id) => {
          const position = Number(next.tokens?.[color]?.[String(id)]?.position || 0);
          return { color, id, position, state: position === 0 ? "yard" as const : position > 51 ? "home" as const : "track" as const };
        }));
        setTokens(nextTokens);
      });
    };
    void connect();
    return () => { mounted = false; s?.disconnect(); };
  }, []);

  const players = useMemo(() => game?.players?.length ? game.players : [
    { playerId: me || "1", name: "Bambiii", seat: 0, level: 24, avatar: "👑" },
    { playerId: "2", name: "Adaugo", seat: 1, level: 18, avatar: "🎮" }
  ], [game?.players, me]);
  const mine = players.find((p) => String(p.playerId) === String(me)) || players[0];
  const opponent = players.find((p) => String(p.playerId) !== String(mine?.playerId)) || players[1];
  const myTurn = !game || game.currentPlayerId === me;

  const rollDice = () => {
    if (!socket || !game) { setRoll(Math.floor(Math.random() * 6) + 1); return; }
    if (!myTurn || pending !== null || rolling) return;
    socket.emit("game-roll");
  };

  return (
    <main className="ludo-live-wrapper">
      <div className="ludo-live-container">
        <header className="ll-header" aria-label="Multiplayer game header">
          <div className="ll-player-card left">
            <div className="ll-avatar-wrap"><div className="ll-avatar-img"><Avatar value={mine?.avatar} fallback="👑" /></div><span className="ll-level">★ {mine?.level || 24}</span></div>
            <div className="ll-player-meta"><div className="ll-player-name-row"><b>{mine?.name || "Player"}</b><span className="ll-badge-you">YOU</span></div><div className="ll-turn-status active"><span className="dot" /> {myTurn ? "Your Turn" : "In Match"}</div></div>
          </div>
          <div className="ll-brand" aria-label="Ludo Live"><div className="ll-crown">👑</div><h1 className="ll-logo-text">LUDO</h1><div className="ll-logo-sub">LIVE</div></div>
          <div className="ll-player-card right">
            <div className="ll-player-meta align-right"><b>{opponent?.name || "Opponent"}</b><div className="ll-turn-status in-match"><span className="dot red" /> IN MATCH</div></div>
            <div className="ll-avatar-wrap"><div className="ll-avatar-img"><Avatar value={opponent?.avatar} fallback="🎮" /></div><span className="ll-level">★ {opponent?.level || 18}</span></div>
          </div>
        </header>

        <section className="ll-board-stage" aria-label="Ludo board"><div className="ll-board-frame"><LudoBoard theme={"classic" as BoardThemeId} demoTokens={tokens} legalTokenKeys={[]} animateUpdates finishSound /></div></section>

        <div className="ll-bottom-panel">
          <div className="ll-controls-row">
            <div className="ll-user-box"><div className="ll-user-header"><div className="ll-user-avatar"><Avatar value={mine?.avatar} fallback="👑" /></div><div className="ll-user-copy"><b className="ll-u-name">{mine?.name || "Player"}</b><div className="ll-u-level">★ {mine?.level || 24}</div></div></div><div className="ll-coins-pill"><span className="coin-icon">🟡</span><b>2,450</b></div></div>
            <div className="ll-dice-box"><div className="ll-turn-copy"><div className="ll-turn-title"><span className="dot green" /> {myTurn ? "YOUR TURN" : "OPPONENT TURN"}</div><div className="ll-turn-sub">Roll the dice and<br />make your move</div><div className="ll-dice-result">{roll}</div><div className="ll-dice-hint">Tap the dice to roll</div></div><div className="ll-dice-slot"><DemoDice value={roll as any} onRoll={rollDice} disabled={!myTurn || pending !== null || rolling} botRolling={rolling} /></div></div>
            <div className="ll-side-actions"><button type="button" className="ll-action-btn"><span className="action-icon">💬</span><span>Chat</span></button><button type="button" className="ll-action-btn"><span className="action-icon">🎙</span><span>Mic On</span></button></div>
          </div>
          <div className="ll-reactions-bar"><button type="button" className="ll-pill-btn">👋 Hi!</button><button type="button" className="ll-pill-btn">😂 LOL</button><button type="button" className="ll-pill-btn">🔥 Nice!</button><button type="button" className="ll-pill-btn">👍 Good move</button><button type="button" className="ll-pill-btn">🏆 GG</button></div>
          <footer className="ll-footer"><button type="button" className="ll-foot-btn exit">🚪 Leave Match</button><button type="button" className="ll-foot-btn">👥 Players</button><button type="button" className="ll-foot-btn">🔊 Sound</button><div className="ll-room-chip"><span className="shield">🛡️</span><small>Room ID: {roomCode}</small></div></footer>
        </div>
      </div>
      <style jsx global>{`
        .ludo-live-wrapper .ludo-live-container > .ll-header { display:grid !important; visibility:visible !important; opacity:1 !important; position:relative !important; z-index:1000 !important; }
        .ludo-live-wrapper .ludo-live-container > .ll-header > .ll-player-card { display:flex !important; visibility:visible !important; opacity:1 !important; position:relative !important; z-index:1001 !important; }
        .ludo-live-wrapper .ludo-live-container > .ll-header > .ll-brand { display:block !important; visibility:visible !important; opacity:1 !important; position:relative !important; z-index:1002 !important; }
        .ludo-live-wrapper .ludo-live-container > .ll-board-stage { position:relative !important; z-index:1 !important; }
        @media (max-width:520px) { .ludo-live-wrapper .ludo-live-container > .ll-header { grid-template-columns:minmax(0,1fr) 82px minmax(0,1fr) !important; column-gap:6px !important; min-height:72px !important; } }
      `}</style>
    </main>
  );
}
