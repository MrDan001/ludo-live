"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMultiplayerGame } from "@/lib/hooks/useMultiplayerGame";
import { useAuth } from "@/lib/hooks/useAuth";
import HomeHeader from "@/components/layout/HomeHeader";
import BottomNav from "@/components/layout/BottomNav";
import FriendsSidebar from "@/components/layout/FriendsSidebar";
import StarterPackCard from "@/components/layout/StarterPackCard";
import DailyRewardCard from "@/components/layout/DailyRewardCard";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const { connect, createRoom, joinRoom, room, error } = useMultiplayerGame();
  const { user, dbUserId, coins, gems, checkSession, signOut } = useAuth();
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    checkSession();
    connect();
  }, [checkSession, connect]);

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  useEffect(() => {
    if (room) router.push(`/room/${room.id}`);
  }, [room, router]);

  const displayName = user?.email?.split("@")[0] || "Guest Player";

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <HomeHeader name={displayName} coins={coins} gems={gems} />

      <div className="flex flex-col items-center gap-4 p-4">
        <h1 className="text-white text-2xl font-bold mt-2">
          LUDO <span className="text-emerald-400">LIVE</span>
        </h1>

        <div className="grid grid-cols-1 gap-3 w-full max-w-xs">
          <button
            onClick={() => dbUserId && createRoom(displayName, dbUserId)}
            className="py-3 rounded-lg bg-emerald-600 text-white font-semibold"
          >
            🌍 Play Online
          </button>
          <button
            onClick={() => dbUserId && createRoom(displayName, dbUserId)}
            className="py-3 rounded-lg bg-amber-500 text-slate-900 font-semibold"
          >
            👥 Play with Friends
          </button>
          <Link
            href="/play"
            className="py-3 rounded-lg bg-blue-600 text-white font-semibold text-center"
          >
            🤖 Play with AI
          </Link>
        </div>

        <div className="flex gap-2 w-full max-w-xs">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Room code"
            className="px-4 py-2 rounded-lg flex-1 bg-white text-slate-900 placeholder-slate-400 border border-slate-300"
          />
          <button
            onClick={() => dbUserId && joinRoom(joinCode, displayName, dbUserId)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold"
          >
            Join
          </button>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {dbUserId && <DailyRewardCard userId={dbUserId} />}
        <StarterPackCard />
        <FriendsSidebar />

        <button onClick={signOut} className="text-slate-500 text-sm underline mt-2">
          Sign out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}