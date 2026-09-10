"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LudoBoardMultiplayer, { type BoardThemeId, type DemoToken } from "../_components/LudoBoardMultiplayer";
import * as rules from "../../lib/ludoRules";

const HUMAN_COLORS = ["red", "yellow"] as const;
const BOT_COLORS = ["green", "blue"] as const;
type WorldColor = DemoToken["color"];
type Turn = "human" | "bot";

type Props = {
  boardTheme?: BoardThemeId;
  onCompleted?: () => void;
};

function makeTokens(): DemoToken[] {
  return ([...HUMAN_COLORS, ...BOT_COLORS] as WorldColor[]).flatMap((color) =>
    Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })),
  );
}

export default function WorldBoard({ boardTheme = "classic", onCompleted }: Props) {
  const [tokens, setTokens] = useState<DemoToken[]>(makeTokens);
  const [turn, setTurn] = useState<Turn>("human");
  const [dice, setDice] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState("Roll the dice to begin.");
  const [gameOver, setGameOver] = useState(false);
  const aiTimer = useRef<number | null>(null);

  const humanTokens = useMemo(() => tokens.filter((t) => HUMAN_COLORS.includes(t.color as (typeof HUMAN_COLORS)[number])), [tokens]);
  const botTokens = useMemo(() => tokens.filter((t) => BOT_COLORS.includes(t.color as (typeof BOT_COLORS)[number])), [tokens]);

  const legalTokenKeys = useMemo(() => {
    if (dice == null || turn !== "human" || gameOver) return [];
    return humanTokens.filter((token) => rules.canMove(tokens, token, dice)).map((token) => `${token.color}:${token.id}`);
  }, [dice, turn, gameOver, humanTokens, tokens]);

  function reset() {
    if (aiTimer.current) window.clearTimeout(aiTimer.current);
    setTokens(makeTokens());
    setTurn("human");
    setDice(null);
    setRolling(false);
    setGameOver(false);
    setMessage("Roll the dice to begin.");
  }

  function finishTurn(nextTurn: Turn, rolled: number) {
    if (rolled === 6) {
      setTurn(nextTurn);
      setDice(null);
      setMessage(nextTurn === "human" ? "You rolled a 6 — roll again." : "The World AI rolled a 6 and keeps the turn.");
      return;
    }
    setTurn(nextTurn);
    setDice(null);
    setMessage(nextTurn === "human" ? "Your turn. Roll the dice." : "World AI is thinking…");
  }

  function rollForHuman() {
    if (rolling || turn !== "human" || gameOver) return;
    setRolling(true);
    const rolled = Math.floor(Math.random() * 6) + 1;
    window.setTimeout(() => {
      setRolling(false);
      setDice(rolled);
      const legal = humanTokens.filter((token) => rules.canMove(tokens, token, rolled));
      if (!legal.length) {
        setMessage(`You rolled ${rolled}. No legal move.`);
        finishTurn("bot", rolled);
      } else {
        setMessage(`You rolled ${rolled}. Choose a glowing token.`);
      }
    }, 420);
  }

  function moveHuman(color: WorldColor, id: number) {
    if (turn !== "human" || dice == null || gameOver) return;
    const token = tokens.find((t) => t.color === color && t.id === id);
    if (!token || !rules.canMove(tokens, token, dice)) return;
    const result = rules.applyMove(tokens, token, dice);
    if (!result) return;
    setTokens(result.tokens as DemoToken[]);
    const won = rules.hasWon(result.tokens as any, HUMAN_COLORS as any);
    if (won) {
      setGameOver(true);
      setDice(null);
      setMessage("🏆 You won the World Arena match!");
      onCompleted?.();
      return;
    }
    setMessage(result.captured ? "💥 Capture! Your token gets the World kill bonus." : "Move completed.");
    finishTurn("bot", dice);
  }

  useEffect(() => {
    if (turn !== "bot" || dice != null || rolling || gameOver) return;
    const timer = window.setTimeout(() => {
      const rolled = Math.floor(Math.random() * 6) + 1;
      setDice(rolled);
      const legal = botTokens.filter((token) => rules.canMove(tokens, token, rolled));
      if (!legal.length) {
        setMessage(`World AI rolled ${rolled}. No legal move.`);
        finishTurn("human", rolled);
        return;
      }
      const choice = legal[Math.floor(Math.random() * legal.length)];
      window.setTimeout(() => {
        const current = tokens.find((t) => t.color === choice.color && t.id === choice.id);
        if (!current) return;
        const result = rules.applyMove(tokens, current, rolled);
        if (!result) return;
        setTokens(result.tokens as DemoToken[]);
        const won = rules.hasWon(result.tokens as any, BOT_COLORS as any);
        if (won) {
          setGameOver(true);
          setDice(null);
          setMessage("The World AI won this round. Try again.");
          return;
        }
        setMessage(result.captured ? "The World AI made a capture." : `World AI moved ${rolled} spaces.`);
        finishTurn("human", rolled);
      }, 520);
    }, 700);
    aiTimer.current = timer;
    return () => window.clearTimeout(timer);
  }, [turn, dice, rolling, gameOver, botTokens, tokens]);

  useEffect(() => () => { if (aiTimer.current) window.clearTimeout(aiTimer.current); }, []);

  return (
    <section className="lw-board-panel">
      <div className="lw-board-head">
        <div>
          <div className="lw-kicker">WORLD ARENA</div>
          <h2>Playable Battle Board</h2>
          <p>Standalone World rules with the same Ludo board geometry. Your existing Online rooms remain untouched.</p>
        </div>
        <div className="lw-board-status"><b>{turn === "human" ? "YOUR TURN" : "WORLD AI"}</b><span>{dice == null ? "Dice ready" : `Rolled ${dice}`}</span></div>
      </div>

      <div className="lw-board-stage">
        <LudoBoardMultiplayer
          theme={boardTheme}
          demoTokens={tokens}
          legalTokenKeys={legalTokenKeys}
          onTokenClick={moveHuman}
          animateUpdates
        />
        <div className="lw-board-controls">
          <button className="lw-dice-button" type="button" onClick={rollForHuman} disabled={rolling || turn !== "human" || gameOver}>{rolling ? "🎲 Rolling…" : dice == null ? "🎲 Roll Dice" : `🎲 ${dice}`}</button>
          <button className="lw-reset-button" type="button" onClick={reset}>{gameOver ? "Play Again" : "Reset Match"}</button>
        </div>
        <div className="lw-board-message">{message}</div>
        {dice != null && turn === "human" && legalTokenKeys.length > 0 && <div className="lw-board-hint">Tap a glowing token to move it.</div>}
      </div>
    </section>
  );
}
