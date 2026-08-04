"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useEconomy } from "@/lib/hooks/useEconomy";
import BottomNav from "@/components/layout/BottomNav";

const SPECIAL_ICONS: Record<number, string> = {
  1: "💰",
  7: "🎁",
};

function iconFor(day: number, gems: number): string {
  if (SPECIAL_ICONS[day]) return SPECIAL_ICONS[day];
  return gems > 0 ? "💎" : "🪙";
}

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "now";
  const hours = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default function DailyRewardPage() {
  const router = useRouter();
  const { dbUserId, refreshWallet } = useAuth();
  const { status, loadingStatus, claiming, fetchStatus, claimDailyReward } = useEconomy();
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Hydrate real status from the server on load - this is what makes
  // "already claimed" survive a refresh instead of resetting every time.
  useEffect(() => {
    if (dbUserId) fetchStatus(dbUserId);
  }, [dbUserId, fetchStatus]);

  // Keep the "back in Xh Ym" countdown accurate without a full refetch.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  async function handleClaim() {
    if (!dbUserId) return;
    await claimDailyReward(dbUserId);
    const result = useEconomy.getState().claimResult;
    if (result?.claimed) {
      const gemsPart = result.gems ? ` + ${result.gems} gems` : "";
      setMessage(`+${result.coins ?? 0} coins${gemsPart} claimed! (Day ${result.day}, ${result.streak}-day streak)`);
      refreshWallet();
    } else {
      setMessage("Already claimed today — come back tomorrow!");
    }
  }

  const rewards = status?.rewards ?? [];
  const currentDay = status?.currentDay ?? 1;
  const claimedToday = status?.claimedToday ?? false;
  const nextAvailableMs = status?.nextAvailable ? new Date(status.nextAvailable).getTime() : null;
  const countdown = nextAvailableMs ? formatCountdown(nextAvailableMs - now) : null;

  const firstSix = rewards.filter((r) => r.day <= 6);
  const day7 = rewards.find((r) => r.day === 7);

  return (
    <div className="min-h-screen bg-slate-950 pb-24 flex flex-col items-center gap-4 p-4">
      <div className="w-full flex items-center max-w-sm">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
      </div>

      <h1 className="text-amber-400 text-2xl font-extrabold text-center tracking-wide">
        DAILY REWARD
      </h1>
      <p className="text-slate-400 text-sm text-center -mt-2">
        Login everyday and win rewards!
      </p>

      <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
        {firstSix.map((r) => {
          const isClaimed = claimedToday ? r.day <= currentDay : r.day < currentDay;
          const isCurrent = r.day === currentDay;
          return (
            <div
              key={r.day}
              className={[
                "relative rounded-xl p-3 flex flex-col items-center gap-1 border transition-colors",
                isCurrent ? "bg-emerald-900/40 border-emerald-500" : "bg-slate-800 border-slate-700",
                isClaimed && !isCurrent ? "opacity-50" : "",
              ].join(" ")}
            >
              {isClaimed && <span className="absolute top-1 right-1.5 text-emerald-400 text-xs">✓</span>}
              <span className="text-slate-300 text-xs">Day {r.day}</span>
              <span className="text-2xl">{iconFor(r.day, r.gems)}</span>
              <span className="text-white text-sm font-semibold">
                {r.gems > 0 ? `${r.gems} gems` : r.coins.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {day7 && (
        <div
          className={[
            "relative w-full max-w-sm rounded-xl p-4 flex items-center justify-between border transition-colors",
            currentDay === 7
              ? "bg-gradient-to-r from-amber-500 to-amber-700 border-amber-400"
              : "bg-slate-800 border-slate-700",
          ].join(" ")}
        >
          {claimedToday && currentDay === 7 && (
            <span className="absolute top-2 right-3 text-emerald-300 text-xs">✓</span>
          )}
          <div>
            <span className="text-amber-100 text-xs">Day 7</span>
            <div className="text-white font-bold text-lg">
              {day7.coins.toLocaleString()} + Gems {day7.gems}
            </div>
          </div>
          <span className="text-3xl">🎁</span>
        </div>
      )}

      <button
        onClick={handleClaim}
        disabled={claiming || claimedToday || loadingStatus}
        className="w-full max-w-sm bg-emerald-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 mt-1"
      >
        {claiming
          ? "Claiming..."
          : claimedToday
          ? countdown
            ? `Back in ${countdown}`
            : "Already claimed"
          : "CLAIM"}
      </button>

      {message && <p className="text-slate-300 text-sm text-center">{message}</p>}

      <BottomNav />
    </div>
  );
}