"use client";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import AppFrame from "../_components/AppFrame";
import LudoBoard, { BOARD_NAMES, BOARD_PALETTES, BoardThemeId } from "../_components/LudoBoardFixed";
import DemoDice from "../_components/DemoDice";

type TokenColor = "green" | "yellow" | "red" | "blue";
type DiceFace = 1 | 2 | 3 | 4 | 5 | 6;
type Mode = "bot" | "2p" | "4p";
type StaticToken = { color: TokenColor; id: number; position: number; state: "yard" };

const colors: TokenColor[] = ["green", "yellow", "red", "blue"];
const teamText = (c: TokenColor[]) => c.map(x => x[0].toUpperCase() + x.slice(1)).join(" + ");
const modePlayers = (mode: Mode) => mode === "4p"
  ? [{ name: "You", colors: ["green"] as TokenColor[] }, { name: "Player 2", colors: ["yellow"] as TokenColor[] }, { name: "Player 3", colors: ["red"] as TokenColor[] }, { name: "Player 4", colors: ["blue"] as TokenColor[] }]
  : [{ name: "You", colors: ["green", "blue"] as TokenColor[] }, { name: mode === "bot" ? "Bot" : "Player 2", colors: ["red", "yellow"] as TokenColor[] }];

// Movement is intentionally removed. Tokens remain in the yard until the new
// path-based movement system is built and explicitly added later.
const initialTokens = (): StaticToken[] => colors.flatMap(color =>
  Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const }))
);

export default function BoardPage() {
  const [theme, setTheme] = useState<BoardThemeId>("classic");
  const [mode, setMode] = useState<Mode>("bot");
  const [roll, setRoll] = useState<DiceFace>(1);
  const [turn, setTurn] = useState(0);
  const [notice, setNotice] = useState("Your turn — roll the dice.");
  const [botThinking, setBotThinking] = useState(false);
  const [botRolling, setBotRolling] = useState(false);
  const [tokens] = useState<StaticToken[]>(initialTokens);
  const p = BOARD_PALETTES[theme] || BOARD_PALETTES.classic;
  const players = modePlayers(mode);
  const playerCount = players.length;
  const humanColors = players[0].colors;

  useEffect(() => {
    let active = true;
    const loadEquippedBoard = async () => {
      try {
        const saved = localStorage.getItem("ludo-match-board");
        if (saved && saved in BOARD_PALETTES) {
          if (active) setTheme(saved as BoardThemeId);
          return;
        }
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
  }, []);

  const resetDemo = (nextMode: Mode = mode) => {
    setMode(nextMode);
    setTurn(0);
    setRoll(1);
    setNotice("Your turn — roll the dice.");
    setBotThinking(false);
    setBotRolling(false);
  };

  // Turn rules: players proceed in fixed order. A six grants the same player
  // another roll; any other result advances to the next player. This is the
  // requested behavior for bot, 2-player, and 4-player modes.
  useEffect(() => {
    if (turn === 0 || botThinking || mode !== "bot") return;
    setBotThinking(true);
    setBotRolling(true);
    setNotice(`${players[turn]?.name || "Bot"} is rolling…`);
    const timer = window.setTimeout(() => {
      const n = (Math.floor(Math.random() * 6) + 1) as DiceFace;
      setRoll(n);
      setBotRolling(false);
      setBotThinking(false);
      if (n === 6) {
        setNotice(`${players[turn]?.name || "Bot"} rolled 6 — bonus roll.`);
      } else {
        const nextTurn = (turn + 1) % playerCount;
        setNotice(`${players[turn]?.name || "Bot"} rolled ${n}. ${players[nextTurn]?.name || "Next player"}'s turn.`);
        setTurn(nextTurn);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [turn, botThinking, mode, playerCount]);

  const handleHumanRoll = (n: DiceFace) => {
    if (botThinking) return;
    if (mode === "bot" && turn !== 0) return;
    setRoll(n);
    const currentPlayer = players[turn]?.name || "Player";
    if (n === 6) {
      setNotice(`${currentPlayer} rolled 6 — bonus roll. Roll again.`);
      return;
    }
    const nextTurn = (turn + 1) % playerCount;
    setNotice(`${currentPlayer} rolled ${n}. ${players[nextTurn]?.name || "Next player"}'s turn.`);
    setTurn(nextTurn);
  };

  const moveTokenFromBoard = () => {
    setNotice("Token movement is disabled pending the new movement-system rebuild.");
  };

  const teamLabel = mode === "4p"
    ? "Green · Yellow · Red · Blue"
    : `You: ${teamText(humanColors)} · ${players[1].name}: ${teamText(players[1].colors)}`;

  const diceDisabled = botThinking || (mode === "bot" && turn !== 0);

  return <AppFrame back="/dashboard">
    <main style={{ ...page, background: p.bg, "--accent": p.accent } as React.CSSProperties}>
      <header style={top}>
        <div><div style={eyebrow}>LIVE MATCH · DEMO</div><h1 style={title}>{BOARD_NAMES[theme] || "Ludo Board"}</h1><p style={sub}>Standard Ludo movement</p></div>
        <div style={playersBadge}>{mode === "4p" ? "4 PLAYERS" : mode === "2p" ? "2 PLAYERS" : "YOU VS BOT"}</div>
      </header>
      <div style={modeBar}>
        <button type="button" onClick={() => resetDemo("bot")} style={mode === "bot" ? activeMode : modeBtn}>Player vs Bot</button>
        <button type="button" onClick={() => resetDemo("2p")} style={mode === "2p" ? activeMode : modeBtn}>2 Players</button>
        <button type="button" onClick={() => resetDemo("4p")} style={mode === "4p" ? activeMode : modeBtn}>4 Players</button>
      </div>
      <div style={demoBar}><span>🟢 {turn === 0 ? <b>Your turn</b> : `${players[turn]?.name || "Player"}'s turn`}</span><span>{teamLabel}</span><button type="button" onClick={() => resetDemo()}>New Game</button></div>
      <section style={boardWrap}><LudoBoard theme={theme} demoTokens={tokens} onTokenClick={moveTokenFromBoard} /></section>
      <section style={controls}>
        <div style={{ minWidth: 0 }}><div style={turnLabel}>{turn === 0 ? "YOUR TURN" : `${players[turn]?.name || "PLAYER"} TURN`}</div><b style={{ fontSize: 20 }}>Roll the dice</b><p style={{ margin: "4px 0", color: "#9fb5d8" }}>{notice}</p></div>
        <DemoDice value={roll} onRoll={handleHumanRoll} disabled={diceDisabled} botRolling={botRolling} />
      </section>
      <div style={status}><span>🟢 Green</span><span>🔵 Blue</span><span>🔴 Red</span><span>🟡 Yellow</span><span>⭐ Safe squares cannot be captured</span><span>💥 Unsafe landing captures opponents</span></div>
    </main>
  </AppFrame>;
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
const controls: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, marginTop: 16, padding: 16, borderRadius: 18, background: "#071a36", border: "1px solid #284b7b" };
const turnLabel: React.CSSProperties = { fontSize: 10, letterSpacing: 2, color: "#60a5fa", fontWeight: 900 };
const status: React.CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, padding: 13, borderRadius: 14, background: "#071a36", color: "#cbd5e1", fontSize: 12 };