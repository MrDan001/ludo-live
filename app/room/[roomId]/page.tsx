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

// Position badges tightly inside the 4 corner bases of the board
const CORNER_POSITIONS: Record<PlayerColor, string> = {
  RED: "top-1 left-1",
  GREEN: "top-1 right-1",
  BLUE: "bottom-1 left-1",
  YELLOW: "bottom-1 right-1",
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

  if (!room) return <div className="h-[100dvh] w-screen overflow-hidden bg-[#2D3748] p-8 text-white flex items-center justify-center select-none">Joining room {roomId}...</div>;

  if (!room.started) {
    return (
      <div className="h-[100dvh] w-screen overflow-hidden touch-none select-none bg-[#2D3748] flex flex-col items-center justify-center gap-4 p-6 fixed inset-0">
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
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden touch-none select-none bg-[#0B132B] flex flex-col items-center justify-between pt-2 pb-4 px-3 font-sans">
      {/* Top Header */}
      <div className="w-full max-w-[340px] flex items-center justify-between px-1 shrink-0">
        <button className="text-gray-300 text-xl p-1">☰</button>

        <div className="flex items-center gap-1.5 bg-[#1C2541] border border-slate-700/60 px-3 py-1 rounded-full shadow-inner">
          <span className="text-blue-400 text-xs">💎</span>
          <span className="text-white text-xs font-bold">{gems ?? 0}</span>
          <button className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold leading-none ml-0.5">
            +
          </button>
        </div>
      </div>

      {gameState.winner && (
        <div className="text-amber-400 font-bold text-sm shrink-0 my-0.5 animate-bounce">
          🏆 {gameState.winner} wins!
        </div>
      )}

      {/* Main Board Container */}
      <div className="w-full max-w-[320px] my-auto px-1 flex flex-col items-center justify-center shrink">
        <div className="relative w-full aspect-square bg-[#1C2541] border-[4px] border-[#0B132B] shadow-2xl rounded-2xl flex items-center justify-center p-1 overflow-hidden">
          
          {/* Corner Player Badges */}
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

          {/* Ludo Grid Board */}
          <div className="w-full h-full relative z-10 rounded-lg overflow-hidden border border-slate-800">
            <Board
              players={gameState.players}
              selectableTokenIds={selectableTokenIds}
              onTokenClick={(tokenId) => selectMove(room.id, tokenId)}
            />
          </div>
        </div>
      </div>

      {/* Bottom Controls Bar (Lifted for Mobile Viewports) */}
      <div className="w-full max-w-[340px] px-1 pb-3 flex items-center justify-between shrink-0 mb-1">
        {/* Left Voice & Chat Controls */}
        <div className="flex items-center gap-2">
          <VoiceControls roomId={room.id} enabled={room.started} />
          <button className="w-9 h-9 rounded-full bg-[#1C2541] border border-slate-700 text-gray-300 flex items-center justify-center text-sm shadow-md active:scale-95 transition-transform">
            💬
          </button>
        </div>

        {/* Dice Holder */}
        <div className="bg-[#1C2541] border border-slate-700/80 p-1.5 rounded-xl shadow-xl flex items-center justify-center">
          <Dice
            d1={room.pendingRoll?.d1 ?? null}
            d2={room.pendingRoll?.d2 ?? null}
            rollSeq={rollSeq}
            onRoll={() => roll(room.id)}
            canRoll={isYourTurn && !room.pendingRoll && !gameState.winner}
          />
        </div>
      </div>
    </div>
  );
}