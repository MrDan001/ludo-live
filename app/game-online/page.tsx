"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import LudoBoard, { type BoardThemeId, type DemoToken } from "../_components/LudoBoardMultiplayer";
import DemoDice from "../_components/DemoDice";
import { canMove, nextProgress, FINISH_PROGRESS, type DiceValue } from "../../lib/ludoEngine";
import { playerColorsForSeats } from "../../lib/ludoRules";

export const dynamic = "force-dynamic";

type Color = "red" | "yellow" | "green" | "blue";
type Player = { 
  playerId: string; 
  name: string; 
  seat: number; 
  colors?: Color[]; 
  level?: number; 
  avatar?: string 
};
type TokenMap = Record<string, Record<string, { position: number }>>;
type GameState = { 
  status: string; 
  currentPlayerId: string | null; 
  dice: DiceValue | null; 
  pendingMove: DiceValue | null; 
  players: Player[]; 
  tokens: TokenMap; 
  winnerId?: string | null; 
  stateRevision?: number; 
};

const COLORS: Color[] = ["red", "yellow", "green", "blue"];
const FINISH = FINISH_PROGRESS;
const initialTokens = (): DemoToken[] => COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })));
const normalizeTokens = (serverTokens: TokenMap): DemoToken[] => COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => { 
  const raw = serverTokens?.[color]?.[String(id)]?.position; 
  const position = typeof raw === "number" && Number.isFinite(raw) ? raw : 0; 
  return { color, id, position, state: position === 0 ? ("yard" as const) : position === FINISH ? ("finished" as const) : position > 51 ? ("home" as const) : ("track" as const) }; 
}));

function PlayerAvatar({ src, fallback }: { src?: string; fallback: string }) {
  if (src && (src.startsWith("http") || src.startsWith("/") || src.startsWith("data:"))) {
    return <img src={src} alt="Avatar" className="ll-avatar-img-element" />;
  }
  return <span>{src || fallback}</span>;
}

const QUICK_REACTIONS = ["👋 Hi!", "😂 LOL", "🔥 Nice!", "👍 Good move", "🏆 GG", "😜"];

function GameContent() {
  const params = useSearchParams();
  const [theme] = useState<BoardThemeId>("classic");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [me, setMe] = useState("");
  const [myAvatarUrl, setMyAvatarUrl] = useState("");
  const [game, setGame] = useState<GameState | null>(null);
  const [tokens, setTokens] = useState<DemoToken[]>(initialTokens);
  const [roll, setRoll] = useState<DiceValue>(6);
  const [pending, setPending] = useState<DiceValue | null>(null);
  const [remoteRolling, setRemoteRolling] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [muted, setMuted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [roomCode, setRoomCode] = useState("W100NB");
  const [coins] = useState(2450);

  const diceTimer = useRef<number | null>(null);
  const revisionRef = useRef(-1);

  useEffect(() => {
    if (params.get("room")) setRoomCode(params.get("room") || "W100NB");
  }, [params]);

  const players = useMemo(() => {
    if (game?.players?.length) return game.players;
    return [
      { playerId: me || "1", name: "Bambiii", level: 24, avatar: myAvatarUrl || "👑", seat: 0 },
      { playerId: "2", name: "Adaugo", level: 18, avatar: "🎮", seat: 1 }
    ];
  }, [game?.players, me, myAvatarUrl]);

  const mine = players.find((p) => String(p.playerId) === String(me)) || players[0];
  const opponent = players.find((p) => String(p.playerId) !== String(mine.playerId)) || players[1];

  const myColors = useMemo<Color[]>(
    () => (mine?.colors?.length ? mine.colors : (playerColorsForSeats(players.length === 2 ? 2 : 4, mine?.seat ?? 0) as Color[])),
    [mine, players.length]
  );
  const myTurn = game ? game.currentPlayerId === me : true;
  const legalTokenKeys = useMemo(
    () => (pending === null || !myTurn ? [] : tokens.filter((t) => myColors.includes(t.color) && canMove(tokens, t, pending)).map((t) => `${t.color}:${t.id}`)),
    [pending, myTurn, tokens, myColors]
  );

  const applyState = useCallback((next: GameState) => { 
    const r = Number(next.stateRevision ?? -1); 
    if (r >= 0 && revisionRef.current >= 0 && r < revisionRef.current) return false; 
    if (r >= 0) revisionRef.current = r; 
    setGame(next); 
    setTokens(normalizeTokens(next.tokens || {})); 
    return true; 
  }, []);

  useEffect(() => { 
    let mounted = true; 
    let localSocket: Socket | null = null; 
    const connect = async () => { 
      let playerId = "", profileName = "Bambiii", profileAvatar = ""; 
      try { 
        const r = await fetch("/api/auth", { cache: "no-store" }); 
        const d = await r.json(); 
        playerId = String(d?.user?.id || ""); 
        profileName = String(d?.user?.username || "Bambiii"); 
        profileAvatar = String(d?.user?.avatar || d?.user?.image || "");
      } catch {} 
      if (!mounted) return;
      if (playerId) setMe(playerId); 
      if (profileAvatar) setMyAvatarUrl(profileAvatar);

      const room = params.get("room") || roomCode; 
      const roomSize = Number(params.get("size") || 2); 

      localSocket = io(window.location.origin, { transports: ["websocket", "polling"], reconnection: true }); 
      setSocket(localSocket); 

      localSocket.on("connect", () => { 
        if (room && playerId) { 
          localSocket?.emit("join-room", { roomCode: room, name: profileName, avatar: profileAvatar, roomSize, playerId }); 
        } 
      }); 
      localSocket.on("roster", (members: Player[]) => { 
        setGame((g) => (g ? { ...g, players: members } : g)); 
      }); 
      localSocket.on("game-dice", (e: { value: DiceValue }) => { 
        setRoll(e.value); 
        setRemoteRolling(true); 
        if (diceTimer.current) window.clearTimeout(diceTimer.current); 
        diceTimer.current = window.setTimeout(() => setRemoteRolling(false), 900); 
      }); 
      localSocket.on("game-state", (next: GameState) => { 
        if (!mounted || !applyState(next)) return; 
        if (next.dice !== null) setRoll(next.dice); 
        setPending(next.currentPlayerId === playerId ? next.pendingMove : null); 
      }); 
    }; 
    void connect(); 
    return () => { 
      mounted = false; 
      if (diceTimer.current) window.clearTimeout(diceTimer.current); 
      localSocket?.disconnect(); 
    }; 
  }, [applyState, roomCode, params]);

  const chooseToken = useCallback((color: Color, id: number) => { 
    if (!socket || !game || !myTurn || pending === null || animating) return; 
    const token = tokens.find((t) => t.color === color && t.id === id); 
    if (!token || !myColors.includes(color) || !canMove(tokens, token, pending)) return; 
    const target = nextProgress(token.position, pending); 
    if (target === null) return; 
    setPending(null); 
    setAnimating(true); 
    socket.emit("game-move", { tokenId: `${color}:${id}`, to: target }); 
  }, [socket, game, myTurn, pending, animating, tokens, myColors]);

  const handleRoll = useCallback(() => { 
    if (!socket || !game) {
      setRoll((Math.floor(Math.random() * 6) + 1) as DiceValue);
      return;
    }
    if (!myTurn || pending !== null || animating || remoteRolling) return; 
    socket.emit("game-roll"); 
  }, [socket, game, myTurn, pending, animating, remoteRolling]);

  const sendQuickReaction = (text: string) => {
    if (socket) socket.emit("chat", { text });
  };

  return (
    <main className="ludo-live-wrapper">
      <div className="ludo-live-container">
        {/* TOP HEADER CARDS */}
        <header className="ll-header">
          <div className="ll-player-card left">
            <div className="ll-avatar-wrap">
              <div className="ll-avatar-img">
                <PlayerAvatar src={mine.avatar} fallback="👑" />
              </div>
              <span className="ll-level">★ {mine.level || 24}</span>
            </div>
            <div className="ll-player-meta">
              <div className="ll-player-name-row">
                <b>{mine.name}</b>
                <span className="ll-badge-you">you</span>
              </div>
              <div className="ll-turn-status active">
                <span className="dot" /> Your Turn
              </div>
            </div>
          </div>

          <div className="ll-brand">
            <div className="ll-crown">👑</div>
            <h1 className="ll-logo-text">LUDO</h1>
            <div className="ll-logo-sub">LIVE</div>
          </div>

          <div className="ll-player-card right">
            <div className="ll-player-meta align-right">
              <b>{opponent.name}</b>
              <div className="ll-turn-status in-match">
                <span className="dot red" /> IN MATCH
              </div>
            </div>
            <div className="ll-avatar-wrap">
              <div className="ll-avatar-img">
                <PlayerAvatar src={opponent.avatar} fallback="🎮" />
              </div>
              <span className="ll-level">★ {opponent.level || 18}</span>
            </div>
          </div>
        </header>

        {/* BOARD STAGE */}
        <div className="ll-board-stage">
          <div className="ll-board-frame">
            <LudoBoard theme={theme} demoTokens={tokens} onTokenClick={chooseToken} legalTokenKeys={legalTokenKeys} animateUpdates finishSound />
          </div>
        </div>

        {/* BOTTOM HUD PANEL */}
        <div className="ll-bottom-panel">
          <div className="ll-controls-row">
            {/* User Box */}
            <div className="ll-user-box">
              <div className="ll-user-header">
                <div className="ll-user-avatar">
                  <PlayerAvatar src={mine.avatar} fallback="👑" />
                </div>
                <div>
                  <b className="ll-u-name">{mine.name}</b>
                  <div className="ll-u-level">★ {mine.level || 24}</div>
                </div>
              </div>
              <div className="ll-coins-pill">
                <span className="coin-icon">🟡</span>
                <b>{coins.toLocaleString()}</b>
                <button type="button" className="plus-btn">+</button>
              </div>
            </div>

            {/* Turn & Dice Box */}
            <div className="ll-dice-box">
              <div className="ll-turn-title">
                <span className="dot green" /> YOUR TURN
              </div>
              <div className="ll-dice-slot">
                <DemoDice 
                  value={roll} 
                  onRoll={handleRoll} 
                  disabled={!myTurn || pending !== null || animating || remoteRolling} 
                  botRolling={remoteRolling} 
                />
              </div>
              <div className="ll-dice-hint">Tap dice to roll</div>
            </div>

            {/* Actions */}
            <div className="ll-side-actions">
              <button type="button" className="ll-action-btn">💬<span>Chat</span></button>
              <button type="button" className={`ll-action-btn ${muted ? "off" : ""}`} onClick={() => setMuted((v) => !v)}>
                🎙️<span>{muted ? "Off" : "On"}</span>
              </button>
            </div>
          </div>

          {/* Quick Reactions */}
          <div className="ll-reactions-bar">
            {QUICK_REACTIONS.map((text, idx) => (
              <button key={idx} type="button" className="ll-pill-btn" onClick={() => sendQuickReaction(text)}>
                {text}
              </button>
            ))}
          </div>

          {/* Footer */}
          <footer className="ll-footer">
            <button type="button" className="ll-foot-btn exit">🚪 Leave</button>
            <button type="button" className="ll-foot-btn">👥 Players</button>
            <button type="button" className="ll-foot-btn" onClick={() => setSoundEnabled((v) => !v)}>
              {soundEnabled ? "🔊 Sound" : "🔇 Sound"}
            </button>
            <div className="ll-room-chip">
              <span className="shield">🛡️</span>
              <small>Room: {roomCode}</small>
            </div>
          </footer>
        </div>
      </div>

      <style jsx global>{`
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100%;
          height: 100%;
          overflow: hidden !important;
          background: #000 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        * { box-sizing: border-box; }

        .ludo-live-wrapper {
          position: fixed;
          inset: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #000;
        }

        .ludo-live-container {
          position: relative;
          width: 100%;
          max-width: 420px;
          height: 100dvh;
          background: #000;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 8px 12px 12px;
          overflow: hidden;
        }

        .ll-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          height: 48px;
          flex-shrink: 0;
        }

        .ll-player-card { display: flex; align-items: center; gap: 6px; }

        .ll-avatar-wrap {
          position: relative;
          width: 36px;
          height: 36px;
        }

        .ll-avatar-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #2a2215, #110e08);
          border: 1.5px solid #d4af37;
          display: grid;
          place-items: center;
          font-size: 16px;
          overflow: hidden;
        }

        .ll-avatar-img-element { width: 100%; height: 100%; object-fit: cover; }

        .ll-level {
          position: absolute;
          bottom: -3px;
          left: 50%;
          transform: translateX(-50%);
          background: #18140c;
          border: 1px solid #d4af37;
          color: #d4af37;
          font-size: 8px;
          font-weight: 800;
          padding: 0 4px;
          border-radius: 6px;
          white-space: nowrap;
        }

        .ll-player-meta b { display: block; font-size: 11px; color: #fff; }
        .ll-player-name-row { display: flex; align-items: center; gap: 4px; }

        .ll-badge-you {
          background: #d4af37;
          color: #000;
          font-size: 8px;
          font-weight: 900;
          padding: 1px 4px;
          border-radius: 4px;
        }

        .ll-turn-status {
          font-size: 9px;
          color: #888;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 1px;
        }

        .ll-turn-status.active { color: #4ade80; }
        .ll-turn-status.in-match { color: #ef4444; }

        .ll-turn-status .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 6px #4ade80;
        }
        .ll-turn-status .dot.red { background: #ef4444; box-shadow: 0 0 6px #ef4444; }

        .align-right { text-align: right; }

        .ll-brand { text-align: center; }
        .ll-crown { font-size: 11px; line-height: 1; margin-bottom: -2px; }
        .ll-logo-text {
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 1px;
          background: linear-gradient(180deg, #fff2a3 0%, #d4af37 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
          line-height: 1;
        }
        .ll-logo-sub { font-size: 7px; font-weight: 800; letter-spacing: 2px; color: #fff; opacity: 0.8; }

        /* ELIMINATE EXTRA TOP & BOTTOM MARGINS AROUND BOARD */
        .ll-board-stage {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 0;
          padding: 0;
        }

        .ll-board-frame {
          width: min(90vw, 360px);
          height: min(90vw, 360px);
          padding: 4px;
          border-radius: 18px;
          background: linear-gradient(145deg, #f5d77f, #8c6819, #e6c86e);
          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        }

        .ll-board-frame > div {
          width: 100% !important;
          height: 100% !important;
          border-radius: 14px;
          overflow: hidden;
        }

        .ll-bottom-panel {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ll-controls-row {
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          gap: 6px;
          height: 84px;
        }

        .ll-user-box {
          flex: 1;
          background: #110e0a;
          border: 1px solid #2a2215;
          border-radius: 12px;
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .ll-user-header { display: flex; items-center; gap: 6px; }

        .ll-user-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #21190e;
          border: 1px solid #d4af37;
          display: grid;
          place-items: center;
          font-size: 13px;
          overflow: hidden;
        }

        .ll-u-name { font-size: 10px; color: #fff; display: block; }
        .ll-u-level { font-size: 8px; color: #d4af37; }

        .ll-coins-pill {
          background: #080604;
          border: 1px solid #261e12;
          border-radius: 14px;
          padding: 2px 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ll-coins-pill b { font-size: 10px; color: #fff; }
        .plus-btn {
          margin-left: auto;
          background: #22c55e;
          color: #fff;
          border: none;
          border-radius: 50%;
          width: 14px;
          height: 14px;
          font-size: 10px;
          line-height: 1;
          cursor: pointer;
        }

        /* INLINE SCALED DICE BOX */
        .ll-dice-box {
          flex: 1.2;
          background: #110e0a;
          border: 1px solid #2a2215;
          border-radius: 12px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
        }

        .ll-turn-title { font-size: 8px; font-weight: 900; color: #4ade80; display: flex; align-items: center; gap: 4px; }
        .ll-dice-slot {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          transform: scale(0.65);
        }
        .ll-dice-hint { font-size: 7px; color: #666; }

        .ll-side-actions { display: flex; flex-direction: column; gap: 4px; }
        .ll-action-btn {
          width: 40px;
          height: 38px;
          background: #110e0a;
          border: 1px solid #2a2215;
          border-radius: 10px;
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          cursor: pointer;
        }
        .ll-action-btn span { font-size: 7px; color: #aaa; margin-top: 1px; }

        .ll-reactions-bar {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .ll-reactions-bar::-webkit-scrollbar { display: none; }

        .ll-pill-btn {
          background: #110e0a;
          border: 1px solid #2a2215;
          color: #d4af37;
          border-radius: 8px;
          padding: 4px 8px;
          font-size: 8px;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
        }

        .ll-footer { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
        .ll-foot-btn {
          background: #110e0a;
          border: 1px solid #2a2215;
          color: #aaa;
          border-radius: 6px;
          padding: 4px 6px;
          font-size: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .ll-foot-btn.exit { color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }

        .ll-room-chip {
          background: #0f1710;
          border: 1px solid #15803d;
          border-radius: 6px;
          padding: 3px 5px;
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .ll-room-chip small { font-size: 8px; color: #4ade80; font-weight: 700; }
        .ll-room-chip .shield { font-size: 8px; }
      `}</style>
    </main>
  );
}

export default function OnlineGamePage() {
  return (
    <Suspense fallback={<div style={{ background: "#000", height: "100vh" }} />}>
      <GameContent />
    </Suspense>
  );
}
