"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/layout/BottomNav";

interface Entry {
  name: string;
  wins: number;
  gamesPlayed: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/economy/leaderboard")
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.leaderboard);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 p-6 pb-24 flex flex-col items-center gap-4">
      <h1 className="text-white text-2xl font-bold">🏆 Leaderboard</h1>

      {loading && <p className="text-slate-400">Loading...</p>}

      {!loading && entries.length === 0 && (
        <p className="text-slate-400">No games played yet — be the first!</p>
      )}

      <div className="w-full max-w-md flex flex-col gap-2">
        {entries.map((entry, i) => (
          <div key={i} className="bg-slate-800 rounded-lg p-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-bold w-6">{i + 1}</span>
              <span className="text-white font-semibold">{entry.name}</span>
            </div>
            <div className="text-emerald-400 text-sm">
              {entry.wins} wins · {entry.gamesPlayed} played
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}