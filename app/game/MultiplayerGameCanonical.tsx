"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import LudoBoard, { type BoardThemeId, type DemoToken } from "../_components/LudoBoardMultiplayer";
import DemoDice from "../_components/DemoDice";
import ChatVoice from "../_components/ChatVoice";
import { canMove, hasLegalMove, nextProgress, FINISH_PROGRESS, type DiceValue } from "../../lib/ludoEngine";
import { playerColorsForSeats } from "../../lib/ludoRules";
import { BOARD_PALETTES } from "../_components/LudoBoardMultiplayer";

type Color = "red" | "yellow" | "green" | "blue";
type Player = { playerId: string; name: string; seat: number; host?: boolean; ready?: boolean; connected?: boolean; colors?: Color[]; board?: string; level?: number; avatar?: string };
type TokenMap = Record<string, Record<string, { position: number }>>;
type GameState = { status: string; currentPlayerId: string | null; dice: DiceValue | null; pendingMove: DiceValue | null; sixStreak: number; players: Player[]; tokens: TokenMap; winnerId?: string | null; stateRevision?: number; startedAt?: number };
type ChatMessage = { id: string; name: string; text: string; at: number };

const COLORS: Color[] = ["red", "yellow", "green", "blue"];
const FINISH = FINISH_PROGRESS;
const initialTokens = (): DemoToken[] => COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })));
const displayTheme = (value: string): BoardThemeId => value === "midnight-live" ? "night" : value in BOARD_PALETTES ? value as BoardThemeId : "classic";
const normalizeTokens = (serverTokens: TokenMap): DemoToken[] => COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => { const raw = serverTokens?.[color]?.[String(id)]?.position; const position = typeof raw === "number" && Number.isFinite(raw) ? raw : 0; return { color, id, position, state: position === 0 ? "yard" as const : position === FINISH ? "finished" as const : position > 51 ? "home" as const : "track" as const }; }));
const audioEvent = (kind: "dice" | "win") => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ludo-audio", { detail: kind })); };

export default function MultiplayerGameCanonical() {
  const [theme, setTheme] = useState<BoardThemeId>("classic");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [me, setMe] = useState("");
  const [game, setGame] = useState<GameState | null>(null);
  const [tokens, setTokens] = useState<DemoToken[]>(initialTokens);
  const [roll, setRoll] = useState<DiceValue>(1);
  const [pending, setPending] = useState<DiceValue | null>(null);
  const [remoteRolling, setRemoteRolling] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [notice, setNotice] = useState("Connecting to live match…");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [muted, setMuted] = useState(false);
  const diceTimer = useRef<number | null>(null);
  const moveTimer = useRef<number | null>(null);
  const winnerRef = useRef<string | null>(null);
  const revisionRef = useRef(-1);

  const players = game?.players ?? [];
  const mine = players.find((p) => String(p.playerId) === String(me));
  const myColors = useMemo<Color[]>(() => mine?.colors?.length ? mine.colors : playerColorsForSeats(players.length === 2 ? 2 : 4, mine?.seat ?? 0) as Color[], [mine, players.length]);
  const myTurn = game?.currentPlayerId === me;
  const isTournament = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("tournament");
  const roomCode = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("room") || "" : "";
  const legalTokenKeys = useMemo(() => pending === null || !myTurn ? [] : tokens.filter((t) => myColors.includes(t.color) && canMove(tokens, t, pending)).map((t) => `${t.color}:${t.id}`), [pending, myTurn, tokens, myColors]);

  const applyState = useCallback((next: GameState) => { const r = Number(next.stateRevision ?? -1); if (r >= 0 && revisionRef.current >= 0 && r < revisionRef.current) return false; if (r >= 0) revisionRef.current = r; setGame(next); setTokens(normalizeTokens(next.tokens || {})); return true; }, []);

  useEffect(() => { try { const saved = localStorage.getItem("ludo-match-board"); if (saved) setTheme(displayTheme(saved)); } catch {} void fetch("/api/customization", { cache: "no-store" }).then((r) => r.json()).then((d) => { const b = String(d?.equippedBoard || ""); if (b) setTheme(displayTheme(b)); }).catch(() => {}); }, []);

  useEffect(() => { let mounted = true; let localSocket: Socket | null = null; const connect = async () => { let playerId = "", profileName = "Player"; try { const r = await fetch("/api/auth", { cache: "no-store" }); const d = await r.json(); playerId = String(d?.user?.id || ""); profileName = String(d?.user?.username || "Player"); } catch {} if (!mounted || !playerId) return; setMe(playerId); const params = new URLSearchParams(window.location.search); const room = params.get("room") || ""; const roomSize = Number(params.get("size") || 4); localSocket = io(window.location.origin, { transports: ["websocket", "polling"], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 250 }); setSocket(localSocket); localSocket.on("connect", () => { setNotice(isTournament ? "Tournament match" : "Live multiplayer match"); if (room) { let board = "classic"; try { board = localStorage.getItem("ludo-match-board") || "classic"; } catch {} localSocket?.emit("join-room", { roomCode: room, name: profileName, roomSize, playerId, board, dice: "classic" }); } }); localSocket.on("roster", (members: Player[]) => { const host = members.find((m) => m.host); if (host?.board) setTheme(displayTheme(String(host.board))); setGame((g) => g ? { ...g, players: members } : g); }); localSocket.on("start-game", ({ board }: { board?: string }) => { if (board) setTheme(displayTheme(String(board))); setNotice(isTournament ? "Tournament match" : "Live multiplayer match"); }); localSocket.on("start-error", (m: string) => setNotice(m)); localSocket.on("game-dice", (e: { value: DiceValue }) => { setRoll(e.value); setRemoteRolling(true); audioEvent("dice"); if (diceTimer.current) window.clearTimeout(diceTimer.current); diceTimer.current = window.setTimeout(() => setRemoteRolling(false), 900); }); localSocket.on("game-state", (next: GameState) => { if (!mounted || !applyState(next)) return; if (next.dice !== null) setRoll(next.dice); setPending(next.currentPlayerId === playerId ? next.pendingMove : null); if (next.winnerId && winnerRef.current !== next.winnerId) { winnerRef.current = next.winnerId; audioEvent("win"); } if (next.winnerId) setNotice(next.winnerId === playerId ? "You won!" : `${next.players.find((p) => p.playerId === next.winnerId)?.name || "Player"} won`); else if (next.currentPlayerId === playerId) setNotice(next.pendingMove !== null ? `Pick a token • ${next.pendingMove}` : "Your turn"); else setNotice("Opponent's turn"); }); localSocket.on("game-moved", () => { setAnimating(true); if (moveTimer.current) window.clearTimeout(moveTimer.current); moveTimer.current = window.setTimeout(() => setAnimating(false), 650); }); localSocket.on("chat", (m: ChatMessage) => setMessages((old) => [...old.slice(-49), m])); localSocket.on("disconnect", () => setNotice("Reconnecting…")); }; void connect(); return () => { mounted = false; if (diceTimer.current) window.clearTimeout(diceTimer.current); if (moveTimer.current) window.clearTimeout(moveTimer.current); localSocket?.disconnect(); }; }, [applyState, isTournament]);

  useEffect(() => { if (!game?.winnerId || !me || isTournament) return; const eventKey = `multiplayer:${roomCode || "room"}:winner:${game.winnerId}`; void fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "game_win", eventKey }) }).catch(() => {}); }, [game?.winnerId, me, isTournament, roomCode]);
  useEffect(() => { if (!socket || !game || !myTurn || pending === null || hasLegalMove(tokens, myColors, pending)) return; setPending(null); socket.emit("game-move", { tokenId: "__skip__", to: 0 }); }, [socket, game, myTurn, pending, tokens, myColors]);

  const chooseToken = useCallback((color: Color, id: number) => { if (!socket || !game || !myTurn || pending === null || animating) return; const token = tokens.find((t) => t.color === color && t.id === id); if (!token || !myColors.includes(color) || !canMove(tokens, token, pending)) return; const target = nextProgress(token.position, pending); if (target === null) return; setPending(null); setAnimating(true); setNotice("Moving…"); socket.emit("game-move", { tokenId: `${color}:${id}`, to: target }); }, [socket, game, myTurn, pending, animating, tokens, myColors]);
  const handleRoll = useCallback(() => { if (!socket || !game || !myTurn || pending !== null || animating || remoteRolling || game.status !== "playing") return; socket.emit("game-roll"); }, [socket, game, myTurn, pending, animating, remoteRolling]);
  const sendChat = useCallback(() => { const text = chatText.trim(); if (!socket || !text) return; socket.emit("chat", { text: text.slice(0, 240) }); setChatText(""); }, [socket, chatText]);

  return (
    <main className="live-page">
      {/* Top Navbar Header */}
      <div className="mp-topbar">
        <div className="match-info">
          <span className="live-dot" /> LIVE MATCH {roomCode && <small>ROOM {roomCode}</small>}
        </div>
        <div className="mp-actions">
          <button className="icon-btn" onClick={() => setChatOpen((v) => !v)} aria-label="Toggle chat">
            💬{messages.length ? <em className="badge">{messages.length}</em> : null}
          </button>
          <button className="icon-btn" onClick={() => setMuted((v) => !v)} aria-label="Toggle audio">
            {muted ? "🔇" : "🎙️"}
          </button>
        </div>
      </div>

      {/* Roster / Players Bar */}
      <div className="mp-players">
        {players.slice(0, 4).map((p, i) => {
          const active = String(p.playerId) === String(me);
          const turn = String(p.playerId) === String(game?.currentPlayerId);
          return (
            <div className={`mp-player ${active ? "self" : ""} ${turn ? "turn" : ""}`} key={p.playerId}>
              <div className="mp-avatar">
                {p.avatar || ["🦁", "🐯", "🐼", "🦊"][i]}
                <span className="online-indicator" />
              </div>
              <div className="player-details">
                <b>{p.name || "Player"}{active ? " (You)" : ""}</b>
                <small>LVL {Number(p.level) || 1}</small>
              </div>
              {turn && <strong className="turn-tag">TURN</strong>}
            </div>
          );
        })}
      </div>

      {/* Main Game Stage */}
      <div className="board-stage">
        <div className="board-wrap">
          <div className="board-frame">
            <LudoBoard theme={theme} demoTokens={tokens} onTokenClick={chooseToken} legalTokenKeys={legalTokenKeys} animateUpdates finishSound />
          </div>
        </div>
      </div>

      {/* Bottom Status & Controls Bar */}
      <div className="mp-bottom">
        <span className="status-pill">{game?.winnerId ? "🏆 MATCH COMPLETE" : myTurn ? "YOUR TURN" : "WAITING FOR OPPONENT"}</span>
        <b className="notice-text">{notice}</b>
        <div className="dice-out">
          <DemoDice value={roll} onRoll={handleRoll} disabled={!myTurn || pending !== null || animating || remoteRolling || !game || game.status !== "playing"} botRolling={remoteRolling} />
        </div>
      </div>

      {/* Floating Match Chat Panel */}
      {chatOpen && (
        <section className="chat-panel">
          <header>
            <b>Match Chat</b>
            <button className="close-btn" onClick={() => setChatOpen(false)}>×</button>
          </header>
          <div className="chat-list">
            {messages.length ? (
              messages.map((m, i) => (
                <div className={`chat-msg ${String(m.id) === String(me) ? "mine" : ""}`} key={`${m.id}-${m.at}-${i}`}>
                  <b>{m.name}</b>
                  <span>{m.text}</span>
                </div>
              ))
            ) : (
              <p className="empty-chat">No messages yet. Say hello!</p>
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); sendChat(); }}>
            <input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Type a message…" maxLength={240} />
            <button disabled={!chatText.trim()}>Send</button>
          </form>
        </section>
      )}

      {/* Modern Styling */}
      <style jsx global>{`
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #060504 !important;
        }
        * {
          box-sizing: border-box;
        }

        .live-page {
          position: fixed;
          inset: 0;
          overflow: hidden;
          background: radial-gradient(circle at 50% 45%, #1f180d 0%, #0d0a07 50%, #040302 100%);
          color: #f7edcf;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          isolation: isolate;
        }

        .live-page::before {
          content: "";
          position: absolute;
          z-index: -1;
          pointer-events: none;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, rgba(213, 172, 74, 0.05) 0%, transparent 70%);
        }

        /* Top Bar Header */
        .mp-topbar {
          position: fixed;
          z-index: 20;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: max(12px, env(safe-area-inset-top)) 4vw 0 4vw;
          pointer-events: none;
        }

        .match-info {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.8px;
          background: rgba(18, 15, 12, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(16px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          pointer-events: auto;
        }

        .live-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #34d399;
          margin-right: 8px;
          box-shadow: 0 0 8px #34d399;
        }

        .match-info small {
          color: #a1a1aa;
          margin-left: 6px;
          font-weight: 600;
        }

        .mp-actions {
          display: flex;
          gap: 8px;
          pointer-events: auto;
        }

        .icon-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          color: #fff;
          font-size: 16px;
          position: relative;
          background: rgba(18, 15, 12, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(16px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          cursor: pointer;
          transition: transform 0.15s ease, background-color 0.2s ease;
          display: grid;
          place-items: center;
        }

        .icon-btn:hover {
          background: rgba(30, 25, 20, 0.85);
          transform: translateY(-1px);
        }

        .badge {
          position: absolute;
          right: -4px;
          top: -4px;
          background: #f59e0b;
          color: #0f0a03;
          border-radius: 999px;
          padding: 2px 5px;
          font-size: 9px;
          font-weight: 800;
          font-style: normal;
        }

        /* Players Roster */
        .mp-players {
          position: fixed;
          z-index: 19;
          top: max(60px, calc(env(safe-area-inset-top) + 60px));
          left: 50%;
          transform: translateX(-50%);
          width: min(94vw, 860px);
          display: flex;
          justify-content: center;
          gap: 10px;
          pointer-events: none;
        }

        .mp-player {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 140px;
          padding: 6px 12px;
          border-radius: 16px;
          background: rgba(15, 13, 10, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          transition: border-color 0.25s ease, box-shadow 0.25s ease;
        }

        .mp-player.self {
          border-color: rgba(217, 173, 76, 0.4);
        }

        .mp-player.turn {
          border-color: #f59e0b;
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.3), 0 8px 24px rgba(0, 0, 0, 0.5);
        }

        .mp-avatar {
          position: relative;
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #231e17;
          font-size: 18px;
        }

        .online-indicator {
          position: absolute;
          right: 0;
          bottom: 0;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          border: 2px solid #0f0d0a;
        }

        .player-details b {
          display: block;
          font-size: 11px;
          font-weight: 700;
          max-width: 90px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .player-details small {
          display: block;
          font-size: 8px;
          color: #d4b158;
          font-weight: 800;
          letter-spacing: 0.5px;
          margin-top: 1px;
        }

        .turn-tag {
          font-size: 8px;
          color: #f59e0b;
          margin-left: auto;
          letter-spacing: 0.5px;
        }

        /* Game Stage & Board */
        .board-stage {
          position: absolute;
          inset: 0 0 90px 0;
          display: grid;
          place-items: center;
          padding: 0;
        }

        .board-wrap {
          width: min(92vw, 92vh, 720px);
          height: min(92vw, 92vh, 720px);
          aspect-ratio: 1/1;
        }

        .board-frame {
          width: 100%;
          height: 100%;
          padding: 6px;
          border-radius: 28px;
          background: linear-gradient(135deg, #f5d77f 0%, #78530d 50%, #e0b853 100%);
          box-shadow: 0 25px 65px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.15);
        }

        .board-frame > div {
          width: 100% !important;
          height: 100% !important;
          aspect-ratio: 1/1 !important;
          border-radius: 22px;
          overflow: hidden;
        }

        /* Bottom Controls Bar */
        .mp-bottom {
          position: fixed;
          z-index: 20;
          bottom: max(16px, env(safe-area-inset-bottom));
          left: 50%;
          transform: translateX(-50%);
          width: min(94vw, 860px);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          pointer-events: none;
          min-height: 48px;
        }

        .status-pill, .notice-text {
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 11px;
          white-space: nowrap;
          background: rgba(15, 13, 10, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .status-pill {
          color: #f59e0b;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .notice-text {
          color: #d1d5db;
          font-weight: 500;
        }

        .dice-out {
          pointer-events: auto;
          position: absolute;
          left: 50%;
          bottom: 54px;
          transform: translateX(-50%);
          z-index: 25;
        }

        /* Interactive Chat Panel */
        .chat-panel {
          position: fixed;
          z-index: 50;
          right: 16px;
          top: 100px;
          width: min(340px, calc(100vw - 32px));
          height: min(450px, 60vh);
          display: flex;
          flex-direction: column;
          border: 1px solid rgba(213, 172, 74, 0.25);
          border-radius: 20px;
          background: rgba(13, 11, 9, 0.92);
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(24px);
          animation: slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .chat-panel header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .close-btn {
          background: none;
          border: 0;
          color: #9ca3af;
          font-size: 20px;
          cursor: pointer;
        }

        .chat-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .empty-chat {
          text-align: center;
          color: #6b7280;
          font-size: 11px;
          margin-top: 60px;
        }

        .chat-msg {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .chat-msg.mine {
          align-items: flex-end;
        }

        .chat-msg b {
          font-size: 9px;
          color: #d4b158;
          margin-bottom: 2px;
        }

        .chat-msg span {
          max-width: 85%;
          padding: 8px 12px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.06);
          font-size: 11px;
          color: #e5e7eb;
          line-height: 1.4;
        }

        .chat-msg.mine span {
          background: #78530d;
          color: #fff;
        }

        .chat-panel form {
          display: flex;
          gap: 8px;
          padding: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .chat-panel input {
          flex: 1;
          min-width: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.3);
          color: #fff;
          padding: 9px 12px;
          font-size: 11px;
          outline: none;
        }

        .chat-panel form button {
          border: 0;
          border-radius: 12px;
          background: #f59e0b;
          color: #0f0a03;
          padding: 0 14px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .chat-panel form button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Responsive Tweaks */
        @media (max-width: 700px) {
          .board-stage { inset: 0 0 90px 0; }
          .board-wrap {
            width: min(94vw, calc(100vh - 120px), 720px);
            height: min(94vw, calc(100vh - 120px), 720px);
          }
          .mp-players { width: 96vw; }
          .mp-player { min-width: 0; flex: 1; padding: 6px 8px; }
          .mp-player:nth-child(n+3) { display: none; }
          .player-details b { max-width: 75px; }
          .notice-text { display: none; }
          .dice-out { bottom: 50px; }
        }

        @media (orientation: landscape) {
          .board-stage { inset: 0 80px 0 0; }
          .board-wrap {
            width: min(94vw, 94vh, 720px);
            height: min(94vw, 94vh, 720px);
          }
          .mp-bottom {
            left: auto;
            right: 12px;
            bottom: 50%;
            transform: translateY(50%);
            width: auto;
            min-height: 0;
            flex-direction: column;
          }
          .notice-text { display: none; }
          .dice-out { position: static; transform: none; }
        }
      `}</style>
    </main>
  );
}
