"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { useMultiplayerGame } from "@/lib/hooks/useMultiplayerGame";

const AVATAR_BG: Record<string, string> = {
  RED: "#ef4444",
  GREEN: "#10b981",
  YELLOW: "#eab308",
  BLUE: "#3b82f6",
};

// Shown instead of the normal RoomLobby for a tournament match room. There
// is nothing to configure here - bet, mode, and who's invited were all
// decided the moment the tournament filled - so this just shows who's
// already connected while the rest of the paid entrants arrive. The room
// starts itself the instant the last one connects (see
// createOrJoinTournamentRoom); this screen never has a manual start button.
export default function TournamentWaitingRoom() {
  const router = useRouter();
  const { room, kickedMessage, clearKicked } = useMultiplayerGame();

  useEffect(() => {
    if (!kickedMessage) return;
    clearKicked();
    router.push("/events");
  }, [kickedMessage, clearKicked, router]);

  if (!room) return null;

  const expected = room.tournamentMaxPlayers ?? room.players.length;
  const seats = Array.from({ length: expected }, (_, i) => room.players[i] ?? null);

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden touch-none select-none bg-[#0B1020] flex flex-col items-center justify-center p-6 font-sans gap-6">
      <div className="flex flex-col items-center gap-2">
        <Trophy size={32} className="text-amber-400" />
        <h1 className="text-white text-lg font-bold">Tournament Match</h1>
        <p className="text-slate-400 text-sm text-center">
          Waiting for every entrant to connect - the match starts the instant everyone&apos;s in.
        </p>
      </div>

      <div className="w-full max-w-sm grid grid-cols-2 gap-3">
        {seats.map((player, i) => (
          <div
            key={player?.socketId ?? `empty-${i}`}
            className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-3"
          >
            <div
              className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: player ? AVATAR_BG[player.color] ?? "#64748b" : "#334155" }}
            >
              {player ? (
                player.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  player.name.charAt(0).toUpperCase()
                )
              ) : (
                <span className="text-slate-500 text-xs">···</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {player ? (
                <div className="text-white text-sm font-semibold truncate">{player.name}</div>
              ) : (
                <div className="text-slate-500 text-sm">Waiting...</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="text-slate-500 text-xs">
        {room.players.length}/{expected} connected
      </div>
    </div>
  );
}