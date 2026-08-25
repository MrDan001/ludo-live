export type PlayerHierarchy = {
  id: string;
  label: string;
  icon: string;
  minHours: number;
};

// Hierarchy is an independent reputation ladder based only on verified
// active app/game time. It is intentionally separate from Level and Prestige.
export const PLAYER_HIERARCHY: PlayerHierarchy[] = [
  { id: "on-your-way", label: "On Your Way", icon: "🔰", minHours: 0 },
  { id: "rookie", label: "Rookie", icon: "🔰", minHours: 1 },
  { id: "dabbler", label: "Dabbler", icon: "🔰", minHours: 3 },
  { id: "hobbyist", label: "Hobbyist", icon: "🔰", minHours: 10 },
  { id: "enthusiast", label: "Enthusiast", icon: "🪽", minHours: 20 },
  { id: "devotee", label: "Devotee", icon: "🪽", minHours: 40 },
  { id: "fanatic", label: "Fanatic", icon: "🪽", minHours: 60 },
  { id: "expert", label: "Expert", icon: "🪽", minHours: 100 },
  { id: "prodigy", label: "Prodigy", icon: "🪽", minHours: 300 },
  { id: "champion", label: "Champion", icon: "🪽", minHours: 500 },
  { id: "mastermind", label: "Mastermind", icon: "🪽", minHours: 750 },
  { id: "legend", label: "Legend", icon: "🪽", minHours: 1000 },
  { id: "grandmaster", label: "Grandmaster", icon: "🪽", minHours: 1500 },
  { id: "immortal", label: "Immortal", icon: "🪽", minHours: 2000 },
];

export function hierarchyForActiveSeconds(activeSeconds: number): PlayerHierarchy {
  const hours = Math.max(0, Number(activeSeconds) || 0) / 3600;
  let current = PLAYER_HIERARCHY[0];
  for (const tier of PLAYER_HIERARCHY) {
    if (hours >= tier.minHours) current = tier;
    else break;
  }
  return current;
}

export function hierarchyHours(activeSeconds: number): number {
  return Math.max(0, Number(activeSeconds) || 0) / 3600;
}
