import type { WorldEngine } from "./types";

export const tournamentEngine: WorldEngine = {
  id: "tournament",
  title: "Tournament",
  subtitle: "A best-of-three World series with a persistent score between rounds.",
  tag: "BEST OF 3",
  rules: ["Best of three rounds", "First side to two round wins takes the crown", "Series score persists between rounds", "Six still grants another turn"],
  aiDelayMs: 650,
  seriesToWin: 2,
  chooseBotToken: (legal) => legal[Math.floor(Math.random() * legal.length)],
  resolveTurn: ({ side, dice }) => ({
    nextTurn: dice === 6 ? side : side === "human" ? "bot" : "human",
    message: dice === 6 ? `${side === "human" ? "You" : "World AI"} rolled a 6 — roll again.` : side === "human" ? "World AI is thinking…" : "Your turn. Roll for the next battle.",
  }),
};
