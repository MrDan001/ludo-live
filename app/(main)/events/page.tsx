"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";

interface Tournament {
  id: string;
  name: string;
  entryFee: number;
  prizePool: number;
  maxPlayers: number;
  playerCount: number;
  status: string;
}

export default function EventsPage() {
  const { dbUserId, coins, refreshWallet } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadTournaments = useCallback(() => {
    fetch("/api/tournaments?status=open")
      .then((res) => res.json())
      .then((data) => setTournaments(data.tournaments ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  async function handleJoin(tournament: Tournament) {
    if (!dbUserId) {
      setMessage("Sign in to join a tournament.");
      return;
    }
    if (coins < tournament.entryFee) {
      setMessage(`You need ${tournament.entryFee.toLocaleString()} coins to join this one.`);
      return;
    }

    setJoiningId(tournament.id);
    setMessage(null);

    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: dbUserId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error ?? "Could not join tournament.");
        return;
      }

      await refreshWallet();
      loadTournaments();
      setMessage(`You're in! Prize pool is now ${data.tournament.prizePool.toLocaleString()} coins.`);
    } catch {
      setMessage("Could not join tournament. Try again.");
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 pb-24 flex flex-col items-center gap-4">
      <div className="w-full max-w-md flex items-center justify-between">
        <h1 className="text-white text-2xl font-bold">🏆 Tournaments</h1>
        <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-full">
          <span>🪙</span>
          <span className="text-white text-sm font-semibold">{coins.toLocaleString()}</span>
        </div>
      </div>

      <p className="w-full max-w-md text-slate-500 text-xs -mt-2">
        Entry fees and prizes are paid in coins only — coins can&apos;t be withdrawn or
        exchanged for cash.
      </p>

      {message && (
        <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200">
          {message}
        </div>
      )}

      {loading && <p className="text-slate-400">Loading tournaments...</p>}

      {!loading && tournaments.length === 0 && (
        <p className="text-slate-400">No open tournaments right now — check back soon.</p>
      )}

      <div className="w-full max-w-md flex flex-col gap-3">
        {tournaments.map((t) => {
          const isFull = t.playerCount >= t.maxPlayers;
          const canAfford = coins >= t.entryFee;
          const disabled = isFull || !canAfford || joiningId === t.id;

          return (
            <div key={t.id} className="bg-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold">{t.name}</span>
                <span className="text-xs text-slate-400">
                  {t.playerCount}/{t.maxPlayers} players
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-slate-300">
                  <span>🪙</span>
                  <span>Entry: {t.entryFee.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-amber-400 font-semibold">
                  <span>🏆</span>
                  <span>Pot: {t.prizePool.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => handleJoin(t)}
                disabled={disabled}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                  disabled
                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {isFull
                  ? "Full"
                  : joiningId === t.id
                  ? "Joining..."
                  : !canAfford
                  ? "Not enough coins"
                  : "Join Tournament"}
              </button>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}