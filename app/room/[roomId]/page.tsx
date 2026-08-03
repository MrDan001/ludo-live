"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useMultiplayerGame } from "@/lib/hooks/useMultiplayerGame";
import Board from "@/components/board/Board";
import Dice from "@/components/board/Dice";
import VoiceControls from "@/components/layout/VoiceControls";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { room, yourColor, connect, startGame, roll, selectMove, rollSeq } = useMultiplayerGame();

  useEffect(() => {
    connect();
  }, [connect]);

  if (!room) return <div className="p-8 text-white">Joining room {roomId}...</div>;

  if (!room.started) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 p-6">
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
  const selectableTokenIds = new Set(
    isYourTurn ? room.pendingMoves.map((m) => m.tokenId) : []
  );

  return (
<div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center gap-6 p-6">
        <h1 className="text-white text-xl font-bold">Room {room.id}</h1>
      <div className="text-white">
        Turn: <span className="font-bold">{gameState.currentTurnColor}</span>
        {gameState.winner && <span className="ml-4 text-amber-400">🏆 {gameState.winner} wins!</span>}
      </div>

      <Board
        players={gameState.players}
        selectableTokenIds={selectableTokenIds}
        onTokenClick={(tokenId) => selectMove(room.id, tokenId)}
      />
      <VoiceControls roomId={room.id} enabled={room.started} />

      <Dice
        d1={room.pendingRoll?.d1 ?? null}
        d2={room.pendingRoll?.d2 ?? null}
        rollSeq={rollSeq}
        onRoll={() => roll(room.id)}
        canRoll={isYourTurn && !room.pendingRoll && !gameState.winner}
      />
    </div>
  );
}