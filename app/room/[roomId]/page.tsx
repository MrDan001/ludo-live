"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useMultiplayerGame } from "@/lib/hooks/useMultiplayerGame";
import { useAuth } from "@/lib/hooks/useAuth";
import Board from "@/components/board/Board";
import Dice from "@/components/board/Dice";
import PlayerBadge from "@/components/layout/PlayerBadge";
import VoiceControls from "@/components/layout/VoiceControls";

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

  if (!room) {
    return (
      <div className="h-[100dvh] w-screen overflow-hidden bg-[#1D110C] p-8 text-amber-100 flex items-center justify-center select-none font-sans">
        Joining room {roomId}...
      </div>
    );
  }

  if (!room.started) {
    return (
      <div className="h-[100dvh] w-screen overflow-hidden touch-none select-none bg-[#1D110C] flex flex-col items-center justify-center gap-4 p-6 fixed inset-0 font-sans">
        <h1 className="text-amber-100 text-2xl font-bold">Room {room.id}</h1>
        <p className="text-amber-200/80">
          Players: {room.players.map((p) => `${p.name} (${p.color})`).join(", ")}
        </p>
        <button
          onClick={() => startGame(room.id)}
          disabled={room.players.length < 2}
          className="px-6 py-3 rounded-lg bg-amber-800 text-amber-100 font-semibold disabled:opacity-40 hover:bg-amber-700 transition-colors shadow-lg"
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

  // Map top (RED, GREEN) and bottom (BLUE, YELLOW) players
  const redPlayer = room.players.find((p) => p.color === "RED");
  const greenPlayer = room.players.find((p) => p.color === "GREEN");
  const bluePlayer = room.players.find((p) => p.color === "BLUE");
  const yellowPlayer = room.players.find((p) => p.color === "YELLOW");

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden touch-none select-none bg-[#1D110C] flex flex-col items-center justify-between p-2 font-sans">
      {/* Top Header */}
      <div className="w-full max-w-[min(94vw,440px)] flex items-center justify-between px-1 pt-1 shrink-0">
        <button className="text-amber-200 text-xl p-1">☰</button>

        <div className="flex items-center gap-1.5 bg-[#3B2319] border border-amber-900/60 px-3 py-1 rounded-full shadow-inner">
          <span className="text-blue-400 text-xs">💎</span>
          <span className="text-amber-100 text-xs font-bold">{gems ?? 0}</span>
          <button className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold leading-none ml-0.5">
            +
          </button>
        </div>
      </div>

      {gameState.winner && (
        <div className="text-amber-400 font-bold text-sm shrink-0 my-0.5 animate-bounce">
          🏆 {gameState.winner} wins!
        </div>
      )}

      {/* Main Board Unit with Striped Wood Plank Gradient */}
      <div 
        className="w-full max-w-[min(94vw,440px)] border-[6px] border-[#2C1810] shadow-[0_10px_25px_rgba(0,0,0,0.7)] rounded-3xl p-2.5 flex flex-col items-center shrink my-auto relative"
        style={{
          backgroundColor: "#4E2E1E",
          backgroundImage: `
            linear-gradient(90deg, 
              rgba(0, 0, 0, 0.15) 0%, 
              transparent 2%, 
              transparent 48%, 
              rgba(0, 0, 0, 0.15) 50%, 
              transparent 52%, 
              transparent 98%, 
              rgba(0, 0, 0, 0.15) 100%
            ),
            repeating-linear-gradient(
              0deg,
              #4E2E1E,
              #4E2E1E 24px,
              #3D2316 24px,
              #3D2316 26px,
              #5C3724 26px,
              #5C3724 50px,
              #3D2316 50px,
              #3D2316 52px
            )
          `
        }}
      >
        {/* Top Player Badges */}
        <div className="w-full flex items-center justify-between px-1 mb-2 shrink-0">
          <PlayerBadge
            name={redPlayer?.name ?? ""}
            color="RED"
            isCurrentTurn={gameState.currentTurnColor === "RED"}
            connected={redPlayer?.connected ?? false}
            avatarUrl={redPlayer?.avatarUrl}
            empty={!redPlayer}
          />
          <PlayerBadge
            name={greenPlayer?.name ?? ""}
            color="GREEN"
            isCurrentTurn={gameState.currentTurnColor === "GREEN"}
            connected={greenPlayer?.connected ?? false}
            avatarUrl={greenPlayer?.avatarUrl}
            empty={!greenPlayer}
          />
        </div>

        {/* Playable Ludo Board Grid */}
        <div className="relative w-full aspect-square rounded-xl overflow-hidden border-2 border-[#2C1810] shrink shadow-2xl">
          <Board
            players={gameState.players}
            selectableTokenIds={selectableTokenIds}
            onTokenClick={(tokenId) => selectMove(room.id, tokenId)}
          />
        </div>

        {/* Bottom Player Badges */}
        <div className="w-full flex items-center justify-between px-1 mt-2 shrink-0">
          <PlayerBadge
            name={bluePlayer?.name ?? ""}
            color="BLUE"
            isCurrentTurn={gameState.currentTurnColor === "BLUE"}
            connected={bluePlayer?.connected ?? false}
            avatarUrl={bluePlayer?.avatarUrl}
            empty={!bluePlayer}
          />
          <PlayerBadge
            name={yellowPlayer?.name ?? ""}
            color="YELLOW"
            isCurrentTurn={gameState.currentTurnColor === "YELLOW"}
            connected={yellowPlayer?.connected ?? false}
            avatarUrl={yellowPlayer?.avatarUrl}
            empty={!yellowPlayer}
          />
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="w-full max-w-[min(94vw,440px)] px-1 pb-1 flex items-center justify-between shrink-0">
        {/* Left Voice & Chat Controls */}
        <div className="flex items-center gap-2">
          <VoiceControls roomId={room.id} enabled={room.started} />
          <button className="w-9 h-9 rounded-full bg-[#3B2319] border border-amber-900/80 text-amber-200 flex items-center justify-center text-sm shadow-md active:scale-95 transition-transform">
            💬
          </button>
        </div>

        {/* Dice Holder */}
        <div className="bg-[#3B2319] border border-amber-900/80 p-1.5 rounded-xl shadow-xl flex items-center justify-center">
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