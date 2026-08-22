"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import LudoBoard, { BOARD_PALETTES, BoardThemeId, DemoToken } from "../_components/LudoBoardGame";
import DemoDice from "../_components/DemoDice";
import { getTokenCell, SAFE_CELLS } from "../../lib/ludoBoardCore";

type TokenColor = "green" | "yellow" | "red" | "blue";
type DiceFace = 1 | 2 | 3 | 4 | 5 | 6;
type Mode = "bot" | "2p" | "4p";

const colors: TokenColor[] = ["green", "yellow", "red", "blue"];
const modePlayers = (mode: Mode) => mode === "4p"
  ? [{ name: "You", colors: ["red"] as TokenColor[] }, { name: "Player 2", colors: ["yellow"] as TokenColor[] }, { name: "Player 3", colors: ["green"] as TokenColor[] }, { name: "Player 4", colors: ["blue"] as TokenColor[] }]
  : [{ name: "You", colors: ["red", "yellow"] as TokenColor[] }, { name: mode === "bot" ? "Bot" : "Player 2", colors: ["green", "blue"] as TokenColor[] }];
const initialTokens = (): DemoToken[] => colors.flatMap(color => Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })));
const STEP_COUNT = 56;
const HOME_ENTRY = 51;
const sameCell = (a: readonly number[] | null, b: readonly number[] | null) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
const isSafeCell = (cell: readonly number[] | null) => SAFE_CELLS.some(s => sameCell(cell, [s.row, s.col]));

type Props = {
  themeOverride?: BoardThemeId;
};

export default function GameBoardContent({ themeOverride }: Props) {
  const [theme, setTheme] = useState<BoardThemeId>(themeOverride || "classic");
  const [mode, setMode] = useState<Mode>("bot");
  const [roll, setRoll] = useState<DiceFace>(1);
  const [turn, setTurn] = useState(0);
  const [notice, setNotice] = useState("Your turn — roll the dice.");
  const [botThinking, setBotThinking] = useState(false);
  const [botRolling, setBotRolling] = useState(false);
  const [botRollKey, setBotRollKey] = useState(0);
  const [tokens, setTokens] = useState<DemoToken[]>(initialTokens);
  const [pendingRoll, setPendingRoll] = useState<DiceFace | null>(null);
  const [animating, setAnimating] = useState(false);
  const [sixStreak, setSixStreak] = useState(0);
  const p = BOARD_PALETTES[theme] || BOARD_PALETTES.classic;
  const players = modePlayers(mode);
  const playerCount = players.length;
  const currentColors = players[turn]?.colors || [];

  useEffect(() => {
    if (themeOverride) {
      setTheme(themeOverride);
      return;
    }
    let active = true;
    const loadEquippedBoard = async () => {
      try {
        const saved = localStorage.getItem("ludo-match-board");
        if (saved && saved in BOARD_PALETTES) { if (active) setTheme(saved as BoardThemeId); return; }
      } catch {}
      try {
        const c = await fetch("/api/customization", { cache: "no-store" }).then(r => r.ok ? r.json() : null);
        const equipped = String(c?.equippedBoard || "");
        if (active && equipped in BOARD_PALETTES) setTheme(equipped as BoardThemeId);
      } catch {}
    };
    loadEquippedBoard();
    const room = new URLSearchParams(location.search).get("room");
    if (room) {
      const s = io(location.origin, { transports: ["websocket", "polling"] });
      s.on("connect", () => s.emit("list-rooms"));
      s.on("roster", (m: any[]) => {
        const h = m.find(x => x.host);
        if (h?.board && h.board in BOARD_PALETTES) {
          setTheme(h.board as BoardThemeId);
          try { localStorage.setItem("ludo-match-board", h.board); } catch {}
        }
      });
      return () => { active = false; s.disconnect(); };
    }
    return () => { active = false; };
  }, [themeOverride]);

  const nextTurn = () => (turn + 1) % playerCount;
  const finishTurn = (rolled: DiceFace, actorName: string) => {
    if (rolled === 6) {
      const streak = sixStreak + 1;
      if (streak >= 3) {
        const next = nextTurn();
        setSixStreak(0); setPendingRoll(null); setTurn(next);
        setNotice(`${actorName} rolled three 6s. ${players[next]?.name || "Next player"}'s turn.`);
        return;
      }
      setSixStreak(streak); setNotice(`${actorName} rolled 6 — bonus roll. Roll again.`);
      if (mode === "bot" && turn !== 0) setBotRollKey(k => k + 1);
      return;
    }
    const next = nextTurn();
    setSixStreak(0); setPendingRoll(null); setNotice(`${actorName} rolled ${rolled}. ${players[next]?.name || "Next player"}'s turn.`); setTurn(next);
  };

  const legalMove = (token: DemoToken, diceValue: DiceFace) => {
    if (!currentColors.includes(token.color) || token.state === "finished") return false;
    if (token.state === "yard") return diceValue === 6;
    const target = token.position + diceValue;
    if (target > STEP_COUNT) return false;
    for (let step = token.position + 1; step <= Math.min(target, HOME_ENTRY); step++) {
      const cell = getTokenCell(token.color, step);
      if (!cell) return false;
      const occupants = tokens.filter(t => t.state !== "yard" && t.state !== "finished" && t.position === step && sameCell(getTokenCell(t.color, t.position), cell));
      const opponents = occupants.filter(t => !currentColors.includes(t.color));
      if (opponents.length >= 2) return false;
    }

    // STEP_COUNT is the finished state and intentionally has no board cell.
    // Reaching it exactly is therefore a legal move even though getTokenCell(56)
    // returns null. Any roll that overshoots STEP_COUNT remains illegal above.
    if (target === STEP_COUNT) return true;

    const targetCell = getTokenCell(token.color, target);
    if (!targetCell) return false;
    const occupants = tokens.filter(t => t.state !== "yard" && t.state !== "finished" && sameCell(getTokenCell(t.color, t.position), targetCell));
    const opponents = occupants.filter(t => !currentColors.includes(t.color));
    if (opponents.length >= 2) return false;
    return true;
  };

  const applyLandingRules = (color: TokenColor, id: number, target: number) => {
    const targetCell = getTokenCell(color, target);
    if (!targetCell || target > HOME_ENTRY) return;
    const opponentIds = tokens.filter(t => t.state !== "yard" && t.state !== "finished" && !currentColors.includes(t.color) && sameCell(getTokenCell(t.color, t.position), targetCell));
    if (opponentIds.length === 1 && !isSafeCell(targetCell)) {
      setTokens(prev => prev.map(t => t.color === opponentIds[0].color && t.id === opponentIds[0].id ? { ...t, position: 0, state: "yard" } : t));
      setNotice("Capture! Opponent token returned to the yard.");
    }
  };

  const animateToken = (color: TokenColor, id: number, diceValue: DiceFace, actorName: string) => {
    if (animating) return;
    const current = tokens.find(t => t.color === color && t.id === id);
    if (!current || !legalMove(current, diceValue)) return;
    const start = current.position;
    const target = start === 0 ? 1 : start + diceValue;
    setAnimating(true); setPendingRoll(null);
    let step = start;
    const timer = window.setInterval(() => {
      if (step >= target) {
        window.clearInterval(timer);
        const finished = target === STEP_COUNT;
        setTokens(prev => prev.map(t => t.color === color && t.id === id ? { ...t, position: target, state: finished ? "finished" : target > HOME_ENTRY ? "home" : "track" } : t));
        if (!finished) applyLandingRules(color, id, target);
        setAnimating(false); finishTurn(diceValue, actorName); return;
      }
      step += 1;
      setTokens(prev => prev.map(t => t.color === color && t.id === id ? { ...t, position: step, state: step > HOME_ENTRY ? "home" : "track" } : t));
    }, 280);
  };

  const chooseToken = (color: TokenColor, id: number) => {
    if (pendingRoll == null || animating || !currentColors.includes(color)) return;
    const token = tokens.find(t => t.color === color && t.id === id);
    if (!token || !legalMove(token, pendingRoll)) return;
    animateToken(color, id, pendingRoll, players[turn]?.name || "Player");
  };

  const performBotMove = (n: DiceFace) => {
    const candidate = tokens.find(t => currentColors.includes(t.color) && t.state !== "finished" && legalMove(t, n));
    if (!candidate) { finishTurn(n, players[turn]?.name || "Bot"); return; }
    animateToken(candidate.color, candidate.id, n, players[turn]?.name || "Bot");
  };

  useEffect(() => {
    if (turn === 0 || mode !== "bot") return;
    setBotThinking(true); setBotRolling(false); setNotice(`${players[turn]?.name || "Bot"}'s turn.`);
    let rollTimer: number | undefined;
    const gapTimer = window.setTimeout(() => {
      setBotRolling(true); setNotice(`${players[turn]?.name || "Bot"} is rolling…`);
      rollTimer = window.setTimeout(() => {
        const n = (Math.floor(Math.random() * 6) + 1) as DiceFace;
        setRoll(n); setBotRolling(false); setBotThinking(false); window.setTimeout(() => performBotMove(n), 80);
      }, 1000);
    }, 1000);
    return () => { window.clearTimeout(gapTimer); if (rollTimer !== undefined) window.clearTimeout(rollTimer); };
  }, [turn, mode, playerCount, botRollKey]);

  const handleHumanRoll = (n: DiceFace) => {
    if (botThinking || animating || pendingRoll !== null) return;
    if (mode === "bot" && turn !== 0) return;
    setRoll(n); setPendingRoll(n);
    const legal = tokens.some(t => currentColors.includes(t.color) && legalMove(t, n));
    if (!legal) { setPendingRoll(null); finishTurn(n, players[turn]?.name || "Player"); return; }
    setNotice(`${players[turn]?.name || "Player"} rolled ${n}. Select a legal token to move.`);
  };

  const diceDisabled = botThinking || animating || pendingRoll !== null || (mode === "bot" && turn !== 0);

  return <>
    <section style={boardWrap}>
      <div style={boardShell}>
        <LudoBoard theme={theme} demoTokens={tokens} onTokenClick={chooseToken} />
      </div>
    </section>
    <section style={{ ...controls, borderColor: p.accent, background: "rgba(3,14,31,.78)", boxShadow: p.shadow }} aria-label="Dice and turn controls">
      <div style={{ minWidth: 0 }}>
        <div style={{ ...turnLabel, color: p.accent }}>{turn === 0 ? "YOUR TURN" : `${players[turn]?.name || "PLAYER"} TURN`}</div>
        <b style={{ fontSize: 20 }}>Roll the dice</b>
        <p style={{ margin: "4px 0", color: "#9fb5d8" }}>{notice}</p>
      </div>
      <DemoDice value={roll} onRoll={handleHumanRoll} disabled={diceDisabled} botRolling={botRolling} />
    </section>
  </>;
}

const boardWrap: React.CSSProperties = { display: "grid", placeItems: "center", marginTop: 0 };
const boardShell: React.CSSProperties = { width: "100%", maxWidth: 620, position: "relative" };
const controls: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, margin: "14px auto 0", width: "100%", maxWidth: 620, padding: 16, borderRadius: 18, border: "1px solid", boxSizing: "border-box", backdropFilter: "blur(12px)" };
const turnLabel: React.CSSProperties = { fontSize: 10, letterSpacing: 2, fontWeight: 900 };
