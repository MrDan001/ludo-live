export type LevelRewardType = "board" | "dice" | "avatar" | "item";

export type MilestoneUnlock = {
  type: LevelRewardType;
  id: string;
  name: string;
  icon?: string;
  fallbackGems: number;
};

// Real catalogue entries reused by the milestone formula. Progression has no cap.
export const MILESTONE_UNLOCKS: MilestoneUnlock[] = [
  { type: "dice", id: "golden", name: "Golden Dice", fallbackGems: 25 },
  { type: "board", id: "galaxy", name: "Galaxy Space", fallbackGems: 40 },
  { type: "dice", id: "fire", name: "Fire Dice", fallbackGems: 45 },
  { type: "board", id: "midnight-live", name: "Midnight Live", fallbackGems: 65 },
  { type: "avatar", id: "avatar-6", name: "Avatar 6", icon: "🧙🏽‍♂️", fallbackGems: 100 },
  { type: "board", id: "candy", name: "Candy Land", fallbackGems: 60 },
  { type: "dice", id: "diamond", name: "Diamond Dice", fallbackGems: 60 },
  { type: "board", id: "dragon", name: "Dragon Theme", fallbackGems: 40 },
  { type: "dice", id: "rainbow", name: "Rainbow Dice", fallbackGems: 35 },
  { type: "board", id: "neon", name: "Neon Glow", fallbackGems: 50 },
];

export type LevelRewardPlan = {
  coins: number;
  gems: number;
  badge: string | null;
  unlock: MilestoneUnlock | null;
};

/** Canonical reward formula. There is deliberately no maximum level. */
export function getLevelRewardPlan(level: number): LevelRewardPlan {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const coins = 250 + (safeLevel - 1) * 50;
  const gems = safeLevel % 5 === 0 ? 10 + Math.floor(safeLevel / 10) * 5 : 0;
  const badge = safeLevel % 10 === 0 ? `level-${safeLevel}` : null;
  const milestoneIndex = safeLevel / 10 - 1;
  const unlock = safeLevel % 10 === 0
    ? MILESTONE_UNLOCKS[milestoneIndex % MILESTONE_UNLOCKS.length]
    : null;
  return { coins, gems, badge, unlock };
}

export function getNextMilestone(level: number) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const next = Math.floor(safeLevel / 10) * 10 + 10;
  return { level: next, unlock: getLevelRewardPlan(next).unlock };
}
