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
type GameState = { status: string; currentPlayerId: string | null; dice: Face | null; pendingMove: Face | null; sixStreak: number; players: Player[]; tokens: TokenMap; winnerId?: string | null; stateRevision?: number };

const COLORS: Color[] = ["red", "yellow", "green", "blue"];
const FINISH = FINISH_PROGRESS;
const initialTokens = (): DemoToken[] => COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })));
const displayTheme = (value: string): BoardThemeId => value === "midnight-live" ? "night" : value in BOARD_PALETTES ? value as BoardThemeId : "classic";
const emitAudio = (kind: "dice" | "win") => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ludo-audio", { detail: kind })); };
function normalizeTokens(serverTokens: TokenMap): DemoToken[] { return COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => { const raw = serverTokens?.[color]?.[String(id)]?.position; const position = typeof raw === "number" && Number.isFinite(raw) ? raw : 0; return { color, id, position, state: position === 0 ? "yard" as const : position === FINISH ? "finished" as const : position > 51 ? "home" as const : "track" as const }; })); }

export default function MultiplayerGameCanonical() {
  const [theme, setTheme] = useState<BoardThemeId>("classic");
  const [skinId, setSkinId] = useState("classic");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [me, setMe] = useState("");
  const [game, setGame] = useState<GameState | null>(null);
  const [tokens, setTokens] = useState<DemoToken[]>(initialTokens);
  const [roll, setRoll] = useState<Face>(1);
  const [pending, setPending] = useState<Face | null>(null);
  const [remoteRolling, setRemoteRolling] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [revision, setRevision] = useState(-1);
  const [notice, setNotice] = useState("Connecting…");
  const aliveRef = useRef(true), revisionRef = useRef(-1), diceTimerRef = useRef<number | null>(null), moveTimerRef = useRef<number | null>(null), winnerSoundRef = useRef<string | null>(null);
  const players = game?.players ?? [];
  const myPlayer = players.find((p) => p.playerId === me);
  const myColors = useMemo<Color[]>(() => myPlayer?.colors?.length ? myPlayer.colors : playerColorsForSeats(players.length === 2 ? 2 : 4, myPlayer?.seat ?? 0) as Color[], [myPlayer, players.length]);
  const currentId = game?.currentPlayerId ?? "";
  const myTurn = currentId === me;
  const isTournament = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("tournament");
  const legalTokenKeys = useMemo(() => pending === null || !myTurn ? [] : tokens.filter((t) => myColors.includes(t.color) && canMove(tokens, t, pending)).map((t) => `${t.color}:${t.id}`), [pending, myTurn, tokens, myColors]);

  const applyServerState = useCallback((next: GameState) => {
    const nextRevision = Number(next.stateRevision ?? -1);
    if (nextRevision >= 0 && revisionRef.current >= 0 && nextRevision < revisionRef.current) return false;
    if (nextRevision >= 0) { revisionRef.current = nextRevision; setRevision(nextRevision); }
    setGame(next); setTokens(normalizeTokens(next.tokens ?? {})); return true;
  }, []);

  useEffect(() => { aliveRef.current = true; try { const saved = localStorage.getItem("ludo-match-board"); if (saved) { setSkinId(saved); setTheme(displayTheme(saved)); } } catch {} const load = async () => { try { const r = await fetch("/api/customization", { cache: "no-store" }); const d = await r.json(); const equipped = String(d?.equippedBoard || ""); if (!equipped || !aliveRef.current) return; setSkinId(equipped); setTheme(displayTheme(equipped)); try { localStorage.setItem("ludo-match-board", equipped); } catch {} } catch {} }; void load(); return () => { aliveRef.current = false; }; }, []);

  useEffect(() => {
    let mounted = true;
    const connect = async () => {
      let playerId = "", profileName = "Player";
      try { const r = await fetch("/api/auth", { cache: "no-store" }); const d = await r.json(); playerId = String(d?.user?.id || ""); profileName = String(d?.user?.username || "Player"); } catch {}
      if (!mounted || !playerId) return;
      setMe(playerId);
      const params = new URLSearchParams(window.location.search), roomCode = params.get("room") || "", roomName = profileName || params.get("name") || "Player";
      let roomSize = Number(params.get("size") || 4);
      try { const saved = JSON.parse(localStorage.getItem("ludo-room") || "null"); if (!params.get("size")) roomSize = Number(saved?.players) === 2 ? 2 : 4; } catch {}
      const nextSocket = io(window.location.origin, { transports: ["websocket", "polling"], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 250 });
      setSocket(nextSocket);
      const clearDiceTimer = () => { if (diceTimerRef.current !== null) { window.clearTimeout(diceTimerRef.current); diceTimerRef.current = null; } };
      const clearMoveTimer = () => { if (moveTimerRef.current !== null) { window.clearTimeout(moveTimerRef.current); moveTimerRef.current = null; } };
      nextSocket.on("connect", () => { if (!mounted) return; setNotice(isTournament ? "TOURNAMENT MATCH" : "LIVE MATCH"); if (roomCode) { let board = "classic"; try { board = localStorage.getItem("ludo-match-board") || "classic"; } catch {} nextSocket.emit("join-room", { roomCode, name: roomName, roomSize, playerId, board, dice: "classic" }); } });
      nextSocket.on("roster", (members: Player[]) => { const host = members.find((m) => m.host); if (!host?.board || !mounted) return; const hostSkin = String(host.board); setSkinId(hostSkin); setTheme(displayTheme(hostSkin)); });
      nextSocket.on("start-game", ({ board }: { board?: string }) => { if (!mounted) return; if (board) { setSkinId(String(board)); setTheme(displayTheme(String(board))); } setNotice(isTournament ? "TOURNAMENT MATCH" : "LIVE MATCH"); });
      nextSocket.on("start-error", (message: string) => { if (mounted) setNotice(message); });
      nextSocket.on("game-dice", (event: { playerId: string; value: Face; stateRevision?: number }) => { if (!mounted) return; const r = Number(event.stateRevision ?? -1); if (r >= 0 && revisionRef.current >= 0 && r < revisionRef.current) return; if (r >= 0) { revisionRef.current = r; setRevision(r); } setRoll(event.value); setRemoteRolling(true); emitAudio("dice"); setNotice(event.playerId === playerId ? `You rolled ${event.value}` : "Opponent is rolling…"); clearDiceTimer(); diceTimerRef.current = window.setTimeout(() => { if (mounted) setRemoteRolling(false); diceTimerRef.current = null; }, 900); });
      nextSocket.on("game-state", (next: GameState) => { if (!mounted) return; if (!applyServerState(next)) return; if (next.dice !== null) setRoll(next.dice); setPending(next.currentPlayerId === playerId ? next.pendingMove : null); if (next.winnerId && winnerSoundRef.current !== next.winnerId) { winnerSoundRef.current = next.winnerId; emitAudio("win"); } if (next.winnerId) { const name = next.players.find((p) => p.playerId === next.winnerId)?.name || "Player"; setNotice(next.winnerId === playerId ? "🏆 YOU WON" : `${name} won`); } else if (next.status === "paused") setNotice("Waiting for reconnection…"); else if (next.currentPlayerId === playerId) setNotice(next.pendingMove !== null ? `Pick a token • ${next.pendingMove}` : "Your turn"); else setNotice(`${next.players.find((p) => p.playerId === next.currentPlayerId)?.name || "Player"}'s turn`); });
      nextSocket.on("game-moved", () => { if (!mounted) return; setAnimating(true); clearMoveTimer(); moveTimerRef.current = window.setTimeout(() => { if (mounted) setAnimating(false); moveTimerRef.current = null; }, 650); });
      nextSocket.on("disconnect", () => { if (mounted) setNotice("Reconnecting…"); });
      return () => { clearDiceTimer(); clearMoveTimer(); nextSocket.disconnect(); };
    };
    void connect(); return () => { mounted = false; };
  }, [applyServerState, isTournament]);

  useEffect(() => { if (!socket || !game || !myTurn || pending === null || hasLegalMove(tokens, myColors, pending)) return; setPending(null); socket.emit("game-move", { tokenId: "__skip__", to: 0 }); }, [socket, game, myTurn, pending, tokens, myColors]);
  const chooseToken = useCallback((color: Color, id: number) => { if (!socket || !game || !myTurn || pending === null || animating) return; const token = tokens.find((t) => t.color === color && t.id === id); if (!token || !myColors.includes(color) || !canMove(tokens, token, pending)) return; const target = nextProgress(token.position, pending); if (target === null) return; setPending(null); setAnimating(true); socket.emit("game-move", { tokenId: `${color}:${id}`, to: target }); setNotice("Moving…"); }, [socket, game, myTurn, pending, animating, tokens, myColors]);
  const handleRoll = useCallback(() => { if (!socket || !game || !myTurn || pending !== null || animating || remoteRolling || game.status !== "playing") return; socket.emit("game-roll"); }, [socket, game, myTurn, pending, animating, remoteRolling]);
  const palette = BOARD_PALETTES[theme] || BOARD_PALETTES.classic;
  const sortedPlayers = [...players].sort((a, b) => a.seat - b.seat);

  return (
    <main className="mp-clean" style={{ "--accent": palette.accent, "--bg": palette.bg } as React.CSSProperties}>
      <div className="mp-stage">
        <div className="mp-team">
          <div className="mp-team-scroll">
            {sortedPlayers.map((p) => {
              const active = p.playerId === currentId;
              const mine = p.playerId === me;
              const color = p.colors?.[0] || playerColorsForSeats(players.length === 2 ? 2 : 4, p.seat)[0];
              return <div key={p.playerId} className={`mp-player ${active ? "active" : ""} ${mine ? "mine" : ""}`}><span className={`mp-dot ${color}`} /><div><b>{p.name}{mine ? " · You" : ""}</b><small>{active ? "TURN" : p.connected === false ? "OFFLINE" : p.ready ? "READY" : "IN MATCH"}</small></div>{p.host && <em>♛</em>}</div>;
            })}
          </div>
        </div>

        <div className="mp-board-wrap">
          <LudoBoard theme={theme} demoTokens={tokens} onTokenClick={chooseToken} legalTokenKeys={legalTokenKeys} animateUpdates finishSound />
        </div>

        <div className="mp-bottom">
          <div className="mp-status"><span className="mp-live-dot" /> <b>{game?.winnerId ? "MATCH OVER" : myTurn ? "YOUR TURN" : "OPPONENT TURN"}</b><small>{notice}</small></div>
          <div className="mp-dice"><DemoDice value={roll} onRoll={handleRoll} disabled={!myTurn || pending !== null || animating || remoteRolling || !game || game.status !== "playing"} botRolling={remoteRolling} /></div>
        </div>
      </div>
      <style jsx global>{`
        html,body{margin:0;padding:0;overflow:hidden;background:#05070b}
        .mp-clean{position:fixed;inset:0;width:100%;height:100dvh;background:radial-gradient(circle at 50% -15%,color-mix(in srgb,var(--bg) 45%,#10141c 55%),#05070b 55%);color:#fff;overflow:hidden}
        .mp-stage{width:100%;height:100dvh;max-width:760px;margin:0 auto;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:7px;padding:8px;box-sizing:border-box}
        .mp-team{min-height:58px;border:1px solid color-mix(in srgb,var(--accent) 55%,#fff 45%);border-radius:18px;background:rgba(9,11,16,.78);box-shadow:0 8px 26px rgba(0,0,0,.28);backdrop-filter:blur(14px);overflow:hidden}
        .mp-team-scroll{height:100%;display:flex;align-items:center;justify-content:center;gap:7px;padding:6px 8px;overflow-x:auto}
        .mp-player{position:relative;display:flex;align-items:center;gap:7px;min-width:120px;padding:7px 9px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(255,255,255,.035)}
        .mp-player.active{border-color:color-mix(in srgb,var(--accent) 80%,#fff 20%);box-shadow:0 0 16px color-mix(in srgb,var(--accent) 24%,transparent)}
        .mp-player.mine{background:rgba(255,255,255,.06)}.mp-player b{display:block;font-size:11px;white-space:nowrap;max-width:82px;overflow:hidden;text-overflow:ellipsis}.mp-player small{display:block;margin-top:2px;font-size:7px;letter-spacing:1px;opacity:.58;font-weight:900}.mp-player em{font-style:normal;font-size:12px;margin-left:auto;color:#f0ce67}.mp-dot{width:9px;height:9px;border-radius:50%;flex:none;box-shadow:0 0 8px currentColor}.mp-dot.red{background:#ef3340;color:#ef3340}.mp-dot.yellow{background:#f5c400;color:#f5c400}.mp-dot.green{background:#16b957;color:#16b957}.mp-dot.blue{background:#3977ee;color:#3977ee}
        .mp-board-wrap{min-height:0;display:grid;place-items:center;overflow:hidden;border-radius:22px}.mp-board-wrap>section,.mp-board-wrap>div{width:min(100%,calc(100dvh - 145px));max-width:100%;aspect-ratio:1/1;max-height:100%;overflow:hidden}
        .mp-bottom{min-height:70px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 10px;border:1px solid color-mix(in srgb,var(--accent) 48%,#fff 52%);border-radius:19px;background:rgba(9,11,16,.86);box-shadow:0 -8px 28px rgba(0,0,0,.3);backdrop-filter:blur(14px)}
        .mp-status{min-width:0}.mp-status b{display:block;font-size:11px;letter-spacing:1px}.mp-status small{display:block;margin-top:3px;font-size:9px;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px}.mp-live-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 10px var(--accent);margin-right:5px}.mp-dice{display:flex;align-items:center;justify-content:center;min-width:130px}.mp-dice button{transform:scale(.88);transform-origin:right center}
        @media(max-width:420px){.mp-stage{padding:6px;gap:5px}.mp-team{min-height:54px;border-radius:16px}.mp-team-scroll{justify-content:flex-start;padding:5px}.mp-player{min-width:106px;padding:6px 7px}.mp-player b{font-size:10px}.mp-board-wrap>section,.mp-board-wrap>div{width:min(100%,calc(100dvh - 132px))}.mp-bottom{min-height:62px;border-radius:16px;padding:6px 8px}.mp-dice{min-width:112px}.mp-dice button{transform:scale(.78)}.mp-status small{max-width:155px}}
        @media(max-height:650px){.mp-team{min-height:46px}.mp-player{padding:4px 7px}.mp-player small{display:none}.mp-board-wrap>section,.mp-board-wrap>div{width:min(100%,calc(100dvh - 108px))}.mp-bottom{min-height:54px}}
      `}</style>
    </main>
  );
}
