"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useMultiplayerGame } from "@/lib/hooks/useMultiplayerGame";
import { useAuth } from "@/lib/hooks/useAuth";
import Board from "@/components/board/Board";
import Dice from "@/components/board/Dice";
import PlayerBadge from "@/components/layout/PlayerBadge";
import VoiceControls from "@/components/layout/VoiceControls";
import { PlayerColor, ALL_COLORS } from "@/lib/engine";

const CORNER_POSITIONS: Record<PlayerColor, string> = {
  RED: "top-2 left-2",
  GREEN: "top-2 right-2",
  BLUE: "bottom-2 left-2",
  YELLOW: "bottom-2 right-2",
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

  // Prevent accidental page refreshes / closing tab during game
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  if (!room) return <div className="h-screen w-screen overflow-hidden bg-slate-950 p-8 text-white flex items-center justify-center select-none">Joining room {roomId}...</div>;

  if (!room.started) {
    return (
      <div className="h-screen w-screen overflow-hidden touch-none select-none bg-slate-950 flex flex-col items-center justify-center gap-4 p-6 fixed inset-0">
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
    <div className="fixed inset-0 h-screen w-screen overflow-hidden touch-none select-none bg-slate-950 flex flex-col items-center justify-between py-3 px-4">
      {/* Top bar */}
      <div className="w-full max-w-[600px] mx-auto flex items-center justify-between px-2 py-1 shrink-0">
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
        <div className="text-amber-400 font-bold text-lg shrink-0">🏆 {gameState.winner} wins!</div>
      )}

      {/* Main Board Container Carrying Badges + Ludo Grid */}
      <div className="relative w-full max-w-[540px] aspect-square mx-auto flex items-center justify-center shrink p-10 bg-slate-900 border-[10px] border-slate-800 shadow-2xl rounded-3xl">
        {/* Corner player badges resting on the physical board panel */}
        {ALL_COLORS.map((color) => {
          const player = room.players.find((p) => p.color === color);
          return (
            <div key={color} className={`absolute z-30 ${CORNER_POSITIONS[color]}`}>
              {player ? (
                <PlayerBadge
                  name={player.name}
                  color={player.color}
                  isCurrentTurn={gameState.currentTurnColor === player.color}
                  connected={player.connected}
                  avatarUrl={player.avatarUrl}
                />
              ) : (
                <PlayerBadge name="" color={color} isCurrentTurn={false} connected={false} empty />
              )}
            </div>
          );
        })}

        {/* The core Ludo grid nested safely inside the frame */}
        <div className="w-full h-full relative z-10">
          <Board
            players={gameState.players}
            selectableTokenIds={selectableTokenIds}
            onTokenClick={(tokenId) => selectMove(room.id, tokenId)}
          />
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="w-full max-w-[600px] px-2 flex items-center justify-between shrink-0">
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