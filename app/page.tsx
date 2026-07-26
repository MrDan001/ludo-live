"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMultiplayerGame } from "@/lib/hooks/useMultiplayerGame";

export default function LandingPage() {
  const router = useRouter();
  const { connect, createRoom, joinRoom, room, error } = useMultiplayerGame();
  const [name, setName] = useState("Player");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (room) router.push(`/room/${room.id}`);
  }, [room, router]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-white text-3xl font-bold">Ludo Live</h1>

      <input
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="Your name"
  className="px-4 py-2 rounded-lg w-64 bg-white text-slate-900 placeholder-slate-400 border border-slate-300"
/>

      <button
        onClick={() => createRoom(name)}
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
          onClick={() => joinRoom(joinCode, name)}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold"
        >
          Join
        </button>
      </div>

      {error && <p className="text-red-400">{error}</p>}
    </div>
  );
}