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

function normalizeTokens(serverTokens: TokenMap): DemoToken[] {
  return COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => {
    const raw = serverTokens?.[color]?.[String(id)]?.position;
    const position = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
    return { color, id, position, state: position === 0 ? "yard" as const : position === FINISH ? "finished" as const : position > 51 ? "home" as const : "track" as const };
  }));
}

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
  const revisionRef = useRef(-1);
  const diceTimerRef = useRef<number | null>(null);
  const moveTimerRef = useRef<number | null>(null);
  const winnerRef = useRef<string | null>(null);

  const players = game?.players ?? [];
  const myPlayer = players.find((p) => p.playerId === me);
  const myColors = useMemo<Color[]>(
    () => myPlayer?.colors?.length ? myPlayer.colors : playerColorsForSeats(players.length === 2 ? 2 : 4, myPlayer?.seat ?? 0) as Color[],
    [myPlayer, players.length],
  );
  const myTurn = (game?.currentPlayerId ?? "") === me;
  const roomCode = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("room") || "" : "";
  const isTournament = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("tournament");
  const legalTokenKeys = useMemo(
    () => pending === null || !myTurn ? [] : tokens.filter((t) => myColors.includes(t.color) && canMove(tokens, t, pending)).map((t) => `${t.color}:${t.id}`),
    [pending, myTurn, tokens, myColors],
  );

  const applyServerState = useCallback((next: GameState) => {
    const nextRevision = Number(next.stateRevision ?? -1);
    if (nextRevision >= 0 && revisionRef.current >= 0 && nextRevision < revisionRef.current) return false;
    if (nextRevision >= 0) { revisionRef.current = nextRevision; setRevision(nextRevision); }
    setGame(next);
    setTokens(normalizeTokens(next.tokens ?? {}));
    return true;
  }, []);

  useEffect(() => {
    let dead = false;
    try {
      const saved = localStorage.getItem("ludo-match-board");
      if (saved) setTheme(displayTheme(saved));
    } catch {}
    fetch("/api/customization", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      if (dead) return;
      const equipped = String(d?.equippedBoard || "");
      if (!equipped) return;
      setTheme(displayTheme(equipped));
      try { localStorage.setItem("ludo-match-board", equipped); } catch {}
    }).catch(() => {});
    return () => { dead = true; };
  }, []);

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;
    const connect = async () => {
      let playerId = "", profileName = "Player";
      try {
        const r = await fetch("/api/auth", { cache: "no-store" });
        const d = await r.json();
        playerId = String(d?.user?.id || "");
        profileName = String(d?.user?.username || "Player");
      } catch {}
      if (!mounted || !playerId) return;
      setMe(playerId);
      const params = new URLSearchParams(window.location.search);
      let roomSize = Number(params.get("size") || 4);
      try {
        const saved = JSON.parse(localStorage.getItem("ludo-room") || "null");
        if (!params.get("size")) roomSize = Number(saved?.players) === 2 ? 2 : 4;
      } catch {}

      const nextSocket = io(window.location.origin, { transports: ["websocket", "polling"], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 250 });
      setSocket(nextSocket);
      const clearDiceTimer = () => { if (diceTimerRef.current !== null) { window.clearTimeout(diceTimerRef.current); diceTimerRef.current = null; } };
      const clearMoveTimer = () => { if (moveTimerRef.current !== null) { window.clearTimeout(moveTimerRef.current); moveTimerRef.current = null; } };

      nextSocket.on("connect", () => {
        if (!mounted || !roomCode) return;
        let board = "classic";
        try { board = localStorage.getItem("ludo-match-board") || "classic"; } catch {}
        nextSocket.emit("join-room", { roomCode, name: profileName, roomSize, playerId, board, dice: "classic" });
      });
      nextSocket.on("roster", (members: Player[]) => {
        const host = members.find((m) => m.host);
        if (host?.board && mounted) setTheme(displayTheme(String(host.board)));
      });
      nextSocket.on("start-game", ({ board }: { board?: string }) => {
        if (board && mounted) setTheme(displayTheme(String(board)));
      });
      nextSocket.on("game-dice", (event: { playerId: string; value: Face; stateRevision?: number }) => {
        if (!mounted) return;
        const r = Number(event.stateRevision ?? -1);
        if (r >= 0 && revisionRef.current >= 0 && r < revisionRef.current) return;
        if (r >= 0) { revisionRef.current = r; setRevision(r); }
        setRoll(event.value);
        setRemoteRolling(true);
        clearDiceTimer();
        diceTimerRef.current = window.setTimeout(() => { if (mounted) setRemoteRolling(false); }, 900);
      });
      nextSocket.on("game-state", (next: GameState) => {
        if (!mounted || !applyServerState(next)) return;
        if (next.dice !== null) setRoll(next.dice);
        setPending(next.currentPlayerId === playerId ? next.pendingMove : null);
        if (next.winnerId) winnerRef.current = String(next.winnerId);
      });
      nextSocket.on("game-moved", () => {
        if (!mounted) return;
        setAnimating(true);
        clearMoveTimer();
        moveTimerRef.current = window.setTimeout(() => { if (mounted) setAnimating(false); }, 650);
      });
      cleanup = () => { clearDiceTimer(); clearMoveTimer(); nextSocket.disconnect(); };
    };
    void connect();
    return () => { mounted = false; cleanup?.(); };
  }, [applyServerState, roomCode]);

  useEffect(() => {
    if (!game?.winnerId || !me || isTournament) return;
    const winnerId = String(game.winnerId);
    const eventKey = `multiplayer:${roomCode || "room"}:winner:${winnerId}:revision:${revision >= 0 ? revision : "final"}`;
    void fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "game_win", eventKey }),
    }).catch(() => {});
  }, [game?.winnerId, me, isTournament, roomCode, revision]);

  useEffect(() => {
    if (!socket || !game || !myTurn || pending === null || hasLegalMove(tokens, myColors, pending)) return;
    setPending(null);
    socket.emit("game-move", { tokenId: "__skip__", to: 0 });
  }, [socket, game, myTurn, pending, tokens, myColors]);

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
    if (!socket || !game || !myTurn || pending !== null || animating || remoteRolling || game.status !== "playing") return;
    socket.emit("game-roll");
  }, [socket, game, myTurn, pending, animating, remoteRolling]);

  const palette = BOARD_PALETTES[theme] || BOARD_PALETTES.classic;

  return (
    <main className="multiplayer-board-only">
      <div className="board-wrap">
        <LudoBoard
          theme={theme}
          demoTokens={tokens}
          onTokenClick={chooseToken}
          legalTokenKeys={legalTokenKeys}
          animateUpdates
          finishSound
        />
        <div className="dice-overlay">
          <DemoDice
            value={roll}
            onRoll={handleRoll}
            disabled={!myTurn || pending !== null || animating || remoteRolling || !game || game.status !== "playing"}
            botRolling={remoteRolling}
          />
        </div>
      </div>
      <style jsx global>{`
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
        * { box-sizing: border-box; }
        .multiplayer-board-only { position: fixed; inset: 0; width: 100vw; height: 100dvh; background: #000; display: grid; place-items: center; overflow: hidden; }
        .board-wrap { position: relative; width: min(100vw, 100dvh); height: min(100vw, 100dvh); max-width: 100%; max-height: 100%; }
        .board-wrap > div:first-child { width: 100% !important; height: 100% !important; aspect-ratio: 1 / 1 !important; }
        .dice-overlay { position: absolute; left: 50%; bottom: 2.5%; transform: translateX(-50%); z-index: 10; display: grid; place-items: center; }
        .dice-overlay > * { transform: scale(.82); transform-origin: center bottom; }
        @media (max-width: 520px) {
          .board-wrap { width: 100vw; height: 100vw; }
          .dice-overlay > * { transform: scale(.68); }
        }
      `}</style>
    </main>
  );
}
