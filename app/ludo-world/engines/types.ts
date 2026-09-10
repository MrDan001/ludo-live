import type { DemoToken } from "../../_components/LudoBoardMultiplayer";

export type WorldMode = "arena" | "speed" | "teams" | "chaos" | "boss" | "tournament";
export type WorldTurn = "human" | "bot";
export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

export type SimulatedMove = {
  token: DemoToken;
  dice: DiceValue;
  tokens: DemoToken[];
  captured: boolean;
};

export type EngineTurnContext = {
  side: WorldTurn;
  dice: DiceValue;
  captured: boolean;
  noMove?: boolean;
  before: DemoToken[];
  after: DemoToken[];
  simulate: (token: DemoToken) => SimulatedMove | null;
};

export type WorldEngine = {
  id: WorldMode;
  title: string;
  subtitle: string;
  tag: string;
  rules: string[];
  aiDelayMs: number;
  humanTurnSeconds?: number;
  seriesToWin?: number;
  chooseBotToken: (legal: DemoToken[], context: { dice: DiceValue; tokens: DemoToken[]; simulate: (token: DemoToken) => SimulatedMove | null }) => DemoToken;
  resolveTurn: (context: EngineTurnContext) => { nextTurn: WorldTurn; message: string };
};
