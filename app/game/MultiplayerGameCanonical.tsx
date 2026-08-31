"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import LudoBoard, { type BoardThemeId, type DemoToken } from "../_components/LudoBoardMultiplayer";
import DemoDice from "../_components/DemoDice";
import { canMove, hasLegalMove, nextProgress, FINISH_PROGRESS, type DiceValue } from "../../lib/ludoEngine";
import { playerColorsForSeats } from "../../lib/ludoRules";
import { BOARD_PALETTES } from "../_components/LudoBoardMultiplayer";

type Color = "red" | "yellow" | "green" | "blue";
type Player = { 
  playerId: string; 
  name: string; 
  seat: number; 
  host?: boolean; 
  ready?: boolean; 
  connected?: boolean; 
  colors?: Color[]; 
  board?: string; 
  level?: number; 
  avatar?: string 
};
type TokenMap = Record<string, Record<string, { position: number }>>;
type GameState = { 
  status: string; 
  currentPlayerId: string | null; 
  dice: DiceValue | null; 
  pendingMove: DiceValue | null; 
  sixStreak: number; 
  players: Player[]; 
  tokens: TokenMap; 
  winnerId?: string | null; 
  stateRevision?: number; 
  startedAt?: number 
};
type ChatMessage = { id: string; name: string; text: string; at: number };

const COLORS: Color[] = ["red", "yellow", "green", "blue"];
const FINISH = FINISH_PROGRESS;
const initialTokens = (): DemoToken[] => COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })));
const normalizeTokens = (serverTokens: TokenMap): DemoToken[] => COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => { 
  const raw = serverTokens?.[color]?.[String(id)]?.position; 
  const position = typeof raw === "number" && Number.isFinite(raw) ? raw : 0; 
  return { color, id, position, state: position === 0 ? ("yard" as const) : position === FINISH ? ("finished" as const) : position > 51 ? ("home" as const) : ("track" as const) }; 
}));
const audioEvent = (kind: "dice" | "win") => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ludo-audio", { detail: kind })); };

function PlayerAvatar({ src, fallback }: { src?: string; fallback: string }) {
  const isImageUrl = src && (src.startsWith("http") || src.startsWith("/") || src.startsWith("data:"));
  if (isImageUrl) {
    return <img src={src} alt="Player avatar" className="ll-avatar-img-element" />;
  }
  return <span>{src || fallback}</span>;
}

const QUICK_REACTIONS = ["👋 Hi!", "😂 LOL", "🔥 Nice!", "👍 Good move", "🏆 GG", "😜"];

export default function MultiplayerGameCanonical() {
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
  const [notice] = useState("Roll the dice and make your move");
  const [, setChatOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [roomCode, setRoomCode] = useState("W100NB");
  const [coins] = useState(2450);

  const diceTimer = useRef<number | null>(null);
  const moveTimer = useRef<number | null>(null);
  const winnerRef = useRef<string | null>(null);
  const revisionRef = useRef(-1);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("room")) setRoomCode(params.get("room") || "W100NB");
    }
  }, []);

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

      const params = new URLSearchParams(window.location.search); 
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
        audioEvent("dice"); 
        if (diceTimer.current) window.clearTimeout(diceTimer.current); 
        diceTimer.current = window.setTimeout(() => setRemoteRolling(false), 900); 
      }); 
      localSocket.on("game-state", (next: GameState) => { 
        if (!mounted || !applyState(next)) return; 
        if (next.dice !== null) setRoll(next.dice); 
        setPending(next.currentPlayerId === playerId ? next.pendingMove : null); 
        if (next.winnerId && winnerRef.current !== next.winnerId) { 
          winnerRef.current = next.winnerId; 
          audioEvent("win"); 
        } 
      }); 
    }; 
    void connect(); 
    return () => { 
      mounted = false; 
      if (diceTimer.current) window.clearTimeout(diceTimer.current); 
      if (moveTimer.current) window.clearTimeout(moveTimer.current); 
      localSocket?.disconnect(); 
    }; 
  }, [applyState, roomCode]);

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

  const copyRoomId = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(roomCode);
    }
  };

  return (
    <main className="ludo-live-wrapper">
      <div className="ludo-live-container">
        {/* TOP HEADER */}
        <header className="ll-header">
          {/* Left Player (Self) */}
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

          {/* Logo Center */}
          <div className="ll-brand">
            <div className="ll-crown">👑</div>
            <h1 className="ll-logo-text">LUDO</h1>
            <div className="ll-logo-sub">LIVE</div>
          </div>

          {/* Right Player (Opponent) */}
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

        {/* BOTTOM PANEL */}
        <div className="ll-bottom-panel">
          <div className="ll-controls-row">
            {/* User Info Box */}
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

            {/* Turn Box */}
            <div className="ll-dice-box">
              <div className="ll-turn-title">
                <span className="dot green" /> YOUR TURN
              </div>
              <div className="ll-turn-sub">{notice}</div>
              <div className="ll-dice-hint">Tap the dice to roll</div>
            </div>

            {/* Scaled Floating 3D Dice */}
            <div className="ll-dice-container">
              <DemoDice 
                value={roll} 
                onRoll={handleRoll} 
                disabled={!myTurn || pending !== null || animating || remoteRolling} 
                botRolling={remoteRolling} 
              />
            </div>

            {/* Side Action Buttons */}
            <div className="ll-side-actions">
              <button type="button" className="ll-action-btn" onClick={() => setChatOpen((v) => !v)}>
                💬
                <span>Chat</span>
              </button>
              <button type="button" className={`ll-action-btn ${muted ? "off" : ""}`} onClick={() => setMuted((v) => !v)}>
                🎙️
                <span>{muted ? "Mic Off" : "Mic On"}</span>
              </button>
            </div>
          </div>

          {/* Quick Reactions Bar */}
          <div className="ll-reactions-bar">
            {QUICK_REACTIONS.map((text, idx) => (
              <button key={idx} type="button" className="ll-pill-btn" onClick={() => sendQuickReaction(text)}>
                {text}
              </button>
            ))}
          </div>

          {/* Footer */}
          <footer className="ll-footer">
            <button type="button" className="ll-foot-btn exit">🚪 Leave Match</button>
            <button type="button" className="ll-foot-btn">👥 Players</button>
            <button type="button" className="ll-foot-btn" onClick={() => setSoundEnabled((v) => !v)}>
              {soundEnabled ? "🔊 Sound" : "🔇 Sound"}
            </button>
            <div className="ll-room-chip" onClick={copyRoomId}>
              <span className="shield">🛡️</span>
              <small>Room ID: {roomCode}</small>
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
          max-width: 440px;
          height: 100dvh;
          background: #000;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 12px 14px 16px;
          overflow: hidden;
        }

        /* HEADER FIXES */
        .ll-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          height: 50px;
          flex-shrink: 0;
          z-index: 50;
        }

        .ll-player-card {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ll-avatar-wrap {
          position: relative;
          width: 38px;
          height: 38px;
        }

        .ll-avatar-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #2a2215, #110e08);
          border: 1.5px solid #d4af37;
          display: grid;
          place-items: center;
          font-size: 18px;
          overflow: hidden;
        }

        .ll-avatar-img-element {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .ll-level {
          position: absolute;
          bottom: -4px;
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

        .ll-player-meta b {
          display: block;
          font-size: 11px;
          color: #fff;
        }

        .ll-player-name-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }

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

        .ll-turn-status .dot.red {
          background: #ef4444;
          box-shadow: 0 0 6px #ef4444;
        }

        .align-right { text-align: right; }

        /* BRAND CENTER */
        .ll-brand { text-align: center; }
        .ll-crown { font-size: 12px; line-height: 1; margin-bottom: -2px; }
        .ll-logo-text {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 1px;
          background: linear-gradient(180deg, #fff2a3 0%, #d4af37 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
          line-height: 1;
        }
        .ll-logo-sub {
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 2px;
          color: #fff;
          opacity: 0.8;
        }

        /* BOARD STAGE FLEX FIX */
        .ll-board-stage {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 0;
          padding: 6px 0;
        }

        .ll-board-frame {
          width: min(84vw, 360px);
          height: min(84vw, 360px);
          padding: 5px;
          border-radius: 20px;
          background: linear-gradient(145deg, #f5d77f, #8c6819, #e6c86e);
          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        }

        .ll-board-frame > div {
          width: 100% !important;
          height: 100% !important;
          border-radius: 16px;
          overflow: hidden;
        }

        /* BOTTOM CONTROL PANEL */
        .ll-bottom-panel {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ll-controls-row {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          gap: 6px;
        }

        .ll-user-box {
          flex: 1;
          background: #110e0a;
          border: 1px solid #2a2215;
          border-radius: 14px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .ll-user-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ll-user-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #21190e;
          border: 1px solid #d4af37;
          display: grid;
          place-items: center;
          font-size: 14px;
          overflow: hidden;
        }

        .ll-u-name { font-size: 10px; color: #fff; display: block; }
        .ll-u-level { font-size: 8px; color: #d4af37; }

        .ll-coins-pill {
          margin-top: 6px;
          background: #080604;
          border: 1px solid #261e12;
          border-radius: 16px;
          padding: 3px 6px;
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

        .ll-dice-box {
          flex: 1.2;
          background: #110e0a;
          border: 1px solid #2a2215;
          border-radius: 14px;
          padding: 8px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .ll-turn-title {
          font-size: 9px;
          font-weight: 900;
          color: #4ade80;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .ll-turn-sub { font-size: 7px; color: #777; margin-top: 1px; }
        .ll-dice-hint { font-size: 7px; color: #555; margin-top: 14px; }

        /* SCALED FLOATING DICE */
        .ll-dice-container {
          position: absolute;
          left: 50%;
          top: 48%;
          transform: translate(-50%, -50%) scale(0.62);
          z-index: 30;
          transform-origin: center center;
          pointer-events: auto;
        }

        .ll-dice-container :global(canvas),
        .ll-dice-container :global(svg) {
          max-width: 50px !important;
          max-height: 50px !important;
        }

        .ll-side-actions {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ll-action-btn {
          width: 40px;
          height: 40px;
          background: #110e0a;
          border: 1px solid #2a2215;
          border-radius: 12px;
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          cursor: pointer;
        }
        .ll-action-btn span { font-size: 7px; color: #aaa; margin-top: 1px; }
        .ll-action-btn.off { border-color: #ef4444; }

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
          border-radius: 10px;
          padding: 5px 8px;
          font-size: 8px;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
        }

        .ll-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
        }

        .ll-foot-btn {
          background: #110e0a;
          border: 1px solid #2a2215;
          color: #aaa;
          border-radius: 8px;
          padding: 5px 6px;
          font-size: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .ll-foot-btn.exit { color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }

        .ll-room-chip {
          background: #0f1710;
          border: 1px solid #15803d;
          border-radius: 8px;
          padding: 4px 6px;
          display: flex;
          align-items: center;
          gap: 3px;
          cursor: pointer;
        }
        .ll-room-chip small { font-size: 8px; color: #4ade80; font-weight: 700; }
        .ll-room-chip .shield { font-size: 8px; }
      `}</style>
    </main>
  );
}
