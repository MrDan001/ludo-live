"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import AppFrame from "../_components/AppFrame";
import LudoBoard, { BOARD_PALETTES, type BoardThemeId, type DemoToken } from "../_components/LudoBoardMultiplayer";
import DemoDice from "../_components/DemoDice";
import { FINISH_PROGRESS, TRACK_LENGTH, HOME_START_PROGRESS, tokenState } from "../../lib/canonicalLudoBoard";

type Color = "red" | "yellow" | "green" | "blue";
type Face = 1 | 2 | 3 | 4 | 5 | 6;
type Player = { playerId: string; name: string; seat: number; host?: boolean; ready?: boolean };
type TokenMap = Record<string, Record<string, { position: number }>>;
type GameState = { status: string; currentPlayerId: string | null; dice: Face | null; pendingMove: Face | null; sixStreak: number; players: Player[]; tokens: TokenMap; winnerId?: string | null; stateRevision?: number };

const COLORS: Color[] = ["red", "yellow", "green", "blue"];
const initialTokens = (): DemoToken[] => COLORS.flatMap(color => Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })));
const playerColors = (players: Player[], playerId: string): Color[] => {
  const seat = players.find(p => p.playerId === playerId)?.seat ?? 0;
  return players.length === 2 ? (seat === 0 ? ["red", "yellow"] : ["green", "blue"]) : [COLORS[seat] || "red"];
};

// Canonical semantics: yard=0, a six places the token at progress 1,
// shared path is 1..51, home is 52..56, centre finish is 57.
function targetFor(position: number, dice: Face): number | null {
  if (position === 0) return dice === 6 ? 1 : null;
  const target = position + dice;
  return target <= FINISH_PROGRESS ? target : null;
}
function legalTarget(position: number, dice: Face): boolean { return targetFor(position, dice) !== null; }
function stateFor(position: number): DemoToken["state"] { return tokenState(position); }
function displayTheme(value: string): BoardThemeId { return value === "midnight-live" ? "night" : (value in BOARD_PALETTES ? value as BoardThemeId : "classic"); }

export default function MultiplayerGameCanonical() {
  const [theme, setTheme] = useState<BoardThemeId>("classic");
  const [skinId, setSkinId] = useState("classic");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [me, setMe] = useState("");
  const [game, setGame] = useState<GameState | null>(null);
  const [tokens, setTokens] = useState<DemoToken[]>(initialTokens);
  const [roll, setRoll] = useState<Face>(1);
  const [pending, setPending] = useState<Face | null>(null);
  const [notice, setNotice] = useState("Connecting…");
  const [remoteRolling, setRemoteRolling] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [revision, setRevision] = useState(-1);

  const players = game?.players || [];
  const myColors = useMemo(() => playerColors(players, me), [players, me]);
  const currentId = game?.currentPlayerId || "";
  const myTurn = currentId === me;

  const applyServerTokens = (serverTokens: TokenMap) => {
    setTokens(prev => prev.map(t => {
      const position = serverTokens?.[t.color]?.[String(t.id)]?.position;
      if (typeof position !== "number") return t;
      return { ...t, position, state: stateFor(position) };
    }));
  };

  const hasLegalMove = (dice: Face) => myColors.some(color => tokens.some(t => t.color === color && legalTarget(t.position, dice)));

  useEffect(() => {
    let alive = true;
    (async () => {
      let pid = "";
      try { const a = await fetch("/api/auth", { cache: "no-store" }).then(r => r.json()); pid = String(a?.user?.id || ""); } catch {}
      if (!alive) return;
      setMe(pid);

      const params = new URLSearchParams(location.search);
      const roomCode = params.get("room") || "";
      const queryName = params.get("name") || "";
      let roomName = queryName || "Player";
      let roomSize = Number(params.get("size") || 4);
      try {
        const saved = JSON.parse(localStorage.getItem("ludo-room") || "null");
        if (!queryName) roomName = String(saved?.name || "Player");
        if (!params.get("size")) roomSize = Number(saved?.players) === 2 ? 2 : 4;
      } catch {}

      try {
        const savedBoard = localStorage.getItem("ludo-match-board");
        if (savedBoard) { setSkinId(savedBoard); setTheme(displayTheme(savedBoard)); }
      } catch {}

      const s = io(location.origin, { transports: ["websocket", "polling"], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 250 });
      setSocket(s);
      s.on("connect", () => {
        setNotice("LIVE MATCH • CONNECTED");
        if (roomCode && pid) s.emit("join-room", { roomCode, name: roomName, roomSize, playerId: pid, board: "classic", dice: "classic" });
      });
      s.on("start-game", () => setNotice("LIVE MATCH"));
      s.on("game-state", (next: GameState) => {
        if (!alive) return;
        const nextRevision = Number(next.stateRevision ?? -1);
        if (nextRevision >= 0 && nextRevision < revision) return;
        if (nextRevision >= 0) setRevision(nextRevision);
        setGame(next);
        applyServerTokens(next.tokens || {});
        setPending(next.currentPlayerId === pid ? next.pendingMove : null);
        if (next.dice) setRoll(next.dice);
        const winner = next.winnerId;
        if (winner) setNotice(winner === pid ? "🏆 YOU WON THE MATCH!" : `${next.players.find(p => p.playerId === winner)?.name || "Player"} won the match.`);
        else if (next.status === "paused") setNotice("Match paused — waiting for the player to reconnect.");
        else if (next.currentPlayerId === pid) setNotice(next.pendingMove ? `You rolled ${next.pendingMove}. Pick a token.` : "Your turn — roll the dice.");
        else setNotice(`${next.players.find(p => p.playerId === next.currentPlayerId)?.name || "Player"}'s turn.`);
      });
      s.on("game-dice", ({ playerId, value, stateRevision }: { playerId: string; value: Face; stateRevision?: number }) => {
        if (typeof stateRevision === "number" && stateRevision < revision) return;
        setRoll(value);
        if (playerId === pid) setNotice(hasLegalMove(value) ? `You rolled ${value}. Pick a token.` : `You rolled ${value}. No legal move.`);
        else { setRemoteRolling(true); setNotice("Opponent is rolling…"); window.setTimeout(() => setRemoteRolling(false), 450); }
      });
      s.on("game-moved", ({ tokenId }: { tokenId: string }) => {
        if (tokenId !== "__skip__") {
          setAnimating(true);
          window.setTimeout(() => setAnimating(false), 1600);
        }
        setPending(null);
      });
      s.on("disconnect", () => setNotice("Reconnecting…"));
      return () => { alive = false; s.disconnect(); };
    })();
  }, []);

  const chooseToken = (color: Color, id: number) => {
    if (!socket || !game || !myTurn || pending == null || animating || !myColors.includes(color)) return;
    const token = tokens.find(t => t.color === color && t.id === id);
    if (!token) return;
    const target = targetFor(token.position, pending);
    if (target === null) return;
    setPending(null);
    setAnimating(true);
    socket.emit("game-move", { tokenId: `${color}:${id}`, to: target });
    setNotice("Moving…");
  };

  const handleRoll = () => {
    if (!socket || !game || !myTurn || pending !== null || animating || game.status !== "playing") return;
    socket.emit("game-roll");
  };

  const p = BOARD_PALETTES[theme] || BOARD_PALETTES.classic;
  const pageBg = skinId === "classic" ? "#071426" : p.bg;
  const pageAccent = skinId === "classic" ? "#5ea7ff" : p.accent;
  const headerMap: Record<string, [string, string, string]> = {
    classic: ["👑", "TIMELESS CLASSIC", "CLASSIC LUDO"], love: ["💗", "HEART COLLECTION", "LOVE EDITION"], night: ["🌃", "CITY AFTER DARK", "NIGHT CITY"], golden: ["🏆", "ROYAL COLLECTION", "GOLDEN ROYAL"]
  };
  const header = headerMap[skinId] || headerMap[theme] || headerMap.classic;

  return <AppFrame back="/lobby">
    <main className="mp-canonical" style={{ "--accent": pageAccent, "--bg": pageBg } as React.CSSProperties}>
      <div className="mp-wrap">
        <header className="mp-head"><div className="mp-icon">{header[0]}</div><div><div className="mp-eyebrow">{header[1]}</div><h1>{header[2]}</h1><div className="mp-sub">Live multiplayer • canonical board engine</div></div><div className="mp-live"><span/> LIVE</div></header>
        <div className="mp-label"><span/> LIVE MATCH</div>
        <section className="mp-board"><LudoBoard theme={theme} demoTokens={tokens} onTokenClick={chooseToken}/></section>
        <section className="mp-controls"><div><div className="mp-turn">{game?.status === "finished" ? "MATCH FINISHED" : myTurn ? "YOUR TURN" : currentId ? `${players.find(pl => pl.playerId === currentId)?.name || "PLAYER"} TURN` : "MATCH"}</div><b>{game?.winnerId === me ? "🏆 MATCH WON" : pending !== null ? "Pick a token" : "Roll the dice"}</b><p>{notice}</p></div><DemoDice value={roll} onRoll={handleRoll} disabled={!myTurn || pending !== null || animating || !game || game.status !== "playing"} botRolling={remoteRolling}/></section>
      </div>
      <style jsx global>{`.mp-canonical{min-height:100dvh;background:var(--bg);color:#fff}.mp-wrap{width:100%;max-width:720px;margin:0 auto;padding:12px 24px 36px}.mp-head{display:flex;align-items:center;gap:14px;padding:18px 16px;border-radius:24px;background:color-mix(in srgb,var(--bg) 75%,white 25%);border:1px solid color-mix(in srgb,var(--accent) 65%,white 35%);box-shadow:0 18px 45px rgba(0,0,0,.22)}.mp-icon{font-size:38px}.mp-eyebrow{font-size:9px;letter-spacing:2px;font-weight:900;opacity:.75}.mp-head h1{margin:3px 0;font-size:24px}.mp-sub{font-size:11px;opacity:.7}.mp-live{margin-left:auto;white-space:nowrap;font-weight:900;font-size:12px}.mp-live span,.mp-label span{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--accent);margin-right:7px;box-shadow:0 0 12px var(--accent)}.mp-label{padding:22px 0 12px;font-size:12px;letter-spacing:3px;font-weight:900}.mp-board{width:100%;padding:8px;border-radius:28px;background:linear-gradient(145deg,color-mix(in srgb,var(--bg) 78%,white 22%),color-mix(in srgb,var(--bg) 94%,black 6%));box-shadow:0 22px 55px rgba(0,0,0,.28)}.mp-controls{margin-top:16px;display:flex;justify-content:space-between;align-items:center;gap:14px;padding:18px;border-radius:24px;border:1px solid color-mix(in srgb,var(--accent) 75%,white 25%);background:color-mix(in srgb,var(--bg) 82%,white 18%);box-shadow:0 18px 45px rgba(0,0,0,.2)}.mp-turn{font-size:11px;letter-spacing:2px;font-weight:900;opacity:.72}.mp-controls b{display:block;margin-top:7px;font-size:19px}.mp-controls p{margin:5px 0 0;font-size:13px;opacity:.82}`}</style>
    </main>
  </AppFrame>;
}
