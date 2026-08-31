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
                <span className="ll-badge-you">YOU</span>
              </div>
              <div className="ll-turn-status active">
                <span className="dot" /> Your Turn
              </div>
            </div>
          </div>

          <div className="ll-brand" aria-label="Ludo Live">
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

        <div className="ll-board-stage">
          <div className="ll-board-frame">
            <LudoBoard theme={theme} demoTokens={tokens} onTokenClick={chooseToken} legalTokenKeys={legalTokenKeys} animateUpdates finishSound />
          </div>
        </div>

        <div className="ll-bottom-panel">
          <div className="ll-controls-row">
            <div className="ll-user-box">
              <div className="ll-user-header">
                <div className="ll-user-avatar">
                  <PlayerAvatar src={mine.avatar} fallback="👑" />
                </div>
                <div className="ll-user-copy">
                  <b className="ll-u-name">{mine.name}</b>
                  <div className="ll-u-level">★ {mine.level || 24}</div>
                </div>
                <span className="ll-edit-mark">✎</span>
              </div>
              <div className="ll-coins-pill">
                <span className="coin-icon">🟡</span>
                <b>{coins.toLocaleString()}</b>
                <button type="button" className="plus-btn" aria-label="Add coins">+</button>
              </div>
            </div>

            <div className="ll-dice-box">
              <div className="ll-turn-copy">
                <div className="ll-turn-title">
                  <span className="dot green" /> YOUR TURN
                </div>
                <div className="ll-turn-sub">Roll the dice and<br />make your move</div>
                <div className="ll-dice-result">{roll}</div>
                <div className="ll-dice-hint">Tap the dice to roll</div>
              </div>
              <div className="ll-dice-slot">
                <DemoDice value={roll} onRoll={handleRoll} disabled={!myTurn || pending !== null || animating || remoteRolling} botRolling={remoteRolling} />
              </div>
            </div>

            <div className="ll-side-actions">
              <button type="button" className="ll-action-btn" onClick={() => setChatOpen((v) => !v)}>
                <span className="action-icon">💬</span>
                <span>Chat</span>
              </button>
              <button type="button" className={`ll-action-btn ${muted ? "off" : ""}`} onClick={() => setMuted((v) => !v)}>
                <span className="action-icon">🎙</span>
                <span>Mic {muted ? "Off" : "On"}</span>
              </button>
            </div>
          </div>

          <div className="ll-reactions-bar">
            {QUICK_REACTIONS.map((text, idx) => (
              <button key={idx} type="button" className="ll-pill-btn" onClick={() => sendQuickReaction(text)}>
                {text}
              </button>
            ))}
          </div>

          <footer className="ll-footer">
            <button type="button" className="ll-foot-btn exit">🚪 Leave Match</button>
            <button type="button" className="ll-foot-btn">👥 Players</button>
            <button type="button" className="ll-foot-btn" onClick={() => setSoundEnabled((v) => !v)}>
              {soundEnabled ? "🔊 Sound" : "🔇 Sound"}
            </button>
            <div className="ll-room-chip" onClick={copyRoomId}>
              <span className="shield">🛡️</span>
              <small>Room ID: {roomCode}</small>
              <span className="copy-icon">▢</span>
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
          overflow: hidden;
        }

        .ludo-live-container {
          position: relative;
          width: 100%;
          max-width: 760px;
          height: 100dvh;
          background: #000;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          padding: 20px 22px 18px;
          overflow: hidden;
        }

        .ll-header {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          align-items: center;
          gap: 12px;
          width: 100%;
          min-height: 112px;
          padding: 4px 0 14px;
          z-index: 50;
        }

        .ll-player-card {
          min-width: 0;
          min-height: 92px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border: 1px solid rgba(212,175,55,.58);
          border-radius: 25px;
          background: linear-gradient(145deg, rgba(24,19,9,.94), rgba(5,5,4,.98));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 10px 28px rgba(0,0,0,.5);
        }

        .ll-player-card.right { justify-content: flex-end; }

        .ll-avatar-wrap { position: relative; flex: 0 0 60px; width: 60px; height: 60px; }
        .ll-avatar-img { width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(135deg, #2a2215, #110e08); border: 2px solid #d4af37; display: grid; place-items: center; font-size: 26px; overflow: hidden; }
        .ll-avatar-img-element { width: 100%; height: 100%; object-fit: cover; }
        .ll-level { position: absolute; left: 50%; bottom: -7px; transform: translateX(-50%); min-width: 52px; text-align: center; background: #18140c; border: 1px solid #d4af37; color: #d4af37; font-size: 11px; font-weight: 900; padding: 2px 7px; border-radius: 10px; white-space: nowrap; }
        .ll-player-meta { min-width: 0; }
        .ll-player-meta b { display: block; font-size: 17px; line-height: 1.15; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ll-player-name-row { display: flex; align-items: center; gap: 7px; min-width: 0; }
        .ll-badge-you { background: #e8bc35; color: #070604; font-size: 10px; font-weight: 950; padding: 3px 7px; border-radius: 7px; text-transform: uppercase; }
        .ll-turn-status { font-size: 12px; color: #888; display: flex; align-items: center; gap: 6px; margin-top: 5px; font-weight: 750; }
        .ll-turn-status.active { color: #4ade80; }
        .ll-turn-status.in-match { color: #ef4444; }
        .ll-turn-status .dot { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 9px #4ade80; flex: 0 0 auto; }
        .ll-turn-status .dot.red { background: #ef4444; box-shadow: 0 0 9px #ef4444; }
        .align-right { text-align: right; }
        .align-right .ll-turn-status { justify-content: flex-end; }

        .ll-brand { min-width: 120px; text-align: center; filter: drop-shadow(0 6px 16px rgba(212,175,55,.2)); }
        .ll-crown { font-size: 25px; line-height: 1; margin-bottom: -4px; }
        .ll-logo-text { margin: 0; font-size: 31px; font-weight: 950; line-height: .92; letter-spacing: 1px; background: linear-gradient(180deg, #fff3a4 0%, #d4af37 55%, #8e6417 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .ll-logo-sub { font-size: 13px; font-weight: 950; letter-spacing: 4px; color: #fff; opacity: .9; }

        .ll-board-stage { min-height: 0; display: flex; align-items: center; justify-content: center; padding: 2px 0 12px; }
        .ll-board-frame { width: min(100%, 680px, calc(100dvh - 475px)); aspect-ratio: 1; padding: 7px; border-radius: 30px; background: linear-gradient(145deg, #f6da82 0%, #8d6819 43%, #e7c970 100%); box-shadow: 0 14px 38px rgba(0,0,0,.8), 0 0 0 1px rgba(212,175,55,.35); }
        .ll-board-frame > div { width: 100% !important; height: 100% !important; border-radius: 23px; overflow: hidden; }

        .ll-bottom-panel { flex-shrink: 0; display: flex; flex-direction: column; gap: 9px; width: 100%; }
        .ll-controls-row { display: grid; grid-template-columns: minmax(175px, .82fr) minmax(300px, 1.5fr) 82px; gap: 10px; min-height: 156px; }
        .ll-user-box, .ll-dice-box, .ll-action-btn { background: linear-gradient(145deg, rgba(20,16,10,.98), rgba(7,7,5,.98)); border: 1px solid rgba(80,62,27,.72); box-shadow: inset 0 1px 0 rgba(255,255,255,.035), 0 10px 24px rgba(0,0,0,.42); }
        .ll-user-box { min-width: 0; border-radius: 19px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; }
        .ll-user-header { position: relative; display: flex; align-items: center; gap: 10px; min-width: 0; }
        .ll-user-avatar { width: 52px; height: 52px; flex: 0 0 52px; border-radius: 50%; background: #21190e; border: 1.5px solid #d4af37; display: grid; place-items: center; font-size: 22px; overflow: hidden; }
        .ll-user-copy { min-width: 0; }
        .ll-u-name { font-size: 15px; color: #fff; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ll-u-level { font-size: 12px; color: #d4af37; margin-top: 3px; font-weight: 850; }
        .ll-edit-mark { margin-left: auto; color: #d4af37; font-size: 16px; }
        .ll-coins-pill { display: flex; align-items: center; gap: 8px; min-height: 43px; background: #090806; border: 1px solid #302513; border-radius: 22px; padding: 5px 8px 5px 11px; }
        .coin-icon { font-size: 19px; line-height: 1; }
        .ll-coins-pill b { font-size: 16px; color: #fff; }
        .plus-btn { margin-left: auto; background: #22c55e; color: #fff; border: none; border-radius: 50%; width: 28px; height: 28px; font-size: 21px; line-height: 1; cursor: pointer; }

        .ll-dice-box { min-width: 0; border-radius: 19px; padding: 12px 15px; position: relative; overflow: hidden; display: flex; align-items: stretch; justify-content: space-between; }
        .ll-turn-copy { min-width: 155px; padding: 6px 0 0 4px; display: flex; flex-direction: column; align-items: flex-start; }
        .ll-turn-title { font-size: 16px; font-weight: 950; color: #39e87a; display: flex; align-items: center; gap: 7px; }
        .ll-turn-title .dot { width: 10px; height: 10px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 10px #4ade80; }
        .ll-turn-sub { font-size: 12px; line-height: 1.35; color: #747474; margin-top: 5px; }
        .ll-dice-result { width: 108px; height: 42px; margin-top: auto; border-radius: 21px; border: 1px solid #392c16; background: linear-gradient(180deg, #171207, #090805); display: grid; place-items: center; color: #fff; font-size: 25px; font-weight: 950; box-shadow: inset 0 1px 8px rgba(0,0,0,.5); }
        .ll-dice-hint { font-size: 10px; color: #555; margin-top: 4px; width: 108px; text-align: center; }
        .ll-dice-slot { position: relative; flex: 1; min-width: 130px; display: flex; align-items: center; justify-content: center; }
        .ll-dice-slot :global(.dice-area) { min-width: 150px !important; transform: scale(.93); transform-origin: center center; }
        .ll-dice-slot :global(.dice-button) { width: 138px !important; height: 124px !important; }
        .ll-side-actions { display: flex; flex-direction: column; gap: 9px; }
        .ll-action-btn { width: 82px; height: calc((100% - 9px)/2); min-height: 70px; border-radius: 18px; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; font-size: 12px; cursor: pointer; }
        .ll-action-btn span:last-child { font-size: 12px; color: #d0c6ae; font-weight: 750; }
        .action-icon { font-size: 20px !important; color: #f2dfaa !important; letter-spacing: 1px; }
        .ll-action-btn.off { border-color: rgba(239,68,68,.5); }
        .ll-reactions-bar { display: flex; gap: 9px; overflow-x: auto; scrollbar-width: none; }
        .ll-reactions-bar::-webkit-scrollbar { display: none; }
        .ll-pill-btn { flex: 0 0 auto; background: linear-gradient(145deg, #17130b, #090805); border: 1px solid #3a2d16; color: #f0d477; border-radius: 18px; padding: 10px 18px; font-size: 12px; font-weight: 800; white-space: nowrap; cursor: pointer; }
        .ll-footer { display: grid; grid-template-columns: auto auto auto minmax(170px, 1fr); align-items: center; gap: 10px; }
        .ll-foot-btn, .ll-room-chip { min-height: 43px; background: linear-gradient(145deg, #17130b, #090805); border: 1px solid #3a2d16; color: #cfc6b0; border-radius: 17px; padding: 9px 16px; font-size: 12px; font-weight: 800; cursor: pointer; }
        .ll-foot-btn.exit { color: #ef5555; border-color: rgba(239,68,68,.35); }
        .ll-room-chip { display: flex; align-items: center; justify-content: center; gap: 7px; color: #8e8e8e; cursor: default; min-width: 0; }
        .ll-room-chip small { font-size: 11px; color: #858585; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ll-room-chip .shield { font-size: 13px; color: #58d17c; }
        .copy-icon { color: #d4af37; font-size: 15px; }

        @media (max-width: 700px) {
          .ludo-live-container { padding: 14px 12px 12px; }
          .ll-header { grid-template-columns: minmax(0, 1fr) 92px minmax(0, 1fr); gap: 7px; min-height: 92px; padding-bottom: 9px; }
          .ll-player-card { min-height: 72px; padding: 8px; gap: 6px; border-radius: 19px; }
          .ll-avatar-wrap { flex-basis: 44px; width: 44px; height: 44px; }
          .ll-avatar-img { font-size: 20px; }
          .ll-level { min-width: 42px; font-size: 9px; bottom: -6px; }
          .ll-player-meta b { font-size: 12px; }
          .ll-badge-you { font-size: 7px; padding: 2px 4px; }
          .ll-turn-status { font-size: 8px; gap: 4px; margin-top: 3px; }
          .ll-turn-status .dot { width: 6px; height: 6px; }
          .ll-brand { min-width: 92px; }
          .ll-crown { font-size: 17px; }
          .ll-logo-text { font-size: 23px; }
          .ll-logo-sub { font-size: 9px; letter-spacing: 3px; }
          .ll-board-frame { width: min(100%, calc(100dvh - 420px)); padding: 5px; border-radius: 23px; }
          .ll-board-frame > div { border-radius: 18px; }
          .ll-controls-row { grid-template-columns: minmax(135px, .85fr) minmax(0, 1.5fr) 58px; gap: 6px; min-height: 116px; }
          .ll-user-box { padding: 9px; border-radius: 14px; }
          .ll-user-avatar { width: 38px; height: 38px; flex-basis: 38px; font-size: 17px; }
          .ll-u-name { font-size: 10px; }
          .ll-u-level { font-size: 8px; }
          .ll-edit-mark { font-size: 12px; }
          .ll-coins-pill { min-height: 32px; padding: 3px 5px 3px 7px; gap: 4px; }
          .coin-icon { font-size: 14px; }
          .ll-coins-pill b { font-size: 11px; }
          .plus-btn { width: 21px; height: 21px; font-size: 16px; }
          .ll-dice-box { padding: 8px; border-radius: 14px; }
          .ll-turn-copy { min-width: 90px; padding: 3px 0 0; }
          .ll-turn-title { font-size: 10px; gap: 4px; }
          .ll-turn-title .dot { width: 7px; height: 7px; }
          .ll-turn-sub { font-size: 8px; }
          .ll-dice-result { width: 66px; height: 29px; border-radius: 15px; font-size: 17px; }
          .ll-dice-hint { width: 66px; font-size: 7px; }
          .ll-dice-slot { min-width: 72px; }
          .ll-dice-slot :global(.dice-area) { transform: scale(.55); }
          .ll-action-btn { width: 58px; min-height: 52px; border-radius: 13px; gap: 2px; }
          .action-icon { font-size: 15px !important; }
          .ll-action-btn span:last-child { font-size: 8px; }
          .ll-side-actions { gap: 6px; }
          .ll-reactions-bar { gap: 5px; }
          .ll-pill-btn { padding: 7px 11px; font-size: 9px; border-radius: 13px; }
          .ll-footer { grid-template-columns: auto auto auto minmax(0, 1fr); gap: 5px; }
          .ll-foot-btn, .ll-room-chip { min-height: 34px; padding: 6px 8px; font-size: 8px; border-radius: 11px; }
          .ll-room-chip small { font-size: 7px; }
          .shield, .copy-icon { font-size: 9px; }
        }

        @media (max-height: 760px) {
          .ludo-live-container { padding-top: 8px; padding-bottom: 8px; }
          .ll-header { min-height: 78px; padding-bottom: 5px; }
          .ll-player-card { min-height: 60px; }
          .ll-avatar-wrap { flex-basis: 38px; width: 38px; height: 38px; }
          .ll-board-frame { width: min(100%, calc(100dvh - 355px)); }
          .ll-controls-row { min-height: 100px; }
        }
      `}</style>
    </main>
  );
}
