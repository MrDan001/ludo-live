export type PlayerProgress = {
  level: number;
  xp: number;
};

export type Badge = {
  id: string;
  label: string;
  icon: string;
  source: "spin" | "store" | "game" | "tournament";
};

export const PROGRESSION_VERSION = 2;
export const STARTING_COINS = 1000;
export const STARTING_GEMS = 10;

// XP needed to advance from level N to N+1.
// Level 0 -> 1 = 10 XP, level 1 -> 2 = 15 XP, level 2 -> 3 = 20 XP, etc.
export function xpRequiredForLevel(level: number): number {
  return 10 + Math.max(0, level) * 5;
}

export function readProgress(): PlayerProgress {
  if (typeof window === "undefined") return { level: 0, xp: 0 };
  try {
    const version = Number(localStorage.getItem("ludo-progression-version") || 0);
    if (version !== PROGRESSION_VERSION) {
      const fresh = { level: 0, xp: 0 };
      localStorage.setItem("ludo-progression", JSON.stringify(fresh));
      localStorage.setItem("ludo-progression-version", String(PROGRESSION_VERSION));
      return fresh;
    }
    const stored = JSON.parse(localStorage.getItem("ludo-progression") || "null");
    return {
      level: Math.max(0, Number(stored?.level) || 0),
      xp: Math.max(0, Number(stored?.xp) || 0),
    };
  } catch {
    return { level: 0, xp: 0 };
  }
}

export function writeProgress(progress: PlayerProgress) {
  if (typeof window === "undefined") return;
  const next = {
    level: Math.max(0, Math.floor(progress.level)),
    xp: Math.max(0, Math.floor(progress.xp)),
  };
  localStorage.setItem("ludo-progression", JSON.stringify(next));
  localStorage.setItem("ludo-progression-version", String(PROGRESSION_VERSION));
  window.dispatchEvent(new CustomEvent("ludo-progression-updated", { detail: next }));
}

export function addXP(amount: number): PlayerProgress {
  let next = readProgress();
  let remaining = Math.max(0, Math.floor(amount));
  while (remaining > 0) {
    const required = xpRequiredForLevel(next.level);
    const needed = required - next.xp;
    if (remaining < needed) {
      next = { ...next, xp: next.xp + remaining };
      remaining = 0;
    } else {
      remaining -= needed;
      next = { level: next.level + 1, xp: 0 };
    }
  }
  writeProgress(next);
  return next;
}

export function readBadges(): Badge[] {
  if (typeof window === "undefined") return [];
  try {
    const badges = JSON.parse(localStorage.getItem("ludo-badges") || "[]");
    return Array.isArray(badges) ? badges : [];
  } catch {
    return [];
  }
}

export function addBadge(badge: Badge): Badge[] {
  const badges = readBadges();
  if (!badges.some((item) => item.id === badge.id)) badges.push(badge);
  localStorage.setItem("ludo-badges", JSON.stringify(badges));
  window.dispatchEvent(new CustomEvent("ludo-badges-updated", { detail: badges }));
  return badges;
}

export function awardGameWinXP() {
  return addXP(10);
}

export function awardTournamentWinXP() {
  return addXP(20);
}

export function awardGemPurchaseXP() {
  return addXP(5);
}
