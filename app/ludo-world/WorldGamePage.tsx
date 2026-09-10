"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppFrame from "../_components/AppFrame";
import EquippedAvatar from "../_components/EquippedAvatar";
import LudoBoardMultiplayer, { type DemoToken } from "../_components/LudoBoardMultiplayer";
import { canMove, hasWon, moveToken, rollDice, type DiceValue } from "../../lib/ludoEngine";
import type { WorldEngine, WorldMode, WorldTurn } from "./engines/types";
import { arenaEngine } from "./engines/arena";
import { speedEngine } from "./engines/speed";
import { teamsEngine } from "./engines/teams";
import { chaosEngine } from "./engines/chaos";
import { bossEngine } from "./engines/boss";
import { tournamentEngine } from "./engines/tournament";
import "./world.css";

type User = { username: string; level: number; xp: number; coins: number; gems: number };
type Customization = { equippedBoard?: string };

export const WORLD_ENGINES: Record<WorldMode, WorldEngine> = {
  arena: arenaEngine,
  speed: speedEngine,
  teams: teamsEngine,
  chaos: chaosEngine,
  boss: bossEngine,
  tournament: tournamentEngine,
};

const HUMAN_COLORS = ["red", "yellow"] as const;
const BOT_COLORS = ["green", "blue"] as const;

function makeTokens(): DemoToken[] {
  return ([...HUMAN_COLORS, ...BOT_COLORS] as DemoToken["color"][]).flatMap((color) =>
    Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })),
  );
}

function isWorldMode(value: string): value is WorldMode {
  return value in WORLD_ENGINES;
}

export default function WorldGamePage({ mode }: { mode: WorldMode }) {
  const engine = WORLD_ENGINES[mode];
  const [user, setUser] = useState<User | null>(null);
  const [boardTheme, setBoardTheme] = useState<any>("classic");
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<DemoToken[]>(makeTokens);
  const [turn, setTurn] = useState<WorldTurn>("human");
  const [dice, setDice] = useState<DiceValue | null>(null);
  const [rolling, setRolling] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("Roll the dice to begin.");
  const [seconds, setSeconds] = useState(engine.humanTurnSeconds ?? 0);
  const [seriesScore, setSeriesScore] = useState({ human: 0, bot: 0 });
  const [round, setRound] = useState(1);
  const aiRollTimer = useRef<number | null>(null);
  const aiMoveTimer = useRef<number | null>(null);
  const rollingTimer = useRef<number | null>(null);
  const roundTimer = useRef<number | null>(null);
  const speedTimer = useRef<number | null>(null);
  const finishedRef = useRef(false);

  const humanTokens = useMemo(() => tokens.filter((t) => HUMAN_COLORS.includes(t.color as (typeof HUMAN_COLORS)[number])), [tokens]);
  const botTokens = useMemo(() => tokens.filter((t) => BOT_COLORS.includes(t.color as (typeof BOT_COLORS)[number])), [tokens]);
  const legalTokenKeys = useMemo(() => {
    if (dice == null || turn !== "human" || gameOver) return [];
    return humanTokens.filter((token) => canMove(tokens, token, dice)).map((token) => `${token.color}:${token.id}`);
  }, [dice, turn, gameOver, humanTokens, tokens]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const authPromise = fetch("/api/auth", { cache: "no-store" }).then(async (r) => (r.ok ? r.json() : null)).catch(() => null);
        const customizationPromise = fetch("/api/customization", { cache: "no-store" }).then(async (r) => (r.ok ? r.json() : null)).catch(() => null);
        const [auth, custom] = await Promise.all([authPromise, customizationPromise]);
        if (!alive) return;
        if (auth?.user) {
          setUser({
            username: String(auth.user.username || "Player"),
            level: Math.max(1, Number(auth.user.level) || 1),
            xp: Math.max(0, Number(auth.user.xp) || 0),
            coins: Math.max(0, Number(auth.user.coins) || 0),
            gems: Math.max(0, Number(auth.user.gems) || 0),
          });
        } else {
          setUser(null);
        }
        if (custom?.equippedBoard) setBoardTheme(String(custom.equippedBoard));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    finishedRef.current = gameOver;
  }, [gameOver]);

  const clearTimers = () => {
    [aiRollTimer.current, aiMoveTimer.current, rollingTimer.current, roundTimer.current].forEach((id) => {
      if (id) window.clearTimeout(id);
    });
    if (speedTimer.current) window.clearInterval(speedTimer.current);
    aiRollTimer.current = null;
    aiMoveTimer.current = null;
    rollingTimer.current = null;
    roundTimer.current = null;
    speedTimer.current = null;
  };

  useEffect(() => () => clearTimers(), []);

  const resetRound = (keepSeries: boolean) => {
    clearTimers();
    setTokens(makeTokens());
    setTurn("human");
    setDice(null);
    setRolling(false);
    setGameOver(false);
    setSeconds(engine.humanTurnSeconds ?? 0);
    if (!keepSeries) {
      setSeriesScore({ human: 0, bot: 0 });
      setRound(1);
      setMessage("Roll the dice to begin.");
    } else {
      setRound((value) => value + 1);
      setMessage("Next tournament round. Roll the dice.");
    }
  };

  const recordWin = async () => {
    try {
      const eventKey = `world-${engine.id}-win-${Date.now()}`;
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "game_win", eventKey }),
      });
    } catch {
      // Match result remains visible even if progression is temporarily unavailable.
    }
  };

  const finishMatch = (winner: WorldTurn) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTimers();
    setGameOver(true);
    setDice(null);
    setTurn(winner);
    if (winner === "human") {
      setMessage(engine.id === "tournament" ? "🏆 Tournament won! You took the crown." : `🏆 You won ${engine.title}!`);
      void recordWin();
    } else {
      setMessage(engine.id === "boss" ? "👹 The World boss defeated you. Try again." : `The ${engine.title} AI won this match.`);
    }
  };

  const finishTurn = (side: WorldTurn, rolled: DiceValue, before: DemoToken[], after: DemoToken[], captured: boolean, noMove = false) => {
    const decision = engine.resolveTurn({
      side,
      dice: rolled,
      captured,
      noMove,
      before,
      after,
      simulate: (token) => {
        const simulated = moveToken(token as any, rolled, before as any);
        if (!simulated.moved) return null;
        return {
          token,
          dice: rolled,
          tokens: simulated.token ? (before.map((item) => item.color === token.color && item.id === token.id ? simulated.token : item) as DemoToken[]) : before,
          captured: simulated.captured.length > 0,
        };
      },
    });
    setTurn(decision.nextTurn);
    setDice(null);
    setSeconds(engine.humanTurnSeconds ?? 0);
    setMessage(decision.message);
  };

  const resolveRound = (winner: WorldTurn) => {
    if (engine.id !== "tournament") {
      finishMatch(winner);
      return;
    }
    const next = { ...seriesScore, [winner]: seriesScore[winner] + 1 };
    setSeriesScore(next);
    if (next[winner] >= (engine.seriesToWin ?? 2)) {
      finishMatch(winner);
      return;
    }
    clearTimers();
    setDice(null);
    setMessage(winner === "human" ? "Round won. Next battle loading…" : "Round lost. Next battle loading…");
    roundTimer.current = window.setTimeout(() => resetRound(true), 900);
  };

  const rollForHuman = () => {
    if (rolling || dice != null || turn !== "human" || gameOver) return;
    setRolling(true);
    const rolled = rollDice();
    rollingTimer.current = window.setTimeout(() => {
      rollingTimer.current = null;
      setRolling(false);
      setDice(rolled);
      const legal = humanTokens.filter((token) => canMove(tokens, token as any, rolled));
      if (!legal.length) {
        setMessage(`You rolled ${rolled}. No legal move.`);
        finishTurn("human", rolled, tokens, tokens, false, true);
      } else {
        setMessage(`You rolled ${rolled}. Choose a glowing token.`);
      }
    }, 360);
  };

  const moveHuman = (color: DemoToken["color"], id: number) => {
    if (turn !== "human" || dice == null || gameOver) return;
    const token = tokens.find((t) => t.color === color && t.id === id);
    if (!token || !canMove(tokens, token as any, dice)) return;
    const rolled = dice;
    const before = tokens;
    const result = moveToken(token as any, rolled, before as any);
    if (!result.moved) return;
    const after = result.token ? before.map((item) => item.color === color && item.id === id ? result.token : item) as DemoToken[] : before;
    setTokens(after);
    const won = hasWon(after as any, HUMAN_COLORS as any);
    if (won) {
      resolveRound("human");
      return;
    }
    finishTurn("human", rolled, before, after, result.captured.length > 0);
  };

  useEffect(() => {
    if (!engine.humanTurnSeconds || turn !== "human" || dice != null || gameOver) {
      if (speedTimer.current) window.clearInterval(speedTimer.current);
      speedTimer.current = null;
      return;
    }
    setSeconds(engine.humanTurnSeconds);
    speedTimer.current = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          if (speedTimer.current) window.clearInterval(speedTimer.current);
          speedTimer.current = null;
          setMessage("⏱️ Time! Your turn was skipped.");
          setTurn("bot");
          setSeconds(engine.humanTurnSeconds ?? 0);
          return engine.humanTurnSeconds ?? 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => {
      if (speedTimer.current) window.clearInterval(speedTimer.current);
      speedTimer.current = null;
    };
  }, [engine.humanTurnSeconds, turn, dice, gameOver]);

  useEffect(() => {
    if (turn !== "bot" || dice != null || rolling || gameOver) return;
    const legal = botTokens.filter((token) => canMove(tokens, token as any, Math.min(6, Math.max(1, 6)) as DiceValue));
    const rollDelay = engine.aiDelayMs;
    aiRollTimer.current = window.setTimeout(() => {
      const rolled = rollDice();
      setDice(rolled);
      const movable = botTokens.filter((token) => canMove(tokens, token as any, rolled));
      if (!movable.length) {
        setMessage(`World side rolled ${rolled}. No legal move.`);
        finishTurn("bot", rolled, tokens, tokens, false, true);
        return;
      }
      const choice = engine.chooseBotToken(movable, {
        dice: rolled,
        tokens,
        simulate: (candidate) => {
          const simulated = moveToken(candidate as any, rolled, tokens as any);
          if (!simulated.moved) return null;
          const after = tokens.map((item) => item.color === candidate.color && item.id === candidate.id ? simulated.token as DemoToken : item);
          return { token: candidate, dice: rolled, tokens: after, captured: simulated.captured.length > 0 };
        },
      });
      aiMoveTimer.current = window.setTimeout(() => {
        const current = tokens.find((token) => token.color === choice.color && token.id === choice.id);
        if (!current || finishedRef.current) return;
        const result = moveToken(current as any, rolled, tokens as any);
        if (!result.moved) return;
        const after = tokens.map((item) => item.color === current.color && item.id === current.id ? result.token as DemoToken : item);
        setTokens(after);
        if (hasWon(after as any, BOT_COLORS as any)) {
          resolveRound("bot");
          return;
        }
        finishTurn("bot", rolled, tokens, after, result.captured.length > 0);
      }, 320);
    }, rollDelay);
    return () => {
      if (aiRollTimer.current) window.clearTimeout(aiRollTimer.current);
      if (aiMoveTimer.current) window.clearTimeout(aiMoveTimer.current);
      aiRollTimer.current = null;
      aiMoveTimer.current = null;
    };
  }, [turn, dice, rolling, gameOver, botTokens, tokens, engine]);

  if (loading) {
    return <AppFrame hideBack><div className="lw-game-loading"><div className="lw-orb">{engine.tag === "BOSS" ? "👹" : "🎮"}</div><h1>Loading {engine.title}…</h1><p>Preparing your dedicated World game engine.</p></div></AppFrame>;
  }

  if (!user) {
    return <AppFrame back="/ludo-world" backLabel="← Back to Ludo World"><div className="lw-game-lock"><div className="lw-lock-icon">🔐</div><h1>Login required</h1><p>Sign in to play {engine.title}.</p><a className="lw-primary" href="/login">Go to Login</a></div></AppFrame>;
  }

  if (user.level < 5) {
    return <AppFrame back="/ludo-world" backLabel="← Back to Ludo World"><div className="lw-game-lock"><div className="lw-lock-icon">🔒</div><h1>World locked</h1><p>{engine.title} unlocks at Level 5.</p><a className="lw-primary" href="/ludo-world">View World Progress</a></div></AppFrame>;
  }

  return <AppFrame back="/ludo-world" backLabel="← Back to Ludo World">
    <div className="lw-game-shell">
      <header className="lw-game-header">
        <div>
          <div className="lw-kicker">{engine.tag}</div>
          <h1>{engine.title}</h1>
          <p>{engine.subtitle}</p>
        </div>
        <div className="lw-game-player"><EquippedAvatar style={{ width: 44, height: 44 }} /><div><b>{user.username}</b><span>World Level {user.level}</span></div></div>
      </header>

      <section className="lw-rule-strip">{engine.rules.map((rule) => <span key={rule}>✓ {rule}</span>)}</section>

      <section className="lw-game-board-card">
        <div className="lw-game-status-row">
          <div className="lw-game-status"><b>{turn === "human" ? "YOUR TURN" : engine.id === "boss" ? "WORLD BOSS" : "WORLD AI"}</b><span>{engine.id === "tournament" ? `Series ${seriesScore.human}–${seriesScore.bot} · Round ${round}` : engine.id === "speed" && turn === "human" ? `${seconds}s left` : dice == null ? "Dice ready" : `Rolled ${dice}`}</span></div>
          <div className="lw-game-mode-pill">{engine.id.toUpperCase()}</div>
        </div>
        <div className="lw-board-stage lw-dedicated-stage">
          <LudoBoardMultiplayer theme={boardTheme} demoTokens={tokens} legalTokenKeys={legalTokenKeys} onTokenClick={moveHuman} animateUpdates />
        </div>
        <div className="lw-board-controls">
          <button className="lw-dice-button" type="button" onClick={rollForHuman} disabled={rolling || dice != null || turn !== "human" || gameOver}>{rolling ? "🎲 Rolling…" : dice == null ? "🎲 Roll Dice" : `🎲 ${dice}`}</button>
          <button className="lw-reset-button" type="button" onClick={() => resetRound(false)}>{gameOver ? "Play Again" : "Reset Game"}</button>
        </div>
        <div className="lw-board-message">{message}</div>
        {dice != null && turn === "human" && legalTokenKeys.length > 0 && <div className="lw-board-hint">Tap a glowing token to move.</div>}
      </section>
    </div>
  </AppFrame>;
}
