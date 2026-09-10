"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EquippedAvatar from "../_components/EquippedAvatar";
import DemoDice from "../_components/DemoDice";
import LudoBoardMultiplayer, { type BoardThemeId, type DemoToken } from "../_components/LudoBoardMultiplayer";
import { canMove, hasWon, moveToken, rollDice } from "../../lib/ludoEngine";
import { WORLD_ENGINES } from "./engines";
import type { DiceValue, WorldEngine, WorldMode, WorldTurn } from "./engines/types";
import type { DiceSkinId } from "../_components/LudoDice";
import "./world-match-v3.css";
import "./world-match-v4.css";

type User = { username: string; level: number; xp: number; coins: number; gems: number; equippedDice?: string; equippedBoard?: string };
type SavedState = { version: 5; tokens: DemoToken[]; turn: WorldTurn; dice: DiceValue | null; gameOver: boolean; message: string; seriesScore: { human: number; bot: number }; round: number };

const HUMAN_COLORS = ["red", "yellow"] as const;
const BOT_COLORS = ["green", "blue"] as const;
const ICONS: Record<WorldMode, string> = { arena: "⚔️", speed: "⚡", teams: "👥", chaos: "🌪️", boss: "👹", tournament: "🏆" };
const VALID_DICE_SKINS: DiceSkinId[] = ["classic", "golden", "crystal", "fire", "rainbow", "diamond", "skull", "sports", "neon", "galaxy", "love"];
const BOT_DICE_DISPLAY_MS = 850;
const BOT_MOVE_SETTLE_MS = 1400;
const BOT_EXTRA_TURN_GAP_MS = 450;

const makeTokens = (): DemoToken[] => ([...HUMAN_COLORS, ...BOT_COLORS] as DemoToken["color"][]).flatMap((color) => Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })));

function applyMove(tokens: DemoToken[], token: DemoToken, dice: DiceValue) {
  const result = moveToken(token as any, dice as any, tokens as any);
  if (!result.moved || !result.token) return null;
  const next = tokens.map((item) => item.color === token.color && item.id === token.id ? (result.token as DemoToken) : item);
  return { next, captured: result.captured.length > 0 };
}

function validSavedState(value: unknown): value is SavedState {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<SavedState>;
  return s.version === 5 && Array.isArray(s.tokens) && (s.turn === "human" || s.turn === "bot") && (s.dice === null || s.dice === 1 || s.dice === 2 || s.dice === 3 || s.dice === 4 || s.dice === 5 || s.dice === 6) && typeof s.gameOver === "boolean" && typeof s.message === "string" && !!s.seriesScore && typeof s.seriesScore.human === "number" && typeof s.seriesScore.bot === "number" && typeof s.round === "number";
}

export default function WorldGamePageMobileV5({ mode }: { mode: WorldMode }) {
  const engine: WorldEngine = WORLD_ENGINES[mode];
  const storageKey = `ludo-world-match:${mode}:v5`;
  const [user, setUser] = useState<User | null>(null);
  const [boardTheme, setBoardTheme] = useState<BoardThemeId>("classic");
  const [diceSkin, setDiceSkin] = useState<DiceSkinId>("classic");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [tokens, setTokens] = useState<DemoToken[]>(makeTokens);
  const [turn, setTurn] = useState<WorldTurn>("human");
  const [dice, setDice] = useState<DiceValue | null>(null);
  const [botRolling, setBotRolling] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("Your turn — roll the dice.");
  const [seconds, setSeconds] = useState(engine.humanTurnSeconds ?? 0);
  const [seriesScore, setSeriesScore] = useState({ human: 0, bot: 0 });
  const [round, setRound] = useState(1);
  const tokensRef = useRef(tokens);
  const botRunningRef = useRef(false);
  const finishingRef = useRef(false);
  const mountedRef = useRef(true);
  const speedTimerRef = useRef<number | null>(null);
  const botTimersRef = useRef<number[]>([]);

  useEffect(() => { tokensRef.current = tokens; }, [tokens]);

  const humanTokens = useMemo(() => tokens.filter((token) => HUMAN_COLORS.includes(token.color as any)), [tokens]);
  const legalTokenKeys = useMemo(() => {
    if (turn !== "human" || dice == null || gameOver) return [];
    return humanTokens.filter((token) => canMove(tokens, token as any, dice as any)).map((token) => `${token.color}:${token.id}`);
  }, [dice, gameOver, humanTokens, tokens, turn]);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const [authResponse, customResponse] = await Promise.all([
          fetch("/api/auth", { cache: "no-store" }).catch(() => null),
          fetch("/api/customization", { cache: "no-store" }).catch(() => null),
        ]);
        const auth = authResponse?.ok ? await authResponse.json().catch(() => null) : null;
        const custom = customResponse?.ok ? await customResponse.json().catch(() => null) : null;
        if (!mountedRef.current) return;
        if (auth?.user) setUser({ username: String(auth.user.username || "Player"), level: Math.max(1, Number(auth.user.level) || 1), xp: Math.max(0, Number(auth.user.xp) || 0), coins: Math.max(0, Number(auth.user.coins) || 0), gems: Math.max(0, Number(auth.user.gems) || 0), equippedDice: String(auth.user.equippedDice || ""), equippedBoard: String(auth.user.equippedBoard || "") });
        const board = String(custom?.equippedBoard || auth?.user?.equippedBoard || "classic");
        const equipped = String(custom?.equippedDice || auth?.user?.equippedDice || "classic");
        setBoardTheme(board as BoardThemeId);
        setDiceSkin(VALID_DICE_SKINS.includes(equipped as DiceSkinId) ? equipped as DiceSkinId : "classic");
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (validSavedState(parsed)) {
              setTokens(parsed.tokens); tokensRef.current = parsed.tokens; setTurn(parsed.turn); setDice(parsed.dice); setGameOver(parsed.gameOver); setMessage(parsed.message); setSeriesScore(parsed.seriesScore); setRound(Math.max(1, parsed.round)); finishingRef.current = parsed.gameOver;
            }
          }
        } catch {}
      } finally { if (mountedRef.current) { setReady(true); setLoading(false); } }
    })();
    return () => { mountedRef.current = false; };
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 5, tokens, turn, dice, gameOver, message, seriesScore, round } satisfies SavedState)); } catch {}
  }, [dice, gameOver, message, ready, round, seriesScore, storageKey, tokens, turn]);

  const stopSpeedTimer = () => { if (speedTimerRef.current !== null) window.clearInterval(speedTimerRef.current); speedTimerRef.current = null; };
  const clearBotTimers = () => { botTimersRef.current.forEach((id) => window.clearTimeout(id)); botTimersRef.current = []; };
  const waitBot = (ms: number) => new Promise<void>((resolve) => { const id = window.setTimeout(() => { botTimersRef.current = botTimersRef.current.filter((x) => x !== id); resolve(); }, ms); botTimersRef.current.push(id); });

  useEffect(() => () => { mountedRef.current = false; stopSpeedTimer(); clearBotTimers(); }, []);

  const resetGame = () => {
    stopSpeedTimer(); clearBotTimers(); botRunningRef.current = false; finishingRef.current = false;
    const fresh = makeTokens(); tokensRef.current = fresh; setTokens(fresh); setTurn("human"); setDice(null); setBotRolling(false); setGameOver(false); setSeconds(engine.humanTurnSeconds ?? 0); setSeriesScore({ human: 0, bot: 0 }); setRound(1); setMessage("Your turn — roll the dice.");
    try { localStorage.removeItem(storageKey); } catch {}
  };

  const recordWin = async () => { try { await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "game_win", eventKey: `world-${engine.id}-win-${Date.now()}` }) }); } catch {} };

  const finishMatch = (winner: WorldTurn) => {
    if (finishingRef.current) return;
    finishingRef.current = true; stopSpeedTimer(); clearBotTimers(); botRunningRef.current = false; setGameOver(true); setDice(null); setBotRolling(false); setTurn(winner); setMessage(winner === "human" ? `🏆 You won ${engine.title}!` : engine.id === "boss" ? "👹 The World boss defeated you." : `The ${engine.title} AI won the match.`); if (winner === "human") void recordWin();
  };

  const finishRound = (winner: WorldTurn) => {
    if (engine.id !== "tournament") return finishMatch(winner);
    const next = { human: seriesScore.human + (winner === "human" ? 1 : 0), bot: seriesScore.bot + (winner === "bot" ? 1 : 0) };
    setSeriesScore(next);
    if (Math.max(next.human, next.bot) >= (engine.seriesToWin ?? 2)) return finishMatch(winner);
    stopSpeedTimer(); clearBotTimers(); botRunningRef.current = false; setDice(null); setBotRolling(false); setMessage(winner === "human" ? "Round won — next round…" : "Round lost — next round…");
    const id = window.setTimeout(() => { if (!mountedRef.current) return; const fresh = makeTokens(); tokensRef.current = fresh; finishingRef.current = false; setTokens(fresh); setTurn("human"); setGameOver(false); setSeconds(engine.humanTurnSeconds ?? 0); setRound((r) => r + 1); setMessage("Your turn — roll the dice."); }, 850);
    botTimersRef.current.push(id);
  };

  const resolveHumanNoMove = (rolled: DiceValue, snapshot: DemoToken[]) => {
    const decision = engine.resolveTurn({ side: "human", dice: rolled, captured: false, noMove: true, before: snapshot, after: snapshot, simulate: (candidate) => { const result = applyMove(snapshot, candidate, rolled); return result ? { token: candidate, dice: rolled, tokens: result.next, captured: result.captured } : null; } });
    setDice(null); setBotRolling(false); setSeconds(engine.humanTurnSeconds ?? 0); setMessage(decision.message); setTurn(decision.nextTurn);
  };

  const handleHumanRoll = (rolled: DiceValue) => {
    if (!ready || turn !== "human" || dice !== null || gameOver || botRunningRef.current || finishingRef.current) return;
    const snapshot = tokensRef.current; setDice(rolled);
    const legal = snapshot.filter((token) => HUMAN_COLORS.includes(token.color as any) && canMove(snapshot, token as any, rolled as any));
    if (!legal.length) { setMessage(`You rolled ${rolled}. No legal move.`); const id = window.setTimeout(() => resolveHumanNoMove(rolled, snapshot), 600); botTimersRef.current.push(id); return; }
    setMessage(`You rolled ${rolled}. Choose a glowing token.`);
  };

  const moveHuman = (color: DemoToken["color"], id: number) => {
    if (turn !== "human" || dice == null || gameOver || finishingRef.current) return;
    const before = tokensRef.current; const token = before.find((item) => item.color === color && item.id === id); if (!token || !canMove(before, token as any, dice as any)) return;
    const rolled = dice; const result = applyMove(before, token, rolled); if (!result) return;
    tokensRef.current = result.next; setTokens(result.next);
    if (hasWon(result.next as any, HUMAN_COLORS as any)) return finishRound("human");
    const decision = engine.resolveTurn({ side: "human", dice: rolled, captured: result.captured, before, after: result.next, simulate: (candidate) => { const sim = applyMove(before, candidate, rolled); return sim ? { token: candidate, dice: rolled, tokens: sim.next, captured: sim.captured } : null; } });
    setDice(null); setBotRolling(false); setSeconds(engine.humanTurnSeconds ?? 0); setMessage(decision.message); setTurn(decision.nextTurn);
  };

  useEffect(() => {
    if (!ready || !engine.humanTurnSeconds || turn !== "human" || dice !== null || gameOver || finishingRef.current) { stopSpeedTimer(); return; }
    setSeconds((v) => v > 0 ? v : engine.humanTurnSeconds ?? 0); stopSpeedTimer();
    speedTimerRef.current = window.setInterval(() => setSeconds((current) => { if (current <= 1) { stopSpeedTimer(); setMessage("⏱️ Time! Your turn was skipped."); const id = window.setTimeout(() => setTurn("bot"), 180); botTimersRef.current.push(id); return 0; } return current - 1; }), 1000);
    return stopSpeedTimer;
  }, [dice, engine.humanTurnSeconds, gameOver, ready, turn]);

  useEffect(() => {
    if (!ready || turn !== "bot" || gameOver || finishingRef.current || botRunningRef.current) return;
    botRunningRef.current = true; let cancelled = false;
    const run = async () => {
      let currentTokens = tokensRef.current;
      let keepBotTurn = true;
      while (keepBotTurn && mountedRef.current && !cancelled && !finishingRef.current) {
        setBotRolling(true); setMessage(engine.id === "boss" ? "The World boss is thinking…" : "World AI is thinking…");
        await waitBot(Math.max(220, engine.aiDelayMs)); if (cancelled || !mountedRef.current || finishingRef.current) break;
        const rolled = rollDice() as DiceValue; setDice(rolled); setBotRolling(true); setMessage(engine.id === "boss" ? `The boss rolled ${rolled}.` : `World AI rolled ${rolled}.`);
        await waitBot(BOT_DICE_DISPLAY_MS); if (cancelled || !mountedRef.current || finishingRef.current) break;
        const legal = currentTokens.filter((token) => BOT_COLORS.includes(token.color as any) && canMove(currentTokens, token as any, rolled as any));
        if (!legal.length) {
          await waitBot(BOT_MOVE_SETTLE_MS);
          if (cancelled || !mountedRef.current || finishingRef.current) break;
          const decision = engine.resolveTurn({ side: "bot", dice: rolled, captured: false, noMove: true, before: currentTokens, after: currentTokens, simulate: (candidate) => { const sim = applyMove(currentTokens, candidate, rolled); return sim ? { token: candidate, dice: rolled, tokens: sim.next, captured: sim.captured } : null; } });
          setDice(null); setBotRolling(false); setMessage(decision.message); keepBotTurn = decision.nextTurn === "bot"; if (!keepBotTurn) setTurn("human"); else await waitBot(BOT_EXTRA_TURN_GAP_MS); continue;
        }
        const choice = engine.chooseBotToken(legal, { dice: rolled, tokens: currentTokens, simulate: (candidate) => { const sim = applyMove(currentTokens, candidate, rolled); return sim ? { token: candidate, dice: rolled, tokens: sim.next, captured: sim.captured } : null; } });
        await waitBot(260); if (cancelled || !mountedRef.current || finishingRef.current) break;
        const current = currentTokens.find((token) => token.color === choice.color && token.id === choice.id); const result = current ? applyMove(currentTokens, current, rolled) : null;
        if (!result) { setDice(null); setBotRolling(false); setTurn("human"); setMessage("Opponent could not complete its move. Your turn."); break; }
        currentTokens = result.next; tokensRef.current = currentTokens; setTokens(currentTokens);
        if (hasWon(currentTokens as any, BOT_COLORS as any)) { finishRound("bot"); break; }
        setMessage(result.captured ? "World AI captured a piece. Counting the move…" : `World AI moved ${rolled} spaces. Counting the move…`);
        await waitBot(BOT_MOVE_SETTLE_MS);
        if (cancelled || !mountedRef.current || finishingRef.current) break;
        const decision = engine.resolveTurn({ side: "bot", dice: rolled, captured: result.captured, before: tokensRef.current, after: currentTokens, simulate: (candidate) => { const sim = applyMove(currentTokens, candidate, rolled); return sim ? { token: candidate, dice: rolled, tokens: sim.next, captured: sim.captured } : null; } });
        setDice(null); setBotRolling(false); setMessage(decision.message); keepBotTurn = decision.nextTurn === "bot";
        if (!keepBotTurn) setTurn("human"); else await waitBot(BOT_EXTRA_TURN_GAP_MS);
      }
      setBotRolling(false); botRunningRef.current = false;
    };
    void run(); return () => { cancelled = true; };
  }, [engine, gameOver, ready, turn]);

  if (loading) return <main className="lw3-page lw3-state"><div className="lw3-state-icon">{ICONS[mode]}</div><h1>Loading {engine.title}</h1><p>Preparing your World match.</p></main>;
  if (!user) return <main className="lw3-page lw3-state"><div className="lw3-state-icon">🔐</div><h1>Login required</h1><p>Sign in to play {engine.title}.</p><a className="lw3-primary" href="/login">Go to Login</a></main>;
  if (user.level < 5) return <main className="lw3-page lw3-state"><div className="lw3-state-icon">🔒</div><h1>World locked</h1><p>{engine.title} unlocks at Level 5.</p><a className="lw3-primary" href="/ludo-world">Back to Ludo World</a></main>;

  const opponent = mode === "boss" ? "WORLD BOSS" : mode === "teams" ? "WORLD TEAM" : "WORLD AI";
  const turnLabel = turn === "human" ? "YOUR TURN" : mode === "boss" ? "BOSS TURN" : "OPPONENT TURN";
  const statusText = mode === "tournament" ? `Series ${seriesScore.human} : ${seriesScore.bot} · Round ${round}` : mode === "speed" && turn === "human" ? `${seconds}s remaining` : message;

  return <main className="lw3-page">
    <header className="lw3-topbar"><button className="lw3-back" type="button" onClick={() => { window.location.href = "/ludo-world"; }}>← Back</button><div className="lw3-mode-title"><span>{ICONS[mode]}</span><div><small>LUDO WORLD</small><b>{engine.title}</b></div></div><div className="lw3-live"><i /> LIVE</div></header>
    <section className="lw3-intro"><div className="lw3-kicker">{engine.tag}</div><h1>{engine.title}</h1><p>{engine.subtitle}</p></section>
    <section className="lw3-players"><div className="lw3-player lw3-player-you"><div className="lw3-avatar"><EquippedAvatar style={{ width: 54, height: 54 }} /></div><div><small>YOU</small><b>{user.username}</b><span>LEVEL {user.level}</span></div></div><div className="lw3-vs">VS</div><div className="lw3-player lw3-player-opponent"><div className="lw3-opponent-icon">{ICONS[mode]}</div><div><small>OPPONENT</small><b>{opponent}</b><span>{mode === "boss" ? "ELITE AI" : mode === "teams" ? "AI TEAM" : "WORLD AI"}</span></div></div></section>
    <section className={`lw3-status ${turn === "human" ? "human" : "bot"}`}><div><small>{turnLabel}</small><b>{statusText}</b></div>{mode === "speed" && <strong>{seconds}s</strong>}</section>
    <section className="lw3-board-frame"><LudoBoardMultiplayer theme={boardTheme} demoTokens={tokens} legalTokenKeys={legalTokenKeys} onTokenClick={moveHuman} animateUpdates /></section>
    <section className="lw3-dice-card"><div className="lw3-dice-head"><div><small>{botRolling ? "WORLD AI" : turn === "human" ? "YOUR DICE" : "WORLD AI"}</small><b>{gameOver ? "Match complete" : botRolling ? "Rolling…" : dice != null ? `Rolled ${dice}` : "Tap to roll"}</b></div><span className="lw3-skin">{diceSkin.toUpperCase()}</span></div><div className="lw3-dice-stage"><DemoDice value={dice ?? 1} onRoll={handleHumanRoll} disabled={turn !== "human" || dice !== null || gameOver || botRolling} botRolling={botRolling} skin={diceSkin} /></div><div className="lw3-dice-hint">{turn === "human" && !gameOver ? "Tap the dice to roll" : botRolling ? "The opponent is playing automatically" : "Waiting for your turn"}</div><button className="lw3-reset" type="button" onClick={resetGame}>RESET GAME</button></section>
    <section className="lw3-rules"><div className="lw3-rules-icon">{ICONS[mode]}</div><div><small>{engine.title} rules</small><p>{engine.rules.join(" · ")}</p></div></section>
    {gameOver && <div className="lw3-overlay"><section className="lw3-result"><div className="lw3-result-icon">{turn === "human" ? "🏆" : mode === "boss" ? "👹" : "🎲"}</div><small>{mode === "tournament" ? `FINAL ${seriesScore.human} : ${seriesScore.bot}` : "MATCH COMPLETE"}</small><h2>{turn === "human" ? "You Win!" : mode === "boss" ? "Boss Wins" : "You Lost"}</h2><p>{message}</p><div className="lw3-result-actions"><button className="lw3-primary" onClick={resetGame}>Play Again</button><button className="lw3-secondary" onClick={() => { window.location.href = "/ludo-world"; }}>World Hub</button></div></section></div>}
  </main>;
}
