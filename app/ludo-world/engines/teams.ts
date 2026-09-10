import type { WorldEngine } from "./types";

export const teamsEngine: WorldEngine = {
  id: "teams",
  title: "2v2 Team Battle",
  subtitle: "You control Red + Yellow as one team against Green + Blue.",
  tag: "2V2",
  rules: ["You control Red + Yellow", "World AI controls Green + Blue", "Either teammate may move on your turn", "Both sides share one victory condition"],
  aiDelayMs: 600,
  chooseBotToken: (legal) => legal[Math.floor(Math.random() * legal.length)],
  resolveTurn: ({ side, dice }) => ({
    nextTurn: dice === 6 ? side : side === "human" ? "bot" : "human",
    message: dice === 6 ? `${side === "human" ? "Your team" : "World team"} rolled a 6 — roll again.` : side === "human" ? "World team is thinking…" : "Your team turn. Roll the dice.",
  }),
};
