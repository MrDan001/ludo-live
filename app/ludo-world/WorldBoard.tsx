"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LudoBoardMultiplayer, { type BoardThemeId, type DemoToken } from "../_components/LudoBoardMultiplayer";
import * as rules from "../../lib/ludoRules";

export type WorldMode = "arena" | "speed" | "teams" | "chaos" | "boss" | "tournament";

const HUMAN_COLORS = ["red", "yellow"] as const;
const BOT_COLORS = ["green", "blue"] as const;
type WorldColor = DemoToken["color"];
type Turn = "human" | "bot";
type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

type Props = { boardTheme?: BoardThemeId; mode?: WorldMode; onCompleted?: () => void };

const MODE_COPY: Record<WorldMode, { label: string; subtitle: string; hint: string }> = {
  arena: { label: "RANKED ARENA", subtitle: "Standard World battle rules", hint: "Win the match to record World XP." },
  speed: { label: "SPEED LUDO", subtitle: "Every turn has a 10-second clock", hint: "Move quickly. A timed-out turn is skipped." },
  teams: { label: "2V2 TEAM BATTLE", subtitle: "Red + Yellow vs Green + Blue", hint: "Your two tokens are one team against the World AI team." },
  chaos: { label: "CHAOS MODE", subtitle: "Wild turn events can change the pace", hint: "After a move, Chaos may trigger a bonus turn." },
  boss: { label: "BOSS BATTLE", subtitle: "The World boss targets stronger positions", hint: "The boss prioritizes advanced moves and captures." },
  tournament: { label: "WORLD TOURNAMENT", subtitle: "Best-of-three match series", hint: "First side to win two rounds takes the tournament." },
};

function rollDice(): DiceValue { return (Math.floor(Math.random() * 6) + 1) as DiceValue; }

function makeTokens(): DemoToken[] {
  return ([...HUMAN_COLORS, ...BOT_COLORS] as WorldColor[]).flatMap((color) =>
    Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })),
  );
}

function modeName(mode: WorldMode): string { return MODE_COPY[mode].label; }

export default function WorldBoard({ boardTheme = "classic", mode = "arena", onCompleted }: Props) {
  const [tokens, setTokens] = useState<DemoToken[]>(makeTokens);
  const [turn, setTurn] = useState<Turn>("human");
  const [dice, setDice] = useState<DiceValue | null>(null);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState("Roll the dice to begin.");
  const [gameOver, setGameOver] = useState(false);
  const [roundScore, setRoundScore] = useState({ human: 0, bot: 0 });
  const [roundNumber, setRoundNumber] = useState(1);
  const [turnSeconds, setTurnSeconds] = useState(10);
  const aiTimer = useRef<number | null>(null);
  const turnTimer = useRef<number | null>(null);

  const humanTokens = useMemo(() => tokens.filter((t) => HUMAN_COLORS.includes(t.color as (typeof HUMAN_COLORS)[number])), [tokens]);
  const botTokens = useMemo(() => tokens.filter((t) => BOT_COLORS.includes(t.color as (typeof BOT_COLORS)[number])), [tokens]);
  const legalTokenKeys = useMemo(() => {
    if (dice == null || turn !== "human" || gameOver) return [];
    return humanTokens.filter((token) => rules.canMove(tokens, token, dice)).map((token) => `${token.color}:${token.id}`);
  }, [dice, turn, gameOver, humanTokens, tokens]);

  function resetBoard(seriesReset = true) {
    if (aiTimer.current) window.clearTimeout(aiTimer.current);
    if (turnTimer.current) window.clearInterval(turnTimer.current);
    setTokens(makeTokens());
    setTurn("human");
    setDice(null);
    setRolling(false);
    setGameOver(false);
    setTurnSeconds(10);
    if (seriesReset) {
      setRoundScore({ human: 0, bot: 0 });
      setRoundNumber(1);
      setMessage("Roll the dice to begin.");
    } else {
      setRoundNumber((value) => value + 1);
      setMessage("Next tournament round. Roll the dice.");
    }
  }

  function endMatch(winner: Turn) {
    if (turnTimer.current) window.clearInterval(turnTimer.current);
    setGameOver(true);
    setDice(null);
    setTurn(winner);
    if (winner === "human") {
      setMessage(mode === "tournament" ? "🏆 Tournament won! You took the series." : `🏆 You won ${modeName(mode)}!`);
      onCompleted?.();
    } else {
      setMessage(mode === "boss" ? "The World boss defeated you. Try again." : `The ${modeName(mode)} AI won this match.`);
    }
  }

  function resolveRound(winner: Turn) {
    if (mode !== "tournament") { endMatch(winner); return; }
    const nextScore = { ...roundScore, [winner]: roundScore[winner] + 1 };
    setRoundScore(nextScore);
    setDice(null);
    if (nextScore[winner] >= 2) { endMatch(winner); return; }
    window.setTimeout(() => resetBoard(false), 850);
  }

  function finishTurn(rolled: DiceValue, forcedTurn?: Turn) {
    const next: Turn = forcedTurn || (rolled === 6 ? turn : turn === "human" ? "bot" : "human");
    setTurn(next);
    setDice(null);
    setTurnSeconds(10);
    setMessage(rolled === 6
      ? turn === "human" ? "You rolled a 6 — roll again." : "The World AI rolled a 6 — it rolls again."
      : next === "human" ? "Your turn. Roll the dice."
      : mode === "boss" ? "The World boss is thinking…" : "World AI is thinking…");
  }

  function rollForHuman() {
    if (rolling || turn !== "human" || gameOver) return;
    setRolling(true);
    const rolled = rollDice();
    window.setTimeout(() => {
      setRolling(false);
      setDice(rolled);
      const legal = humanTokens.filter((token) => rules.canMove(tokens, token, rolled));
      if (!legal.length) { setMessage(`You rolled ${rolled}. No legal move.`); finishTurn(rolled); }
      else setMessage(`You rolled ${rolled}. Choose a glowing token.`);
    }, 420);
  }

  function moveHuman(color: WorldColor, id: number) {
    if (turn !== "human" || dice == null || gameOver) return;
    const token = tokens.find((t) => t.color === color && t.id === id);
    if (!token || !rules.canMove(tokens, token, dice)) return;
    const rolled = dice;
    const result = rules.applyMove(tokens, token, rolled);
    if (!result) return;
    setTokens(result.tokens as DemoToken[]);
    if (rules.hasWon(result.tokens as any, HUMAN_COLORS as any)) { resolveRound("human"); return; }
    const chaosBonus = mode === "chaos" && Math.random() < 0.25;
    setMessage(chaosBonus ? "🌪️ Chaos event: bonus turn!" : result.captured ? "💥 Capture! World bonus earned." : "Move completed.");
    finishTurn(rolled, chaosBonus ? "human" : undefined);
  }

  useEffect(() => {
    if (mode !== "speed" || turn !== "human" || gameOver || dice != null) {
      if (turnTimer.current) window.clearInterval(turnTimer.current);
      return;
    }
    setTurnSeconds(10);
    turnTimer.current = window.setInterval(() => {
      setTurnSeconds((seconds) => {
        if (seconds <= 1) {
          if (turnTimer.current) window.clearInterval(turnTimer.current);
          setMessage("⏱️ Time! Your turn was skipped.");
          finishTurn(1);
          return 10;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => { if (turnTimer.current) window.clearInterval(turnTimer.current); };
  }, [mode, turn, gameOver, dice]);

  useEffect(() => {
    if (turn !== "bot" || dice != null || rolling || gameOver) return;
    const timer = window.setTimeout(() => {
      const rolled = rollDice();
      setDice(rolled);
      const legal = botTokens.filter((token) => rules.canMove(tokens, token, rolled));
      if (!legal.length) { setMessage(`World AI rolled ${rolled}. No legal move.`); finishTurn(rolled); return; }
      let choice = legal[Math.floor(Math.random() * legal.length)];
      if (mode === "boss") {
        choice = [...legal].sort((a, b) => b.position - a.position)[0];
      }
      window.setTimeout(() => {
        const current = tokens.find((t) => t.color === choice.color && t.id === choice.id);
        if (!current) return;
        const result = rules.applyMove(tokens, current, rolled);
        if (!result) return;
        setTokens(result.tokens as DemoToken[]);
        if (rules.hasWon(result.tokens as any, BOT_COLORS as any)) { resolveRound("bot"); return; }
        setMessage(result.captured ? `💥 ${mode === "boss" ? "Boss" : "World AI"} made a capture.` : `${mode === "boss" ? "Boss" : "World AI"} moved ${rolled} spaces.`);
        const chaosBonus = mode === "chaos" && Math.random() < 0.18;
        finishTurn(rolled, chaosBonus ? "bot" : undefined);
      }, mode === "boss" ? 420 : 520);
    }, mode === "boss" ? 450 : 700);
    aiTimer.current = timer;
    return () => window.clearTimeout(timer);
  }, [turn, dice, rolling, gameOver, botTokens, tokens, mode]);

  useEffect(() => () => {
    if (aiTimer.current) window.clearTimeout(aiTimer.current);
    if (turnTimer.current) window.clearInterval(turnTimer.current);
  }, []);

  return (
    <section className="lw-board-panel">
      <div className="lw-board-head">
        <div>
          <div className="lw-kicker">{MODE_COPY[mode].label}</div>
          <h2>{mode === "tournament" ? `Round ${roundNumber} • ${modeName(mode)}` : modeName(mode)}</h2>
          <p>{MODE_COPY[mode].subtitle}. {MODE_COPY[mode].hint}</p>
        </div>
        <div className="lw-board-status">
          <b>{turn === "human" ? "YOUR TURN" : mode === "boss" ? "WORLD BOSS" : "WORLD AI"}</b>
          <span>{mode === "tournament" ? `Series ${roundScore.human}–${roundScore.bot}` : mode === "speed" && turn === "human" ? `${turnSeconds}s left` : dice == null ? "Dice ready" : `Rolled ${dice}`}</span>
        </div>
      </div>
      <div className="lw-board-stage">
        <LudoBoardMultiplayer theme={boardTheme} demoTokens={tokens} legalTokenKeys={legalTokenKeys} onTokenClick={moveHuman} animateUpdates />
        <div className="lw-board-controls">
          <button className="lw-dice-button" type="button" onClick={rollForHuman} disabled={rolling || turn !== "human" || gameOver}>{rolling ? "🎲 Rolling…" : dice == null ? "🎲 Roll Dice" : `🎲 ${dice}`}</button>
          <button className="lw-reset-button" type="button" onClick={() => resetBoard(true)}>{gameOver ? "Play Again" : "Reset Match"}</button>
        </div>
        <div className="lw-board-message">{message}</div>
        {dice != null && turn === "human" && legalTokenKeys.length > 0 && <div className="lw-board-hint">Tap a glowing token to move it.</div>}
      </div>
    </section>
  );
}
