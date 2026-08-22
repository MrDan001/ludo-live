"use client";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import AppFrame from "../_components/AppFrame";
import LudoBoard, { BOARD_NAMES, BOARD_PALETTES, BoardThemeId, DemoToken } from "../_components/LudoBoardGame";
import DemoDice from "../_components/DemoDice";

type TokenColor = "green" | "yellow" | "red" | "blue";
type DiceFace = 1 | 2 | 3 | 4 | 5 | 6;
type Mode = "bot" | "2p" | "4p";
const colors: TokenColor[] = ["green", "yellow", "red", "blue"];
const teamText = (c: TokenColor[]) => c.map(x => x[0].toUpperCase() + x.slice(1)).join(" + ");
const modePlayers = (mode: Mode) => mode === "4p"
  ? [{ name: "You", colors: ["green"] as TokenColor[] }, { name: "Player 2", colors: ["yellow"] as TokenColor[] }, { name: "Player 3", colors: ["red"] as TokenColor[] }, { name: "Player 4", colors: ["blue"] as TokenColor[] }]
  : [{ name: "You", colors: ["green", "blue"] as TokenColor[] }, { name: mode === "bot" ? "Bot" : "Player 2", colors: ["red", "yellow"] as TokenColor[] }];
const initialTokens = (): DemoToken[] => colors.flatMap(color => Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })));

// Fresh movement geometry: 51 shared-track positions + 5 home-lane positions = 56.
const STEP_COUNT = 56;
const HOME_ENTRY = 51;

export default function BoardPage() {
  const [theme, setTheme] = useState<BoardThemeId>("classic");
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
  const p = BOARD_PALETTES[theme] || BOARD_PALETTES.classic;
  const players = modePlayers(mode);
  const playerCount = players.length;
  const humanColors = players[0].colors;
  const currentColors = players[turn]?.colors || [];

  useEffect(() => {
    let active = true;
    const loadEquippedBoard = async () => {
      try { const saved = localStorage.getItem("ludo-match-board"); if (saved && saved in BOARD_PALETTES) { if (active) setTheme(saved as BoardThemeId); return; } } catch {}
      try { const c = await fetch("/api/customization", { cache: "no-store" }).then(r => r.ok ? r.json() : null); const equipped = String(c?.equippedBoard || ""); if (active && equipped in BOARD_PALETTES) setTheme(equipped as BoardThemeId); } catch {}
    };
    loadEquippedBoard();
    const room = new URLSearchParams(location.search).get("room");
    if (room) {
      const s = io(location.origin, { transports: ["websocket", "polling"] });
      s.on("connect", () => s.emit("list-rooms"));
      s.on("roster", (m: any[]) => { const h = m.find(x => x.host); if (h?.board && h.board in BOARD_PALETTES) { setTheme(h.board as BoardThemeId); try { localStorage.setItem("ludo-match-board", h.board); } catch {} } });
      return () => { active = false; s.disconnect(); };
    }
    return () => { active = false; };
  }, []);

  const resetDemo = (nextMode: Mode = mode) => {
    setMode(nextMode); setTurn(0); setRoll(1); setNotice("Your turn — roll the dice."); setBotThinking(false); setBotRolling(false); setBotRollKey(0); setTokens(initialTokens()); setPendingRoll(null); setAnimating(false);
  };

  const finishTurn = (rolled: DiceFace, actorName: string) => {
    if (rolled === 6) { setNotice(`${actorName} rolled 6 — bonus roll. Roll again.`); if (mode === "bot" && turn !== 0) setBotRollKey(k => k + 1); return; }
    const nextTurn = (turn + 1) % playerCount;
    setNotice(`${actorName} rolled ${rolled}. ${players[nextTurn]?.name || "Next player"}'s turn.`);
    setTurn(nextTurn);
  };

  const animateToken = (color: TokenColor, id: number, diceValue: DiceFace, actorName: string) => {
    if (animating) return;
    const current = tokens.find(t => t.color === color && t.id === id);
    if (!current || current.state === "finished") return;
    const start = current.position;
    const target = start === 0 ? 1 : start + diceValue;
    if (start === 0 && diceValue !== 6) return;
    if (target > STEP_COUNT) return;
    setAnimating(true); setPendingRoll(null);
    let step = start;
    const timer = window.setInterval(() => {
      if (step >= target) {
        window.clearInterval(timer);
        const finished = target === STEP_COUNT;
        setTokens(prev => prev.map(t => t.color === color && t.id === id ? { ...t, position: target, state: finished ? "finished" : target > HOME_ENTRY ? "home" : "track" } : t));
        setAnimating(false); finishTurn(diceValue, actorName); return;
      }
      step += 1;
      setTokens(prev => prev.map(t => t.color === color && t.id === id ? { ...t, position: step, state: step > HOME_ENTRY ? "home" : "track" } : t));
    }, 280);
  };

  const chooseToken = (color: TokenColor, id: number) => {
    if (pendingRoll == null || animating || !currentColors.includes(color)) return;
    const token = tokens.find(t => t.color === color && t.id === id);
    if (!token || token.state === "finished") return;
    if (token.state === "yard" && pendingRoll !== 6) return;
    if (token.state !== "yard" && token.position + pendingRoll > STEP_COUNT) return;
    animateToken(color, id, pendingRoll, players[turn]?.name || "Player");
  };

  const performBotMove = (n: DiceFace) => {
    const candidate = tokens.find(t => currentColors.includes(t.color) && t.state !== "finished" && ((t.state === "yard" && n === 6) || (t.state !== "yard" && t.position + n <= STEP_COUNT)));
    if (!candidate) { finishTurn(n, players[turn]?.name || "Bot"); return; }
    animateToken(candidate.color, candidate.id, n, players[turn]?.name || "Bot");
  };

  // Existing turn behavior preserved: bot waits one second before every roll.
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
    if (botThinking || animating) return;
    if (mode === "bot" && turn !== 0) return;
    setRoll(n); setPendingRoll(n);
    const legal = tokens.some(t => currentColors.includes(t.color) && t.state !== "finished" && ((t.state === "yard" && n === 6) || (t.state !== "yard" && t.position + n <= STEP_COUNT)));
    if (!legal) { setPendingRoll(null); finishTurn(n, players[turn]?.name || "Player"); return; }
    setNotice(`${players[turn]?.name || "Player"} rolled ${n}. Select a token to move.`);
  };

  const teamLabel = mode === "4p" ? "Green · Yellow · Red · Blue" : `You: ${teamText(humanColors)} · ${players[1].name}: ${teamText(players[1].colors)}`;
  const diceDisabled = botThinking || animating || (mode === "bot" && turn !== 0);

  return <AppFrame back="/dashboard"><main style={{ ...page, background: p.bg, "--accent": p.accent } as React.CSSProperties}>
    <header style={top}><div><div style={eyebrow}>LIVE MATCH · DEMO</div><h1 style={title}>{BOARD_NAMES[theme] || "Ludo Board"}</h1><p style={sub}>Standard Ludo movement</p></div><div style={playersBadge}>{mode === "4p" ? "4 PLAYERS" : mode === "2p" ? "2 PLAYERS" : "YOU VS BOT"}</div></header>
    <div style={modeBar}><button type="button" onClick={() => resetDemo("bot")} style={mode === "bot" ? activeMode : modeBtn}>Player vs Bot</button><button type="button" onClick={() => resetDemo("2p")} style={mode === "2p" ? activeMode : modeBtn}>2 Players</button><button type="button" onClick={() => resetDemo("4p")} style={mode === "4p" ? activeMode : modeBtn}>4 Players</button></div>
    <div style={demoBar}><span>🟢 {turn === 0 ? <b>Your turn</b> : `${players[turn]?.name || "Player"}'s turn`}</span><span>{teamLabel}</span><button type="button" onClick={() => resetDemo()}>New Game</button></div>
    <section style={boardWrap}><div style={boardShell}><LudoBoard theme={theme} demoTokens={tokens} onTokenClick={chooseToken} /></div></section>
    <section style={controls}><div style={{ minWidth: 0 }}><div style={turnLabel}>{turn === 0 ? "YOUR TURN" : `${players[turn]?.name || "PLAYER"} TURN`}</div><b style={{ fontSize: 20 }}>Roll the dice</b><p style={{ margin: "4px 0", color: "#9fb5d8" }}>{notice}</p></div><DemoDice value={roll} onRoll={handleHumanRoll} disabled={diceDisabled} botRolling={botRolling} /></section>
    <div style={status}><span>🟢 Green</span><span>🔵 Blue</span><span>🔴 Red</span><span>🟡 Yellow</span><span>⭐ Safe squares cannot be captured</span><span>💥 Unsafe landing captures opponents</span></div>
  </main></AppFrame>;
}
const page: React.CSSProperties = { width: "100%", minHeight: "calc(100vh - 40px)", padding: "18px", boxSizing: "border-box", borderRadius: 22 };
const top: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" };
const eyebrow: React.CSSProperties = { fontSize: 11, letterSpacing: 2, color: "var(--accent)", fontWeight: 950 };
const title: React.CSSProperties = { fontSize: "clamp(28px,6vw,42px)", margin: "5px 0", fontWeight: 950 };
const sub: React.CSSProperties = { color: "#9fb5d8", margin: 0 };
const playersBadge: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, background: "#071a36", border: "1px solid #284b7b", fontWeight: 900 };
const modeBar: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 };
const modeBtn: React.CSSProperties = { padding: "9px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 800, cursor: "pointer" };
const activeMode: React.CSSProperties = { ...modeBtn, background: "#071a36", color: "#fff", borderColor: "#071a36" };
const demoBar: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 10, padding: "10px 12px", borderRadius: 14, background: "#f5f7fa", border: "1px solid #d8dee7", color: "#172033", fontSize: 13 };
const boardWrap: React.CSSProperties = { display: "grid", placeItems: "center", marginTop: 18 };
const boardShell: React.CSSProperties = { width: "100%", maxWidth: 620, position: "relative" };
const controls: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, marginTop: 16, padding: 16, borderRadius: 18, background: "#071a36", border: "1px solid #284b7b" };
const turnLabel: React.CSSProperties = { fontSize: 10, letterSpacing: 2, color: "#60a5fa", fontWeight: 900 };
const status: React.CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, padding: 13, borderRadius: 14, background: "#071a36", color: "#cbd5e1", fontSize: 12 };
