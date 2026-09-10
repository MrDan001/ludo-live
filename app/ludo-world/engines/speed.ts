import type { WorldEngine } from "./types";

export const speedEngine: WorldEngine = {
  id: "speed",
  title: "Speed Ludo",
  subtitle: "Ten-second human turns. Hesitate and the turn is skipped.",
  tag: "10S TURNS",
  rules: ["10-second turn clock", "Timeout skips your turn", "Six still grants another turn"],
  aiDelayMs: 360,
  humanTurnSeconds: 10,
  chooseBotToken: (legal) => legal[Math.floor(Math.random() * legal.length)],
  resolveTurn: ({ side, dice, noMove }) => ({
    nextTurn: dice === 6 && !noMove ? side : side === "human" ? "bot" : "human",
    message: noMove ? (side === "human" ? "No legal move — World AI's turn." : "No legal move — your turn.") : dice === 6 ? `${side === "human" ? "You" : "World AI"} rolled a 6 — roll again.` : side === "human" ? "World AI is thinking…" : "Your turn. Roll quickly.",
  }),
};
