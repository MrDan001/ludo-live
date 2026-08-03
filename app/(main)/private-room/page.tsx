"use client";

import { useEffect } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMultiplayerGame } from "@/lib/hooks/useMultiplayerGame";
import { useAuth } from "@/lib/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";

export default function PrivateRoomPage() {
  const router = useRouter();
  const { connect, createRoom, joinRoom, room, error } = useMultiplayerGame();
  const { user, dbUserId, avatarUrl, checkSession } = useAuth();
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    checkSession();
    connect();
  }, [checkSession, connect]);

  useEffect(() => {
    if (room) router.push(`/room/${room.id}`);
  }, [room, router]);

  const displayName = user?.email?.split("@")[0] || "PlayerOne";
  const ready = !!dbUserId;

  return (
    <div className="min-h-screen bg-slate-900 pb-20 flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-white text-2xl font-bold">Private Room</h1>

      {!ready && <p className="text-slate-400 text-sm">Connecting...</p>}

      <button
        onClick={() => dbUserId && createRoom(displayName, dbUserId, avatarUrl || undefined)}
        disabled={!ready}
        className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold w-64 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Create Room
      </button>

      <div className="flex gap-2 w-64">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Room code"
          className="px-4 py-2 rounded-lg flex-1 bg-white text-slate-900 placeholder-slate-400 border border-slate-300"
        />
        <button
          onClick={() => dbUserId && joinRoom(joinCode, displayName, dbUserId, avatarUrl || undefined)}
          disabled={!ready}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Join
        </button>
      </div>

      {error && <p className="text-red-400">{error}</p>}

      <BottomNav />
    </div>
  );
}