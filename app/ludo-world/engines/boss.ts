import type { WorldEngine, SimulatedMove } from "./types";

function bestBossMove(legal: Parameters<WorldEngine["chooseBotToken"]>[0], context: Parameters<WorldEngine["chooseBotToken"]>[1]) {
  const scored = legal.map((token) => {
    const simulation = context.simulate(token);
    if (!simulation) return { token, score: -Infinity };
    const progress = simulation.tokens.find((t) => t.color === token.color && t.id === token.id)?.position ?? token.position;
    const captureBonus = simulation.captured ? 1000 : 0;
    const finishBonus = progress >= 57 ? 500 : 0;
    return { token, score: captureBonus + finishBonus + progress };
  });
  return scored.sort((a, b) => b.score - a.score)[0]?.token || legal[0];
}

export const bossEngine: WorldEngine = {
  id: "boss",
  title: "Boss Battle",
  subtitle: "A tougher World boss actively favors captures and advanced pieces.",
  tag: "BOSS",
  rules: ["Boss AI prioritizes captures", "Boss AI favors advanced tokens", "Six still grants another turn", "Boss acts faster than normal AI"],
  aiDelayMs: 340,
  chooseBotToken: bestBossMove,
  resolveTurn: ({ side, dice }) => ({
    nextTurn: dice === 6 ? side : side === "human" ? "bot" : "human",
    message: dice === 6 ? `${side === "human" ? "You" : "The boss"} rolled a 6 — roll again.` : side === "human" ? "The World boss is thinking…" : "Your turn. Survive the boss.",
  }),
};
