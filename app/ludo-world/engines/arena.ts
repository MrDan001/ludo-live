import type { WorldEngine } from "./types";

export const arenaEngine: WorldEngine = {
  id: "arena",
  title: "Ranked Arena",
  subtitle: "Pure World Ludo: standard movement, captures and six-extra-turn rules.",
  tag: "RANKED",
  rules: ["Standard World movement", "Capture opponents", "Six gives another turn"],
  aiDelayMs: 650,
  chooseBotToken: (legal) => legal[Math.floor(Math.random() * legal.length)],
  resolveTurn: ({ side, dice }) => ({
    nextTurn: dice === 6 ? side : side === "human" ? "bot" : "human",
    message: dice === 6 ? `${side === "human" ? "You" : "World AI"} rolled a 6 — roll again.` : side === "human" ? "World AI is thinking…" : "Your turn. Roll the dice.",
  }),
};
