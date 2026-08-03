"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useMultiplayerGame } from "@/lib/hooks/useMultiplayerGame";
import { useAuth } from "@/lib/hooks/useAuth";
import Board from "@/components/board/Board";
import Dice from "@/components/board/Dice";
import PlayerBadge from "@/components/layout/PlayerBadge";
import VoiceControls from "@/components/layout/VoiceControls";
import { PlayerColor } from "@/lib/engine";

const CORNER_POSITIONS: Record<PlayerColor, string> = {
  RED: "-top-3 -left-2",
  GREEN: "-top-3 -right-2",
  BLUE: "-bottom-3 -left-2",
  YELLOW: "-bottom-3 -right-2",
};

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { room, yourColor, connect, startGame, roll, selectMove, rollSeq } = useMultiplayerGame();
  const { gems, checkSession } = useAuth();

  useEffect(() => {
    checkSession();
    connect();
  }, [checkSession, connect]);

  if (!room) return <div className="p-8 text-white">Joining room {roomId}...</div>;

  if (!room.started) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-white text-2xl font-bold">Room {room.id}</h1>
        <p className="text-white">Players: {room.players.map((p) => `${p.name} (${p.color})`).join(", ")}</p>
        <button
          onClick={() => startGame(room.id)}
          disabled={room.players.length < 2}
          className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-40"
        >
          Start Game ({room.players.length}/4)
        </button>
      </div>
    );
  }

  const gameState = room.gameState!;
  const isYourTurn = gameState.currentTurnColor === yourColor;
  const selectableTokenIds = new Set(isYourTurn ? room.pendingMoves.map((m) => m.tokenId) : []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center pb-4">
      {/* Top bar */}
      <div className="w-full flex items-center justify-between px-4 py-3">
        <button className="text-white text-xl">☰</button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-full">
            <span>💎</span>
            <span className="text-white text-sm font-semibold">{gems}</span>
          </div>
          <button className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-lg font-bold">
            +
          </button>
        </div>
      </div>

      {gameState.winner && (
        <div className="text-amber-400 font-bold text-lg mb-2">🏆 {gameState.winner} wins!</div>
      )}

      {/* Board with corner player badges */}
      <div className="relative w-full max-w-[600px] mx-auto mt-2">
        {room.players.map((player) => (
          <div key={player.color} className={`absolute z-10 ${CORNER_POSITIONS[player.color]}`}>
            <PlayerBadge
              name={player.name}
              color={player.color}
              isCurrentTurn={gameState.currentTurnColor === player.color}
              connected={player.connected}
            />
          </div>
        ))}

        <Board
          players={gameState.players}
          selectableTokenIds={selectableTokenIds}
          onTokenClick={(tokenId) => selectMove(room.id, tokenId)}
        />
      </div>

      {/* Bottom control bar */}
      <div className="w-full max-w-[600px] mt-4 px-4 flex items-center justify-between">
        <VoiceControls roomId={room.id} enabled={room.started} />

        <button className="w-11 h-11 rounded-full bg-slate-800 text-white flex items-center justify-center text-lg">
          💬
        </button>

        <Dice
          d1={room.pendingRoll?.d1 ?? null}
          d2={room.pendingRoll?.d2 ?? null}
          rollSeq={rollSeq}
          onRoll={() => roll(room.id)}
          canRoll={isYourTurn && !room.pendingRoll && !gameState.winner}
        />
      </div>
    </div>
  );
}