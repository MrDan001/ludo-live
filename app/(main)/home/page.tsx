"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMultiplayerGame } from "@/lib/hooks/useMultiplayerGame";
import { useAuth } from "@/lib/hooks/useAuth";

export default function HomePage() {
  const router = useRouter();
  const { connect, createRoom, joinRoom, room, error } = useMultiplayerGame();
  const { user, checkSession, signOut } = useAuth();
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

  const displayName = user?.email || "Guest Player";

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-white text-3xl font-bold">Ludo Live</h1>
      <p className="text-slate-400 text-sm">Welcome, {displayName}</p>

      <button
        onClick={() => createRoom(displayName)}
        className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold w-64"
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
          onClick={() => joinRoom(joinCode, displayName)}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold"
        >
          Join
        </button>
      </div>

      {error && <p className="text-red-400">{error}</p>}

      <button onClick={signOut} className="text-slate-500 text-sm underline mt-4">
        Sign out
      </button>
    </div>
  );
}