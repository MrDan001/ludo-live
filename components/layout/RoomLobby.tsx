"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, Copy, Check, Plus, CheckCircle2, XCircle, Crown, HelpCircle, MessageCircle } from "lucide-react";
import { useMultiplayerGame } from "@/lib/hooks/useMultiplayerGame";
import VoiceControls from "./VoiceControls";

const AVATAR_BG: Record<string, string> = {
  RED: "#ef4444",
  GREEN: "#10b981",
  YELLOW: "#eab308",
  BLUE: "#3b82f6",
};

const BET_STEP = 50;

interface RoomLobbyProps {
  onOpenChat: () => void;
  onOpenVoice: () => void;
  chatUnreadCount: number;
}

export default function RoomLobby({ onOpenChat, onOpenVoice, chatUnreadCount }: RoomLobbyProps) {
  const router = useRouter();
  const { room, yourUserId, starting, error, clearError, toggleReady, setBetAmount, startGame } =
    useMultiplayerGame();
  const [copied, setCopied] = useState(false);
  const [showModeInfo, setShowModeInfo] = useState(false);

  if (!room) return null;

  const isHost = yourUserId === room.hostUserId;
  const you = room.players.find((p) => p.userId === yourUserId);
  const allReady = room.players.every((p) => p.ready);
  const canStart = isHost && room.players.length >= 2 && allReady && !starting;

  const handleCopy = () => {
    navigator.clipboard.writeText(room.id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleBetChange = (delta: number) => {
    if (!isHost || !yourUserId) return;
    const next = Math.max(0, room.betAmount + delta);
    setBetAmount(room.id, yourUserId, next);
  };

  // Slots always render 4 seats - filled ones show the real player, empty
  // ones show an inviteable "+" seat.
  const seats = Array.from({ length: 4 }, (_, i) => room.players[i] ?? null);

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden touch-none select-none bg-[#0B1020] flex flex-col items-center p-4 font-sans">
      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between shrink-0 mb-4">
        <button onClick={() => router.back()} aria-label="Leave room" className="text-slate-300 p-1">
          <ArrowLeft size={22} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-slate-400 text-xs">Room ID</span>
          <button onClick={handleCopy} className="flex items-center gap-1.5 active:scale-95 transition-transform">
            <span className="text-white font-bold tracking-widest text-base">{room.id}</span>
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-400" />}
          </button>
        </div>
        <button aria-label="Settings" className="text-slate-500 p-1 cursor-default">
          <Settings size={20} />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          onClick={clearError}
          className="w-full max-w-sm bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-lg px-3 py-2 mb-3 shrink-0"
        >
          {error}
        </div>
      )}

      {/* Player grid */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-3 mb-4">
        {seats.map((player, i) => {
          if (!player) {
            return (
              <button
                key={`empty-${i}`}
                onClick={handleCopy}
                className="flex items-center gap-3 bg-slate-900/60 border border-dashed border-slate-700 rounded-2xl p-3 active:scale-[0.98] transition-transform"
              >
                <div className="w-11 h-11 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 shrink-0">
                  <Plus size={18} />
                </div>
                <span className="text-slate-500 text-sm">Invite</span>
              </button>
            );
          }

          const isPlayerHost = player.userId === room.hostUserId;
          const isYou = player.userId === yourUserId;

          return (
            <div key={player.socketId} className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
              <div className="relative shrink-0">
                <div
                  className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: AVATAR_BG[player.color] ?? "#64748b" }}
                >
                  {player.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover" />
                  ) : (
                    player.name.charAt(0).toUpperCase()
                  )}
                </div>
                {isPlayerHost && (
                  <Crown size={14} className="absolute -top-1.5 -right-1 text-amber-400 fill-amber-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-white text-sm font-semibold truncate">
                  {player.name}
                  {isYou && <span className="text-slate-500 font-normal"> (You)</span>}
                </div>
                {isPlayerHost ? (
                  <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">👍 Host</div>
                ) : (
                  <button
                    onClick={() => isYou && toggleReady(room.id)}
                    disabled={!isYou}
                    className={`flex items-center gap-1 text-xs font-semibold mt-0.5 ${
                      player.ready ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {player.ready ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {player.ready ? "Ready" : "Not Ready"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bet amount & mode */}
      <div className="w-full max-w-sm bg-slate-900/60 border border-slate-800 rounded-2xl divide-y divide-slate-800 mb-4 shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-slate-300 text-sm">Bet Amount</span>
          {isHost ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleBetChange(-BET_STEP)}
                disabled={room.betAmount <= 0}
                className="w-6 h-6 rounded-full bg-slate-800 text-white text-sm disabled:opacity-30 flex items-center justify-center"
              >
                −
              </button>
              <span className="text-amber-400 text-sm font-bold flex items-center gap-1">🪙 {room.betAmount.toLocaleString()}</span>
              <button
                onClick={() => handleBetChange(BET_STEP)}
                className="w-6 h-6 rounded-full bg-slate-800 text-white text-sm flex items-center justify-center"
              >
                +
              </button>
            </div>
          ) : (
            <span className="text-amber-400 text-sm font-bold flex items-center gap-1">🪙 {room.betAmount.toLocaleString()}</span>
          )}
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-sm">Game Mode</span>
            <div className="flex items-center gap-1.5">
              <span className="text-white text-sm font-semibold">{room.gameMode}</span>
              <button onClick={() => setShowModeInfo((v) => !v)} aria-label="Game mode info" className="text-slate-500">
                <HelpCircle size={15} />
              </button>
            </div>
          </div>
          {showModeInfo && (
            <p className="text-slate-500 text-xs mt-2">
              Classic: standard four-player Ludo rules, first to get all tokens home wins.
            </p>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="w-full max-w-sm flex items-center gap-2 mt-auto shrink-0">
        <VoiceControls roomId={room.id} enabled={true} />
        <button
          onClick={onOpenVoice}
          aria-label="Voice chat participants"
          className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
        >
          👥
        </button>

        <button
          onClick={() => startGame(room.id)}
          disabled={!canStart}
          className="flex-1 h-11 rounded-xl bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm tracking-wide shadow-lg active:scale-[0.98] transition-transform"
        >
          {starting
            ? "Starting..."
            : !isHost
            ? "Waiting for host"
            : !allReady
            ? "Waiting for players"
            : "START GAME"}
        </button>

        <button
          onClick={onOpenChat}
          aria-label="Chat"
          className="relative w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
        >
          <MessageCircle size={18} />
          {chatUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}