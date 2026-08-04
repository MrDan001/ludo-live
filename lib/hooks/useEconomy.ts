"use client";

import { create } from "zustand";

interface RewardDay {
  day: number;
  coins: number;
  gems: number;
}

interface DailyRewardStatus {
  claimedToday: boolean;
  currentDay: number;
  streak: number;
  nextAvailable: string | null;
  rewards: RewardDay[];
}

interface EconomyStore {
  status: DailyRewardStatus | null;
  loadingStatus: boolean;
  claiming: boolean;
  claimResult: { claimed: boolean; day?: number; coins?: number; gems?: number; streak?: number; nextAvailable?: string } | null;

  fetchStatus: (userId: string) => Promise<void>;
  claimDailyReward: (userId: string) => Promise<void>;
}

export const useEconomy = create<EconomyStore>((set, get) => ({
  status: null,
  loadingStatus: false,
  claiming: false,
  claimResult: null,

  fetchStatus: async (userId) => {
    set({ loadingStatus: true });
    try {
      const res = await fetch(`/api/economy/daily-reward?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      set({ status: data, loadingStatus: false });
    } catch {
      set({ loadingStatus: false });
    }
  },

  claimDailyReward: async (userId) => {
    set({ claiming: true });
    try {
      const res = await fetch("/api/economy/daily-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      set({ claimResult: data, claiming: false });
      // Re-sync status from the server after claiming so the grid/button
      // reflect the real DB state immediately - not an optimistic guess.
      await get().fetchStatus(userId);
    } catch {
      set({ claiming: false });
    }
  },
}));