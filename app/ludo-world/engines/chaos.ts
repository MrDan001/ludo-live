import type { WorldEngine } from "./types";

const chaosTurn = (side: "human" | "bot", dice: 1 | 2 | 3 | 4 | 5 | 6) => dice === 6 || Math.random() < 0.35 ? side : side === "human" ? "bot" : "human";

export const chaosEngine: WorldEngine = {
  id: "chaos",
  title: "Chaos Mode",
  subtitle: "The same board, but every move can trigger a surprise bonus turn.",
  tag: "WILD",
  rules: ["Standard movement and captures", "6 grants an extra turn", "Chaos has a 35% bonus-turn event"],
  aiDelayMs: 600,
  chooseBotToken: (legal) => legal[Math.floor(Math.random() * legal.length)],
  resolveTurn: ({ side, dice }) => {
    const nextTurn = chaosTurn(side, dice);
    const event = nextTurn === side && dice !== 6;
    return {
      nextTurn,
      message: event ? `🌪️ Chaos event! ${side === "human" ? "You" : "World AI"} gets a surprise extra turn.` : dice === 6 ? `${side === "human" ? "You" : "World AI"} rolled a 6 — roll again.` : nextTurn === "human" ? "Your turn. Expect the unexpected." : "World AI is thinking…",
    };
  },
};
