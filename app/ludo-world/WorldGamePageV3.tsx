"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppFrame from "../_components/AppFrame";
import EquippedAvatar from "../_components/EquippedAvatar";
import DemoDice from "../_components/DemoDice";
import LudoBoardMultiplayer, { type BoardThemeId, type DemoToken } from "../_components/LudoBoardMultiplayer";
import { canMove, hasWon, moveToken, rollDice } from "../../lib/ludoEngine";
import { DICE_STYLES, type DiceSkinId } from "../_components/LudoDice";
import { WORLD_ENGINES } from "./engines";
import type { DiceValue, WorldEngine, WorldMode, WorldTurn } from "./engines/types";
import "./world.css";
import "./world-match-v2.css";
import "./world-match-compact.css";

type User = { username: string; level: number; xp: number; coins: number; gems: number };
const HUMAN_COLORS = ["red", "yellow"] as const;
const BOT_COLORS = ["green", "blue"] as const;
const ICONS: Record<WorldMode, string> = { arena: "⚔️", speed: "⚡", teams: "👥", chaos: "🌪️", boss: "👹", tournament: "🏆" };
const VALID_DICE_SKINS = Object.keys(DICE_STYLES) as DiceSkinId[];
const STORAGE_VERSION = "v3";

type SavedState = {
  tokens: DemoToken[];
  turn: WorldTurn;
  humanDice: DiceValue | null;
  gameOver: boolean;
  seriesScore: { human: number; bot: number };
  round: number;
};

const makeTokens = (): DemoToken[] =>
  ([...HUMAN_COLORS, ...BOT_COLORS] as DemoToken["color"][]).flatMap((color) =>
    Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })),
  );

function applyMove(tokens: DemoToken[], token: DemoToken, dice: DiceValue) {
  const result = moveToken(token as any, dice as any, tokens as any);
  if (!result.moved || !result.token) return null;
  const next = tokens.map((item) => item.color === token.color && item.id === token.id ? (result.token as DemoToken) : item);
  return { next, captured: result.captured.length > 0 };
}

function validSavedState(value: unknown): value is SavedState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedState>;
  return Array.isArray(candidate.tokens)
    && (candidate.turn === "human" || candidate.turn === "bot")
    && typeof candidate.gameOver === "boolean"
    && !!candidate.seriesScore
    && typeof candidate.seriesScore.human === "number"
    && typeof candidate.seriesScore.bot === "number"
    && typeof candidate.round === "number";
}

export default function WorldGamePageV3({ mode }: { mode: WorldMode }) {
  const engine: WorldEngine = WORLD_ENGINES[mode];
  const storageKey = `ludo-world-match:${mode}:${STORAGE_VERSION}`;
  const [user, setUser] = useState<User | null>(null);
  const [boardTheme, setBoardTheme] = useState<BoardThemeId>("classic");
  const [diceSkin, setDiceSkin] = useState<DiceSkinId>("classic");
  const [loading, setLoading] = useState(true);
  const [restored, setRestored] = useState(false);
  const [tokens, setTokens] = useState<DemoToken[]>(makeTokens);
  const [turn, setTurn] = useState<WorldTurn>("human");
  const [dice, setDice] = useState<DiceValue | null>(null);
  const [botRolling, setBotRolling] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("Your turn — roll the dice.");
  const [seconds, setSeconds] = useState(engine.humanTurnSeconds ?? 0);
  const [seriesScore, setSeriesScore] = useState({ human: 0, bot: 0 });
  const [round, setRound] = useState(1);
  const [botCycle, setBotCycle] = useState(0);
  const timers = useRef<number[]>([]);
  const speedTimer = useRef<number | null>(null);
  const activeRef = useRef(true);
  const finishedRef = useRef(false);

  const humanTokens = useMemo(() => tokens.filter((token) => HUMAN_COLORS.includes(token.color as any)), [tokens]);
  const botTokens = useMemo(() => tokens.filter((token) => BOT_COLORS.includes(token.color as any)), [tokens]);
  const legalTokenKeys = useMemo(() => {
    if (turn !== "human" || dice == null || gameOver) return [];
    return humanTokens.filter((token) => canMove(tokens, token as any, dice as any)).map((token) => `${token.color}:${token.id}`);
  }, [dice, gameOver, humanTokens, tokens, turn]);

  useEffect(() => {
    activeRef.current = true;
    (async () => {
      try {
        const [auth, customization] = await Promise.all([
          fetch("/api/auth", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/customization", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (!activeRef.current) return;
        if (auth?.user) {
          setUser({
            username: String(auth.user.username || "Player"),
            level: Math.max(1, Number(auth.user.level) || 1),
            xp: Math.max(0, Number(auth.user.xp) || 0),
            coins: Math.max(0, Number(auth.user.coins) || 0),
            gems: Math.max(0, Number(auth.user.gems) || 0),
          });
          const authDice = String(auth.user.equippedDice || "");
          if (VALID_DICE_SKINS.includes(authDice as DiceSkinId)) setDiceSkin(authDice as DiceSkinId);
        }
        const customBoard = String(customization?.equippedBoard || "classic");
        const customDice = String(customization?.equippedDice || "");
        if (customBoard) setBoardTheme(customBoard as BoardThemeId);
        if (VALID_DICE_SKINS.includes(customDice as DiceSkinId)) setDiceSkin(customDice as DiceSkinId);

        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (validSavedState(parsed)) {
              setTokens(parsed.tokens);
              setTurn(parsed.turn);
              setDice(parsed.turn === "human" ? parsed.humanDice : null);
              setGameOver(parsed.gameOver);
              setSeriesScore(parsed.seriesScore);
              setRound(Math.max(1, parsed.round));
              finishedRef.current = parsed.gameOver;
            }
          }
        } catch {}
      } finally {
        if (activeRef.current) {
          setRestored(true);
          setLoading(false);
        }
      }
    })();
    return () => { activeRef.current = false; };
  }, [storageKey]);

  useEffect(() => {
    if (!restored) return;
    try {
      const snapshot: SavedState = {
        tokens,
        turn,
        humanDice: turn === "human" ? dice : null,
        gameOver,
        seriesScore,
        round,
      };
      localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {}
  }, [dice, gameOver, restored, round, seriesScore, storageKey, tokens, turn]);

  const clearAllTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    if (speedTimer.current) window.clearInterval(speedTimer.current);
    speedTimer.current = null;
  };
  useEffect(() => () => clearAllTimers(), []);

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current = timers.current.filter((x) => x !== id);
      if (activeRef.current) fn();
    }, ms);
    timers.current.push(id);
    return id;
  };

  const resetGame = () => {
    clearAllTimers();
    finishedRef.current = false;
    setTokens(makeTokens());
    setTurn("human");
    setDice(null);
    setBotRolling(false);
    setGameOver(false);
    setSeconds(engine.humanTurnSeconds ?? 0);
    setSeriesScore({ human: 0, bot: 0 });
    setRound(1);
    setBotCycle((value) => value + 1);
    setMessage("Your turn — roll the dice.");
    try { localStorage.removeItem(storageKey); } catch {}
  };

  const recordWin = async () => {
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "game_win", eventKey: `world-${engine.id}-win-${Date.now()}` }),
      });
    } catch {}
  };

  const finishMatch = (winner: WorldTurn) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearAllTimers();
    setGameOver(true);
    setDice(null);
    setBotRolling(false);
    setMessage(winner === "human"
      ? `🏆 You won ${engine.title}!`
      : engine.id === "boss"
        ? "👹 The World boss defeated you."
        : `The ${engine.title} AI won the match.`);
    if (winner === "human") void recordWin();
  };

  const finishRound = (winner: WorldTurn) => {
    if (engine.id !== "tournament") return finishMatch(winner);
    setSeriesScore((score) => {
      const next = { ...score, [winner]: score[winner] + 1 };
      if (next[winner] >= (engine.seriesToWin ?? 2)) {
        schedule(() => finishMatch(winner), 20);
      } else {
        clearAllTimers();
        setDice(null);
        setBotRolling(false);
        setMessage(winner === "human" ? "Round won — next round…" : "Round lost — next round…");
        schedule(() => {
          finishedRef.current = false;
          setTokens(makeTokens());
          setTurn("human");
          setGameOver(false);
          setSeconds(engine.humanTurnSeconds ?? 0);
          setRound((value) => value + 1);
          setMessage("New round. Your turn — roll the dice.");
        }, 850);
      }
      return next;
    });
  };

  const resolveTurn = (side: WorldTurn, rolled: DiceValue, before: DemoToken[], after: DemoToken[], captured: boolean, noMove = false) => {
    const decision = engine.resolveTurn({
      side,
      dice: rolled,
      captured,
      noMove,
      before,
      after,
      simulate: (candidate) => {
        const sim = applyMove(before, candidate, rolled);
        return sim ? { token: candidate, dice: rolled, tokens: sim.next, captured: sim.captured } : null;
      },
    });
    setDice(null);
    setBotRolling(false);
    setTurn(decision.nextTurn);
    setSeconds(engine.humanTurnSeconds ?? 0);
    setMessage(decision.message);
    if (side === "bot" && decision.nextTurn === "bot") setBotCycle((value) => value + 1);
  };

  const handleHumanRoll = (rolled: DiceValue) => {
    if (turn !== "human" || dice != null || gameOver || finishedRef.current) return;
    setDice(rolled);
    const legal = humanTokens.filter((token) => canMove(tokens, token as any, rolled as any));
    if (!legal.length) {
      setMessage(`You rolled ${rolled}. No legal move.`);
      schedule(() => resolveTurn("human", rolled, tokens, tokens, false, true), 600);
      return;
    }
    setMessage(`You rolled ${rolled}. Choose a glowing token.`);
  };

  const moveHuman = (color: DemoToken["color"], id: number) => {
    if (turn !== "human" || dice == null || gameOver || finishedRef.current) return;
    const token = tokens.find((item) => item.color === color && item.id === id);
    if (!token || !canMove(tokens, token as any, dice as any)) return;
    const rolled = dice;
    const before = tokens;
    const result = applyMove(before, token, rolled);
    if (!result) return;
    setTokens(result.next);
    if (hasWon(result.next as any, HUMAN_COLORS as any)) return finishRound("human");
    resolveTurn("human", rolled, before, result.next, result.captured);
  };

  useEffect(() => {
    if (!engine.humanTurnSeconds || turn !== "human" || dice != null || gameOver) {
      if (speedTimer.current) window.clearInterval(speedTimer.current);
      speedTimer.current = null;
      return;
    }
    setSeconds((current) => current > 0 ? current : engine.humanTurnSeconds ?? 0);
    speedTimer.current = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          if (speedTimer.current) window.clearInterval(speedTimer.current);
          speedTimer.current = null;
          setMessage("⏱️ Time! Your turn was skipped.");
          schedule(() => setTurn("bot"), 250);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => {
      if (speedTimer.current) window.clearInterval(speedTimer.current);
      speedTimer.current = null;
    };
  }, [dice, engine.humanTurnSeconds, gameOver, turn]);

  useEffect(() => {
    if (!restored || turn !== "bot" || gameOver || finishedRef.current) return;
    const before = tokens;
    const botPool = before.filter((token) => BOT_COLORS.includes(token.color as any));
    let cancelled = false;
    setBotRolling(true);
    setMessage(engine.id === "boss" ? "The World boss is preparing…" : "World AI is preparing its move…");

    const run = async () => {
      await new Promise<void>((resolve) => schedule(resolve, Math.max(180, engine.aiDelayMs)));
      if (!activeRef.current || cancelled || finishedRef.current) return;
      const rolled = rollDice() as DiceValue;
      setDice(rolled);
      setBotRolling(true);
      setMessage(engine.id === "boss" ? `Boss rolled ${rolled}.` : `World AI rolled ${rolled}.`);

      await new Promise<void>((resolve) => schedule(resolve, 850));
      if (!activeRef.current || cancelled || finishedRef.current) return;

      const legal = botPool.filter((token) => canMove(before, token as any, rolled as any));
      if (!legal.length) {
        setBotRolling(false);
        resolveTurn("bot", rolled, before, before, false, true);
        return;
      }

      const choice = engine.chooseBotToken(legal, {
        dice: rolled,
        tokens: before,
        simulate: (candidate) => {
          const sim = applyMove(before, candidate, rolled);
          return sim ? { token: candidate, dice: rolled, tokens: sim.next, captured: sim.captured } : null;
        },
      });

      await new Promise<void>((resolve) => schedule(resolve, 300));
      if (!activeRef.current || cancelled || finishedRef.current) return;
      const current = before.find((token) => token.color === choice.color && token.id === choice.id);
      if (!current) return;
      const result = applyMove(before, current, rolled);
      if (!result) return;
      setTokens(result.next);
      setBotRolling(false);
      if (hasWon(result.next as any, BOT_COLORS as any)) return finishRound("bot");
      resolveTurn("bot", rolled, before, result.next, result.captured);
    };

    void run();
    return () => { cancelled = true; };
  }, [botCycle, engine, gameOver, restored, turn]);

  if (loading) return <AppFrame hideBack><div className="lw2-loading"><div className="lw2-icon">{ICONS[mode]}</div><h1>Loading {engine.title}</h1><p>Preparing this World match.</p></div></AppFrame>;
  if (!user) return <AppFrame back="/ludo-world" backLabel="← Back to Ludo World"><div className="lw2-lock"><div>🔐</div><h1>Login required</h1><p>Sign in to play {engine.title}.</p><a className="lw-primary" href="/login">Go to Login</a></div></AppFrame>;
  if (user.level < 5) return <AppFrame back="/ludo-world" backLabel="← Back to Ludo World"><div className="lw2-lock"><div>🔒</div><h1>World locked</h1><p>{engine.title} unlocks at Level 5.</p><a className="lw-primary" href="/ludo-world">View World Progress</a></div></AppFrame>;

  const opponent = mode === "boss" ? "WORLD BOSS" : mode === "teams" ? "WORLD TEAM" : "WORLD AI";
  const turnLabel = turn === "human" ? "YOUR TURN" : mode === "boss" ? "BOSS TURN" : "OPPONENT TURN";
  const substatus = mode === "tournament"
    ? `SERIES ${seriesScore.human} : ${seriesScore.bot} · ROUND ${round}`
    : mode === "speed" && turn === "human"
      ? `${seconds}s remaining`
      : message;

  return <div className="lw2-page">
    <header className="lw2-header">
      <button className="lw2-back" onClick={() => { window.location.href = "/ludo-world" }}>← Back</button>
      <div className="lw2-titlemark"><span>{ICONS[mode]}</span><div><small>LUDO LIVE</small><b>LUDO WORLD</b></div></div>
      <div className="lw2-live"><i /> LIVE</div>
    </header>

    <section className="lw2-match-head">
      <div><small>{engine.tag}</small><h1>{engine.title}</h1><p>{engine.subtitle}</p></div>
      {mode === "tournament" && <div className="lw2-series"><b>{seriesScore.human} : {seriesScore.bot}</b><span>BEST OF 3</span></div>}
    </section>

    <section className="lw2-players">
      <div className="lw2-player lw2-player-you"><div className="lw2-avatar"><EquippedAvatar style={{ width: 54, height: 54 }} /></div><div><small>YOU</small><b>{user.username}</b><span>LEVEL {user.level}</span></div></div>
      <div className="lw2-vs">VS</div>
      <div className="lw2-player lw2-player-opponent"><div><small>OPPONENT</small><b>{opponent}</b><span>{mode === "boss" ? "ELITE AI" : mode === "teams" ? "WORLD TEAM AI" : "WORLD AI"}</span></div><div className="lw2-opponent-icon">{ICONS[mode]}</div></div>
    </section>

    <section className={`lw2-turn ${turn === "human" ? "is-human" : "is-bot"}`}><div><small>{turnLabel}</small><b>{substatus}</b></div>{mode === "speed" && turn === "human" && <strong>{seconds}</strong>}</section>

    <section className="lw2-board-shell"><div className="lw2-board"><LudoBoardMultiplayer theme={boardTheme} demoTokens={tokens} legalTokenKeys={legalTokenKeys} onTokenClick={moveHuman} animateUpdates /></div></section>

    <section className={`lw2-dice-card ${turn === "human" ? "human-ready" : "bot-active"}`}>
      <div className="lw2-dice"><DemoDice value={dice ?? 1} onRoll={handleHumanRoll} disabled={turn !== "human" || dice != null || gameOver} botRolling={botRolling} skin={diceSkin} /></div>
      <div className="lw2-dice-copy"><small>{turn === "human" ? "YOUR DICE" : "WORLD AI"}</small><h2>{turn === "human" ? (dice == null ? "Roll to play" : `Rolled ${dice}`) : (botRolling ? "Rolling…" : "Choosing a move…")}</h2><p>{turn === "human" ? (dice == null ? "Tap the large dice to start your turn." : "Select one of the glowing tokens on the board.") : "The opponent is playing automatically."}</p></div>
      <button className="lw2-reset" onClick={resetGame}>RESET GAME</button>
    </section>

    <section className="lw2-rules"><div className="lw2-rule-icon">{ICONS[mode]}</div><div><small>{engine.title} rules</small><p>{engine.rules.join(" · ")}</p></div></section>

    {gameOver && <div className="lw2-overlay"><div className="lw2-result"><div className="lw2-result-icon">{message.includes("won") ? "🏆" : "💥"}</div><small>{engine.title}</small><h2>{message.includes("won") ? "Victory!" : "Match Over"}</h2><p>{message}</p><div><button className="lw-primary" onClick={resetGame}>Play Again</button><button className="lw-secondary" onClick={() => { window.location.href = "/ludo-world" }}>World Hub</button></div></div></div>}
  </div>;
}
