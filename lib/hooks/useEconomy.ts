"use client";

import { create } from "zustand";

interface EconomyStore {
  claiming: boolean;
  claimResult: { claimed: boolean; amount?: number; streak?: number; nextAvailable?: string } | null;
  claimDailyReward: (userId: string) => Promise<void>;
}

export const useEconomy = create<EconomyStore>((set) => ({
  claiming: false,
  claimResult: null,

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
    } catch {
      set({ claiming: false });
    }
  },
}));