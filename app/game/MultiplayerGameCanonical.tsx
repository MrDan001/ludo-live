"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import LudoBoard, { BOARD_PALETTES, type BoardThemeId, type DemoToken } from "../_components/LudoBoardMultiplayer";
import DemoDice from "../_components/DemoDice";
import { canMove, hasLegalMove, nextProgress, FINISH_PROGRESS, type DiceValue } from "../../lib/ludoEngine";
import { playerColorsForSeats } from "../../lib/ludoRules";

type Color = "red" | "yellow" | "green" | "blue";
type Face = DiceValue;
type Player = { playerId: string; name: string; seat: number; host?: boolean; ready?: boolean; connected?: boolean; colors?: Color[]; board?: string };
type TokenMap = Record<string, Record<string, { position: number }>>;
type GameState = { status: string; currentPlayerId: string | null; dice: Face | null; pendingMove: Face | null; sixStreak: number; players: Player[]; tokens: TokenMap; winnerId?: string | null; stateRevision?: number; startedAt?: number };

const COLORS: Color[] = ["red", "yellow", "green", "blue"];
const FINISH = FINISH_PROGRESS;
const initialTokens = (): DemoToken[] => COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })));
const displayTheme = (value: string): BoardThemeId => value === "midnight-live" ? "night" : value in BOARD_PALETTES ? value as BoardThemeId : "classic";
const emitAudio = (kind: "dice" | "win") => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ludo-audio", { detail: kind })); };
function normalizeTokens(serverTokens: TokenMap): DemoToken[] { return COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => { const raw = serverTokens?.[color]?.[String(id)]?.position; const position = typeof raw === "number" && Number.isFinite(raw) ? raw : 0; return { color, id, position, state: position === 0 ? "yard" as const : position === FINISH ? "finished" as const : position > 51 ? "home" as const : "track" as const }; })); }

export default function MultiplayerGameCanonical() {
  const [theme, setTheme] = useState<BoardThemeId>("classic");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [me, setMe] = useState("");
  const [game, setGame] = useState<GameState | null>(null);
  const [tokens, setTokens] = useState<DemoToken[]>(initialTokens);
  const [roll, setRoll] = useState<Face>(1);
  const [pending, setPending] = useState<Face | null>(null);
  const [remoteRolling, setRemoteRolling] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [revision, setRevision] = useState(-1);
  const [notice, setNotice] = useState("Connecting to live match…");
  const aliveRef = useRef(true), revisionRef = useRef(-1), diceTimerRef = useRef<number | null>(null), moveTimerRef = useRef<number | null>(null), winnerSoundRef = useRef<string | null>(null);
  const players = game?.players ?? [];
  const myPlayer = players.find((p) => p.playerId === me);
  const myColors = useMemo<Color[]>(() => myPlayer?.colors?.length ? myPlayer.colors : playerColorsForSeats(players.length === 2 ? 2 : 4, myPlayer?.seat ?? 0) as Color[], [myPlayer, players.length]);
  const currentId = game?.currentPlayerId ?? "";
  const myTurn = currentId === me;
  const isTournament = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("tournament");
  const roomCode = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("room") || "" : "";
  const legalTokenKeys = useMemo(() => pending === null || !myTurn ? [] : tokens.filter((t) => myColors.includes(t.color) && canMove(tokens, t, pending)).map((t) => `${t.color}:${t.id}`), [pending, myTurn, tokens, myColors]);

  const applyServerState = useCallback((next: GameState) => {
    const nextRevision = Number(next.stateRevision ?? -1);
    if (nextRevision >= 0 && revisionRef.current >= 0 && nextRevision < revisionRef.current) return false;
    if (nextRevision >= 0) { revisionRef.current = nextRevision; setRevision(nextRevision); }
    setGame(next); setTokens(normalizeTokens(next.tokens ?? {})); return true;
  }, []);

  useEffect(() => { aliveRef.current = true; try { const saved = localStorage.getItem("ludo-match-board"); if (saved) setTheme(displayTheme(saved)); } catch {} const load = async () => { try { const r = await fetch("/api/customization", { cache: "no-store" }); const d = await r.json(); const equipped = String(d?.equippedBoard || ""); if (equipped && aliveRef.current) { setTheme(displayTheme(equipped)); try { localStorage.setItem("ludo-match-board", equipped); } catch {} } } catch {} }; void load(); return () => { aliveRef.current = false; }; }, []);

  useEffect(() => {
    let mounted = true;
    const connect = async () => {
      let playerId = "", profileName = "Player";
      try { const r = await fetch("/api/auth", { cache: "no-store" }); const d = await r.json(); playerId = String(d?.user?.id || ""); profileName = String(d?.user?.username || "Player"); } catch {}
      if (!mounted || !playerId) return;
      setMe(playerId);
      const params = new URLSearchParams(window.location.search), roomName = profileName || params.get("name") || "Player";
      let roomSize = Number(params.get("size") || 4);
      try { const saved = JSON.parse(localStorage.getItem("ludo-room") || "null"); if (!params.get("size")) roomSize = Number(saved?.players) === 2 ? 2 : 4; } catch {}
      const nextSocket = io(window.location.origin, { transports: ["websocket", "polling"], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 250 });
      setSocket(nextSocket);
      const clearDiceTimer = () => { if (diceTimerRef.current !== null) { window.clearTimeout(diceTimerRef.current); diceTimerRef.current = null; } };
      const clearMoveTimer = () => { if (moveTimerRef.current !== null) { window.clearTimeout(moveTimerRef.current); moveTimerRef.current = null; } };
      nextSocket.on("connect", () => { if (!mounted) return; setNotice(isTournament ? "Tournament match" : "Live multiplayer match"); const room = new URLSearchParams(window.location.search).get("room") || ""; if (room) { let board = "classic"; try { board = localStorage.getItem("ludo-match-board") || "classic"; } catch {} nextSocket.emit("join-room", { roomCode: room, name: roomName, roomSize, playerId, board, dice: "classic" }); } });
      nextSocket.on("roster", (members: Player[]) => { const host = members.find((m) => m.host); if (host?.board && mounted) setTheme(displayTheme(String(host.board))); });
      nextSocket.on("start-game", ({ board }: { board?: string }) => { if (!mounted) return; if (board) setTheme(displayTheme(String(board))); setNotice(isTournament ? "Tournament match" : "Live multiplayer match"); });
      nextSocket.on("start-error", (message: string) => { if (mounted) setNotice(message); });
      nextSocket.on("game-dice", (event: { playerId: string; value: Face; stateRevision?: number }) => { if (!mounted) return; const r = Number(event.stateRevision ?? -1); if (r >= 0 && revisionRef.current >= 0 && r < revisionRef.current) return; if (r >= 0) { revisionRef.current = r; setRevision(r); } setRoll(event.value); setRemoteRolling(true); emitAudio("dice"); clearDiceTimer(); diceTimerRef.current = window.setTimeout(() => { if (mounted) setRemoteRolling(false); diceTimerRef.current = null; }, 900); });
      nextSocket.on("game-state", (next: GameState) => { if (!mounted || !applyServerState(next)) return; if (next.dice !== null) setRoll(next.dice); setPending(next.currentPlayerId === playerId ? next.pendingMove : null); if (next.winnerId && winnerSoundRef.current !== next.winnerId) { winnerSoundRef.current = next.winnerId; emitAudio("win"); } if (next.winnerId) { setNotice(next.winnerId === playerId ? "You won!" : `${next.players.find((p) => p.playerId === next.winnerId)?.name || "Player"} won`); } else if (next.status === "paused") setNotice("Reconnecting…"); else if (next.currentPlayerId === playerId) setNotice(next.pendingMove !== null ? `Pick a token • ${next.pendingMove}` : "Your turn"); else setNotice("Opponent's turn"); });
      nextSocket.on("game-moved", () => { if (!mounted) return; setAnimating(true); clearMoveTimer(); moveTimerRef.current = window.setTimeout(() => { if (mounted) setAnimating(false); moveTimerRef.current = null; }, 650); });
      nextSocket.on("disconnect", () => { if (mounted) setNotice("Reconnecting…"); });
      return () => { clearDiceTimer(); clearMoveTimer(); nextSocket.disconnect(); };
    };
    void connect(); return () => { mounted = false; };
  }, [applyServerState, isTournament]);

  useEffect(() => {
    if (!game?.winnerId || !me || isTournament) return;
    const winnerId = String(game.winnerId);
    const matchKey = `multiplayer:${roomCode || "room"}:winner:${winnerId}:revision:${revision >= 0 ? revision : "final"}`;
    void fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "game_win", eventKey: matchKey }) }).catch(() => {});
  }, [game?.winnerId, me, isTournament, roomCode, revision]);

  useEffect(() => { if (!socket || !game || !myTurn || pending === null || hasLegalMove(tokens, myColors, pending)) return; setPending(null); socket.emit("game-move", { tokenId: "__skip__", to: 0 }); }, [socket, game, myTurn, pending, tokens, myColors]);
  const chooseToken = useCallback((color: Color, id: number) => { if (!socket || !game || !myTurn || pending === null || animating) return; const token = tokens.find((t) => t.color === color && t.id === id); if (!token || !myColors.includes(color) || !canMove(tokens, token, pending)) return; const target = nextProgress(token.position, pending); if (target === null) return; setPending(null); setAnimating(true); socket.emit("game-move", { tokenId: `${color}:${id}`, to: target }); setNotice("Moving…"); }, [socket, game, myTurn, pending, animating, tokens, myColors]);
  const handleRoll = useCallback(() => { if (!socket || !game || !myTurn || pending !== null || animating || remoteRolling || game.status !== "playing") return; socket.emit("game-roll"); }, [socket, game, myTurn, pending, animating, remoteRolling]);
  const palette = BOARD_PALETTES[theme] || BOARD_PALETTES.classic;

  return <main className="live-page">
    <div className="live-shell">
      <div className="live-topbar">
        <div className="brand"><span>♛</span><b>LUDO</b><em>LIVE</em></div>
        <div className={`connection ${socket?.connected ? "online" : ""}`}><i />{socket?.connected ? "LIVE" : "CONNECTING"}</div>
      </div>
      <section className="game-area">
        <div className="status-pill"><span>{game?.winnerId ? "🏆" : myTurn ? "●" : "○"}</span><b>{game?.winnerId ? "MATCH COMPLETE" : myTurn ? "YOUR TURN" : "OPPONENT TURN"}</b><small>{notice}</small></div>
        <div className="board-wrap"><div className="board-glow" /><div className="board-frame"><LudoBoard theme={theme} demoTokens={tokens} onTokenClick={chooseToken} legalTokenKeys={legalTokenKeys} animateUpdates finishSound /></div></div>
        <div className="controls">
          <div className="turn-copy"><b>{game?.winnerId ? "Game finished" : myTurn ? "Roll the dice" : "Waiting for opponent"}</b><span>{game?.winnerId ? "Final result" : myTurn && pending !== null ? `Choose a token • ${pending}` : "Live board is synchronized"}</span></div>
          <div className="dice-wrap"><DemoDice value={roll} onRoll={handleRoll} disabled={!myTurn || pending !== null || animating || remoteRolling || !game || game.status !== "playing"} botRolling={remoteRolling} /></div>
        </div>
      </section>
    </div>
    <style jsx global>{`
      html,body{margin:0;padding:0;background:#050505;overflow:hidden}*{box-sizing:border-box}
      .live-page{position:fixed;inset:0;background:radial-gradient(circle at 50% 25%,#241a0a 0,#0b0906 42%,#020202 100%);color:#f7edcf;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
      .live-shell{height:100dvh;width:100%;max-width:980px;margin:auto;display:flex;flex-direction:column;padding:10px 12px 12px;gap:8px}
      .live-topbar{height:50px;flex:0 0 50px;display:flex;align-items:center;justify-content:space-between;padding:0 6px 0 12px;border:1px solid rgba(224,188,75,.34);border-radius:18px;background:rgba(10,8,5,.78);box-shadow:0 8px 30px rgba(0,0,0,.22)}
      .brand{display:flex;align-items:baseline;gap:5px;color:#f1d36e;text-shadow:0 0 16px rgba(240,190,60,.25)}.brand span{font-size:17px}.brand b{font:700 18px Georgia,serif;letter-spacing:1px}.brand em{font:700 12px Georgia,serif;font-style:normal}
      .connection{display:flex;align-items:center;gap:7px;padding:7px 11px;border:1px solid rgba(255,255,255,.09);border-radius:999px;color:#8f856e;font-size:9px;font-weight:900;letter-spacing:1px}.connection i{width:7px;height:7px;border-radius:50%;background:#e3a72b}.connection.online{color:#65e29a}.connection.online i{background:#2ce17a;box-shadow:0 0 10px rgba(44,225,122,.7)}
      .game-area{min-height:0;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px}
      .status-pill{z-index:2;display:flex;align-items:center;gap:8px;padding:7px 13px;border:1px solid rgba(224,188,75,.38);border-radius:999px;background:rgba(13,10,5,.9);box-shadow:0 7px 24px rgba(0,0,0,.3)}.status-pill span{color:#39df80;font-size:11px}.status-pill b{font-size:10px;letter-spacing:.7px;color:#f1d16a}.status-pill small{font-size:9px;color:#81775f;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .board-wrap{position:relative;width:min(92vw,calc(100dvh - 195px),760px);aspect-ratio:1;display:grid;place-items:center}.board-glow{position:absolute;inset:4%;border-radius:32px;background:radial-gradient(circle,#d6a83233 0,#0000 68%);filter:blur(18px)}
      .board-frame{position:relative;width:100%;height:100%;padding:5px;border-radius:28px;background:linear-gradient(145deg,#f1d36c,#704d10 30%,#d9b44e 70%,#563809);box-shadow:0 0 0 1px rgba(255,235,145,.28),0 18px 45px rgba(0,0,0,.58),0 0 35px rgba(205,157,43,.12)}.board-frame>div{width:100%!important;height:100%!important;aspect-ratio:1/1!important;border-radius:23px;overflow:hidden}
      .controls{width:min(92vw,760px);min-height:74px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 13px 9px 16px;border:1px solid rgba(224,188,75,.32);border-radius:22px;background:linear-gradient(180deg,rgba(20,15,7,.96),rgba(6,5,4,.96));box-shadow:0 10px 35px rgba(0,0,0,.38)}
      .turn-copy{min-width:0;display:flex;flex-direction:column;gap:4px}.turn-copy b{font-size:13px;color:#f0d16a}.turn-copy span{font-size:9px;color:#8d8266;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dice-wrap{width:70px;height:70px;display:grid;place-items:center;flex:0 0 70px}
      @media(max-width:520px){.live-shell{padding:7px 7px 9px}.live-topbar{height:43px;flex-basis:43px;border-radius:15px}.brand b{font-size:16px}.brand em{font-size:10px}.connection{padding:6px 9px;font-size:8px}.game-area{gap:7px}.status-pill{padding:6px 10px;gap:6px}.status-pill small{max-width:125px}.board-wrap{width:min(96vw,calc(100dvh - 165px))}.board-frame{padding:4px;border-radius:22px}.board-frame>div{border-radius:19px}.controls{min-height:64px;border-radius:18px;padding:6px 9px 6px 12px}.turn-copy b{font-size:11px}.turn-copy span{font-size:8px}.dice-wrap{width:58px;height:58px;flex-basis:58px}}
      @media(max-height:650px) and (orientation:landscape){.live-shell{padding:5px 8px}.live-topbar{height:36px;flex-basis:36px}.game-area{gap:4px;flex-direction:row;align-items:center}.status-pill{position:absolute;top:7px;left:50%;transform:translateX(-50%)}.board-wrap{height:calc(100dvh - 52px);width:auto}.controls{width:180px;min-height:110px;flex-direction:column;align-items:stretch}.dice-wrap{align-self:center}}
    `}</style>
  </main>;
}
