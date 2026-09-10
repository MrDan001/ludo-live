"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppFrame from "../_components/AppFrame";
import EquippedAvatar from "../_components/EquippedAvatar";
import DemoDice from "../_components/DemoDice";
import LudoBoardMultiplayer, { type BoardThemeId, type DemoToken } from "../_components/LudoBoardMultiplayer";
import { canMove, hasWon, moveToken, rollDice, type DiceValue } from "../../lib/ludoEngine";
import { WORLD_ENGINES } from "./engines";
import type { WorldEngine, WorldMode, WorldTurn } from "./engines/types";
import "./world.css";
import "./world-match.css";

type User = { username: string; level: number; xp: number; coins: number; gems: number };
const HUMAN_COLORS = ["red", "yellow"] as const;
const BOT_COLORS = ["green", "blue"] as const;
const ICONS: Record<WorldMode, string> = { arena: "⚔️", speed: "⚡", teams: "👥", chaos: "🌪️", boss: "👹", tournament: "🏆" };

function makeTokens(): DemoToken[] {
  return ([...HUMAN_COLORS, ...BOT_COLORS] as DemoToken["color"][]).flatMap((color) =>
    Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })),
  );
}
function moveWithResult(tokens: DemoToken[], token: DemoToken, dice: DiceValue) {
  const result = moveToken(token as any, dice, tokens as any);
  if (!result.moved || !result.token) return null;
  const after = tokens.map((item) => item.color === token.color && item.id === token.id ? (result.token as DemoToken) : item);
  return { ...result, after, captured: result.captured.length > 0 };
}

export default function WorldGamePage({ mode }: { mode: WorldMode }) {
  const engine: WorldEngine = WORLD_ENGINES[mode];
  const [user, setUser] = useState<User | null>(null);
  const [boardTheme, setBoardTheme] = useState<BoardThemeId>("classic");
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<DemoToken[]>(makeTokens);
  const [turn, setTurn] = useState<WorldTurn>("human");
  const [dice, setDice] = useState<DiceValue | null>(null);
  const [botRolling, setBotRolling] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("Your turn — roll the dice.");
  const [seconds, setSeconds] = useState(engine.humanTurnSeconds ?? 0);
  const [seriesScore, setSeriesScore] = useState({ human: 0, bot: 0 });
  const [round, setRound] = useState(1);
  const aiRollTimer = useRef<number | null>(null);
  const aiMoveTimer = useRef<number | null>(null);
  const roundTimer = useRef<number | null>(null);
  const speedTimer = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const noMoveTimer = useRef<number | null>(null);

  const humanTokens = useMemo(() => tokens.filter((token) => HUMAN_COLORS.includes(token.color as (typeof HUMAN_COLORS)[number])), [tokens]);
  const botTokens = useMemo(() => tokens.filter((token) => BOT_COLORS.includes(token.color as (typeof BOT_COLORS)[number])), [tokens]);
  const legalTokenKeys = useMemo(() => {
    if (dice == null || turn !== "human" || gameOver) return [];
    return humanTokens.filter((token) => canMove(tokens, token as any, dice)).map((token) => `${token.color}:${token.id}`);
  }, [dice, gameOver, humanTokens, tokens, turn]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [auth, customization] = await Promise.all([
          fetch("/api/auth", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/customization", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (!alive) return;
        if (auth?.user) {
          setUser({
            username: String(auth.user.username || "Player"),
            level: Math.max(1, Number(auth.user.level) || 1),
            xp: Math.max(0, Number(auth.user.xp) || 0),
            coins: Math.max(0, Number(auth.user.coins) || 0),
            gems: Math.max(0, Number(auth.user.gems) || 0),
          });
        }
        setBoardTheme(String(customization?.equippedBoard || "classic") as BoardThemeId);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const clearTimers = () => {
    if (aiRollTimer.current) window.clearTimeout(aiRollTimer.current);
    if (aiMoveTimer.current) window.clearTimeout(aiMoveTimer.current);
    if (roundTimer.current) window.clearTimeout(roundTimer.current);
    if (speedTimer.current) window.clearInterval(speedTimer.current);
    if (noMoveTimer.current) window.clearTimeout(noMoveTimer.current);
    aiRollTimer.current = null; aiMoveTimer.current = null; roundTimer.current = null; speedTimer.current = null; noMoveTimer.current = null;
  };
  useEffect(() => () => clearTimers(), []);

  const resetGame = () => {
    clearTimers(); finishedRef.current = false;
    setTokens(makeTokens()); setTurn("human"); setDice(null); setBotRolling(false); setGameOver(false);
    setSeconds(engine.humanTurnSeconds ?? 0); setSeriesScore({ human: 0, bot: 0 }); setRound(1); setMessage("Your turn — roll the dice.");
  };

  const recordWin = async () => {
    try {
      await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "game_win", eventKey: `world-${engine.id}-win-${Date.now()}` }) });
    } catch {}
  };
  const finishMatch = (winner: WorldTurn) => {
    if (finishedRef.current) return;
    finishedRef.current = true; clearTimers(); setGameOver(true); setDice(null); setBotRolling(false);
    setMessage(winner === "human" ? `🏆 You won ${engine.title}!` : engine.id === "boss" ? "👹 The World boss defeated you. Try again." : `The ${engine.title} AI won this match.`);
    if (winner === "human") void recordWin();
  };
  const finishRound = (winner: WorldTurn) => {
    if (engine.id !== "tournament") return finishMatch(winner);
    const nextScore = { ...seriesScore, [winner]: seriesScore[winner] + 1 };
    setSeriesScore(nextScore);
    if (nextScore[winner] >= (engine.seriesToWin ?? 2)) return finishMatch(winner);
    clearTimers(); setDice(null); setBotRolling(false);
    setMessage(winner === "human" ? "Round won — next round loading…" : "Round lost — next round loading…");
    roundTimer.current = window.setTimeout(() => {
      finishedRef.current = false; setTokens(makeTokens()); setTurn("human"); setGameOver(false); setSeconds(engine.humanTurnSeconds ?? 0); setRound((v) => v + 1); setMessage("New tournament round. Your turn — roll the dice.");
    }, 850);
  };
  const resolveTurn = (side: WorldTurn, rolled: DiceValue, before: DemoToken[], after: DemoToken[], captured: boolean, noMove = false) => {
    const decision = engine.resolveTurn({
      side, dice: rolled, captured, noMove, before, after,
      simulate: (candidate) => {
        const simulation = moveWithResult(before, candidate, rolled);
        return simulation ? { token: candidate, dice: rolled, tokens: simulation.after, captured: simulation.captured } : null;
      },
    });
    setTurn(decision.nextTurn); setDice(null); setBotRolling(false); setSeconds(engine.humanTurnSeconds ?? 0); setMessage(decision.message);
  };
  const handleHumanRoll = (rolled: DiceValue) => {
    if (dice != null || turn !== "human" || gameOver) return;
    setDice(rolled);
    const legal = humanTokens.filter((token) => canMove(tokens, token as any, rolled));
    if (!legal.length) {
      setMessage(`You rolled ${rolled}. No legal move.`);
      noMoveTimer.current = window.setTimeout(() => { if (!finishedRef.current) resolveTurn("human", rolled, tokens, tokens, false, true); }, 650);
    } else {
      setMessage(`You rolled ${rolled}. Select a glowing token.`);
    }
  };
  const moveHuman = (color: DemoToken["color"], id: number) => {
    if (turn !== "human" || dice == null || gameOver) return;
    const token = tokens.find((candidate) => candidate.color === color && candidate.id === id);
    if (!token || !canMove(tokens, token as any, dice)) return;
    const rolled = dice; const before = tokens; const result = moveWithResult(before, token, rolled);
    if (!result) return;
    setTokens(result.after);
    if (hasWon(result.after as any, HUMAN_COLORS as any)) return finishRound("human");
    resolveTurn("human", rolled, before, result.after, result.captured);
  };

  useEffect(() => {
    if (!engine.humanTurnSeconds || turn !== "human" || dice != null || gameOver) { if (speedTimer.current) window.clearInterval(speedTimer.current); speedTimer.current = null; return; }
    setSeconds(engine.humanTurnSeconds);
    speedTimer.current = window.setInterval(() => setSeconds((current) => {
      if (current <= 1) {
        if (speedTimer.current) window.clearInterval(speedTimer.current);
        speedTimer.current = null; setMessage("⏱️ Time! Your turn was skipped."); setTurn("bot"); return engine.humanTurnSeconds ?? 0;
      }
      return current - 1;
    }), 1000);
    return () => { if (speedTimer.current) window.clearInterval(speedTimer.current); speedTimer.current = null; };
  }, [engine.humanTurnSeconds, turn, dice, gameOver]);

  useEffect(() => {
    if (turn !== "bot" || dice != null || botRolling || gameOver) return;
    aiRollTimer.current = window.setTimeout(() => {
      const rolled = rollDice();
      setDice(rolled); setBotRolling(true); setMessage(engine.id === "boss" ? "The World boss is rolling…" : "Opponent is rolling…");
      const movable = botTokens.filter((token) => canMove(tokens, token as any, rolled));
      if (!movable.length) {
        aiMoveTimer.current = window.setTimeout(() => resolveTurn("bot", rolled, tokens, tokens, false, true), 900);
        return;
      }
      const choice = engine.chooseBotToken(movable, { dice: rolled, tokens, simulate: (candidate) => { const simulation = moveWithResult(tokens, candidate, rolled); return simulation ? { token: candidate, dice: rolled, tokens: simulation.after, captured: simulation.captured } : null; } });
      aiMoveTimer.current = window.setTimeout(() => {
        const current = tokens.find((candidate) => candidate.color === choice.color && candidate.id === choice.id); if (!current || finishedRef.current) return;
        const result = moveWithResult(tokens, current, rolled); if (!result) return; setTokens(result.after);
        if (hasWon(result.after as any, BOT_COLORS as any)) return finishRound("bot");
        resolveTurn("bot", rolled, tokens, result.after, result.captured);
      }, 1050);
    }, engine.aiDelayMs);
    return () => { if (aiRollTimer.current) window.clearTimeout(aiRollTimer.current); if (aiMoveTimer.current) window.clearTimeout(aiMoveTimer.current); aiRollTimer.current = null; aiMoveTimer.current = null; };
  }, [turn, dice, botRolling, gameOver, botTokens, tokens, engine]);

  if (loading) return <AppFrame hideBack><div className="lw-game-loading"><div className="lw-orb">{ICONS[mode]}</div><h1>Loading {engine.title}…</h1><p>Preparing your dedicated World game.</p></div></AppFrame>;
  if (!user) return <AppFrame back="/ludo-world" backLabel="← Back to Ludo World"><div className="lw-game-lock"><div className="lw-lock-icon">🔐</div><h1>Login required</h1><p>Sign in to play {engine.title}.</p><a className="lw-primary" href="/login">Go to Login</a></div></AppFrame>;
  if (user.level < 5) return <AppFrame back="/ludo-world" backLabel="← Back to Ludo World"><div className="lw-game-lock"><div className="lw-lock-icon">🔒</div><h1>World locked</h1><p>{engine.title} unlocks at Level 5.</p><a className="lw-primary" href="/ludo-world">View World Progress</a></div></AppFrame>;

  const diceSkin = mode === "boss" ? "skull" : mode === "chaos" ? "neon" : mode === "speed" ? "crystal" : mode === "tournament" ? "golden" : "classic";
  const opponentName = mode === "boss" ? "WORLD BOSS" : mode === "teams" ? "WORLD TEAM" : "WORLD AI";
  const statusText = engine.id === "tournament" ? `Series ${seriesScore.human} – ${seriesScore.bot} · Round ${round}` : engine.id === "speed" && turn === "human" ? `${seconds}s remaining` : message;

  return <main className="lw-match-shell">
    <div className="lw-match-backdrop" aria-hidden="true" />
    <div className="lw-match-content">
      <header className="lw-match-topbar">
        <button className="lw-match-back" type="button" onClick={() => { window.location.href = "/ludo-world"; }}>← Back</button>
        <div className="lw-match-brand"><span>{ICONS[mode]}</span><div><small>LUDO LIVE</small><b>LUDO WORLD</b></div></div>
        <div className="lw-live-pill"><i /> LIVE</div>
      </header>

      <section className="lw-match-title"><div><span>{engine.tag}</span><h1>{engine.title}</h1><p>{engine.subtitle}</p></div><strong>{engine.id === "tournament" ? `${seriesScore.human} : ${seriesScore.bot}` : engine.id.toUpperCase()}</strong></section>

      <section className="lw-battle-bar">
        <div className="lw-battle-player"><div className="lw-battle-avatar"><EquippedAvatar style={{ width: 56, height: 56 }} /></div><div><small>YOU</small><b>{user.username}</b><span>LEVEL {user.level}</span></div></div>
        <div className="lw-battle-vs">VS</div>
        <div className="lw-battle-player lw-battle-opponent"><div className="lw-battle-opponent-icon">{ICONS[mode]}</div><div><small>OPPONENT</small><b>{opponentName}</b><span>{engine.id === "boss" ? "ELITE AI" : "WORLD AI"}</span></div></div>
      </section>

      <section className="lw-turn-card"><div><small>{turn === "human" ? "YOUR TURN" : engine.id === "boss" ? "BOSS TURN" : "OPPONENT TURN"}</small><b>{statusText}</b></div>{engine.id === "speed" && turn === "human" && <em>{seconds}s</em>}</section>

      <section className="lw-board-card-live"><div className="lw-board-live-inner"><LudoBoardMultiplayer theme={boardTheme} demoTokens={tokens} legalTokenKeys={legalTokenKeys} onTokenClick={moveHuman} animateUpdates /></div></section>

      <section className="lw-dice-panel">
        <DemoDice value={dice ?? 1} onRoll={handleHumanRoll} disabled={turn !== "human" || dice != null || gameOver} botRolling={botRolling} skin={diceSkin} />
        <div className="lw-dice-copy"><b>{message}</b><span>{turn === "human" ? (dice == null ? "Tap the dice to roll" : "Choose one of the glowing tokens") : "Waiting for your opponent…"}</span></div>
        <button className="lw-reset-live" type="button" onClick={resetGame}>{gameOver ? "PLAY AGAIN" : "RESET"}</button>
      </section>

      <section className="lw-rule-dock"><div><span>{ICONS[mode]}</span><div><b>{engine.title} rules</b><small>{engine.rules.join(" • ")}</small></div></div><div className="lw-rule-badges"><span>{engine.id === "speed" ? "TIMED" : "LIVE MATCH"}</span>{engine.id === "tournament" && <span>BEST OF {engine.seriesToWin ? engine.seriesToWin * 2 - 1 : 3}</span>}</div></section>
    </div>

    {gameOver && <div className="lw-match-overlay"><div className="lw-result-card"><div className="lw-result-icon">{message.includes("won") ? "🏆" : "🤖"}</div><small>MATCH COMPLETE</small><h2>{message.includes("won") ? "YOU WIN!" : "YOU LOSE"}</h2><p>{message}</p><div className="lw-result-actions"><button type="button" className="lw-primary" onClick={resetGame}>PLAY AGAIN</button><button type="button" className="lw-secondary" onClick={() => { window.location.href = "/ludo-world"; }}>EXIT TO WORLD</button></div></div></div>}
  </main>;
}
