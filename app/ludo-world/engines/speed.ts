import type { WorldEngine } from "./types";

export const speedEngine: WorldEngine = {
  id: "speed",
  title: "Speed Ludo",
  subtitle: "Ten-second human turns. Hesitate and the turn is skipped.",
  tag: "10S TURNS",
  rules: ["10-second turn clock", "Timeout skips your turn", "One roll per turn"],
  aiDelayMs: 360,
  humanTurnSeconds: 10,
  chooseBotToken: (legal) => legal[Math.floor(Math.random() * legal.length)],
  resolveTurn: ({ side, noMove }) => ({
    nextTurn: side === "human" ? "bot" : "human",
    message: noMove
      ? side === "human"
        ? "No legal move — World AI's turn."
        : "No legal move — your turn."
      : side === "human"
        ? "World AI is thinking…"
        : "Your turn. Roll quickly.",
  }),
};
