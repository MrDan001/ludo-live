"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useEconomy } from "@/lib/hooks/useEconomy";
import BottomNav from "@/components/layout/BottomNav";

const DAYS = [
  { day: 1, icon: "💰", label: "1,000" },
  { day: 2, icon: "🪙", label: "1,500" },
  { day: 3, icon: "💎", label: "5" },
  { day: 4, icon: "🪙", label: "2,000" },
  { day: 5, icon: "💎", label: "10" },
  { day: 6, icon: "🪙", label: "3,000" },
];

export default function DailyRewardPage() {
  const router = useRouter();
  const { dbUserId, refreshWallet } = useAuth();
  const { claiming, claimDailyReward } = useEconomy();
  const [message, setMessage] = useState<string | null>(null);

  async function handleClaim() {
    if (!dbUserId) return;
    await claimDailyReward(dbUserId);
    const result = useEconomy.getState().claimResult;
    if (result?.claimed) {
      setMessage(`+${result.amount} coins claimed! (${result.streak}-day streak)`);
      refreshWallet();
    } else {
      setMessage("Already claimed today — come back tomorrow!");
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24 flex flex-col items-center gap-4 p-4">
      <div className="w-full flex items-center">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
      </div>

      <h1 className="text-amber-400 text-2xl font-extrabold text-center">DAILY REWARD</h1>
      <p className="text-slate-400 text-sm text-center">Login everyday and win rewards!</p>

      <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
        {DAYS.map((d) => (
          <div key={d.day} className="bg-slate-800 rounded-xl p-3 flex flex-col items-center gap-1">
            <span className="text-slate-400 text-xs">Day {d.day}</span>
            <span className="text-2xl">{d.icon}</span>
            <span className="text-white text-sm font-semibold">{d.label}</span>
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm bg-gradient-to-r from-amber-600 to-amber-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <span className="text-slate-200 text-xs">Day 7</span>
          <div className="text-white font-bold">5,000 + Gems 20</div>
        </div>
        <span className="text-3xl">🎁</span>
      </div>

      <button
        onClick={handleClaim}
        disabled={claiming}
        className="w-full max-w-sm bg-emerald-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
      >
        {claiming ? "Claiming..." : "CLAIM"}
      </button>

      {message && <p className="text-slate-300 text-sm text-center">{message}</p>}

      <BottomNav />
    </div>
  );
}