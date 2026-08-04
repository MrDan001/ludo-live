"use client";

import { useState } from "react";
import { useEconomy } from "@/lib/hooks/useEconomy";

interface DailyRewardCardProps {
  userId: string;
}

export default function DailyRewardCard({ userId }: DailyRewardCardProps) {
  const { claiming, claimDailyReward } = useEconomy();
  const [message, setMessage] = useState<string | null>(null);

  async function handleClaim() {
    await claimDailyReward(userId);
    const result = useEconomy.getState().claimResult;

    if (result?.claimed) {
      // Check which currency was awarded today
      const rewardText = result.coins
        ? `+${result.coins} coins!`
        : result.gems
        ? `+${result.gems} gems!`
        : "Daily reward claimed!";

      setMessage(`${rewardText} (${result.streak ?? 1}-day streak)`);
    } else {
      setMessage("Already claimed today — come back later!");
    }
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4 flex flex-col items-center gap-2 w-full max-w-xs">
      <div className="text-4xl">🎁</div>
      <div className="text-white font-semibold">Daily Reward</div>
      <button
        onClick={handleClaim}
        disabled={claiming}
        className="px-4 py-2 bg-amber-500 text-slate-900 font-bold rounded-lg disabled:opacity-50"
      >
        {claiming ? "Claiming..." : "Claim Now"}
      </button>
      {message && <p className="text-slate-300 text-sm text-center">{message}</p>}
    </div>
  );
}