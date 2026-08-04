"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMultiplayerGame } from "@/lib/hooks/useMultiplayerGame";
import { useAuth } from "@/lib/hooks/useAuth";
import HomeHeader from "@/components/layout/HomeHeader";
import BottomNav from "@/components/layout/BottomNav";
import ActionCard from "@/components/layout/ActionCard";
import QuickActionsRow from "@/components/layout/QuickActionsRow";

export default function HomePage() {
  const router = useRouter();
  const { connect, createRoom, room } = useMultiplayerGame();
  const { user, dbUserId, name, coins, gems, checkSession } = useAuth();

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

  const displayName = name || user?.email?.split("@")[0] || "Player";

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <HomeHeader name={displayName} coins={coins} gems={gems} />

      <div className="flex flex-col items-center gap-3 px-4 mt-2">
        <ActionCard
          icon="🌍"
          title="Play Online"
          subtitle="Play with players around the world"
          gradient="bg-gradient-to-r from-emerald-500 to-emerald-700"
          href="/play-online"
        />
        <div onClick={() => dbUserId && createRoom(displayName, dbUserId)} className="w-full">
          <ActionCard
            icon="👨‍👩‍👧"
            title="Play with Friends"
            subtitle="Invite friends & play together"
            gradient="bg-gradient-to-r from-green-500 to-emerald-600"
            href="#"
          />
        </div>
        <ActionCard
          icon="🏠"
          title="Private Room"
          subtitle="Create or join private room"
          gradient="bg-gradient-to-r from-blue-500 to-indigo-600"
          href="/private-room"
        />
        <ActionCard
          icon="🏆"
          title="Tournament"
          subtitle="Join tournaments & win big"
          gradient="bg-gradient-to-r from-purple-600 to-fuchsia-700"
          href="/events"
        />

        <div className="mt-2">
          <QuickActionsRow />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}