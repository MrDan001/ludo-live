"use client";

import { ArrowLeft, X, Mic, MicOff, Volume2 } from "lucide-react";
import { useVoiceChat } from "@/lib/hooks/useVoiceChat";
import { PlayerColor } from "@/lib/engine";

const AVATAR_BG: Record<string, string> = {
  RED: "#ef4444",
  GREEN: "#10b981",
  YELLOW: "#eab308",
  BLUE: "#3b82f6",
};

interface VoiceChatPlayer {
  socketId: string;
  name: string;
  color: PlayerColor;
  avatarUrl?: string;
  connected: boolean;
}

interface VoiceChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  players: VoiceChatPlayer[];
  currentSocketId: string | null;
}

export default function VoiceChatPanel({ isOpen, onClose, players, currentSocketId }: VoiceChatPanelProps) {
  const { muted, toggleMute, speakingIds, peerMuted } = useVoiceChat();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm h-[75dvh] bg-slate-950 rounded-t-2xl border-t border-x border-slate-800 shadow-2xl flex flex-col overflow-hidden font-sans animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="relative flex items-center justify-center p-4 border-b border-slate-800/60 bg-slate-900/50 shrink-0">
          <button
            onClick={onClose}
            aria-label="Back"
            className="absolute left-4 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-white text-base font-bold tracking-wide">Voice Chat</h1>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Participant list */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {players.map((p) => {
            const isMe = p.socketId === currentSocketId;
            const isMuted = isMe ? muted : peerMuted[p.socketId] ?? true;
            const speaking = !isMuted && speakingIds.has(p.socketId);

            return (
              <div key={p.socketId} className="flex items-center gap-3 py-2.5">
                <div
                  className="relative w-10 h-10 shrink-0 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold transition-shadow"
                  style={{
                    background: AVATAR_BG[p.color] ?? "#64748b",
                    boxShadow: speaking ? "0 0 0 2px #10b981" : undefined,
                  }}
                >
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    p.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-semibold truncate">
                    {p.name}
                    {isMe && <span className="text-slate-500 font-normal"> (You)</span>}
                  </div>
                  {speaking && <div className="text-emerald-400 text-xs">Speaking...</div>}
                  {!p.connected && <div className="text-slate-500 text-xs">Disconnected</div>}
                </div>

                {isMuted ? (
                  <MicOff size={18} className="text-red-500 shrink-0" />
                ) : (
                  <Volume2 size={18} className={`shrink-0 ${speaking ? "text-emerald-400" : "text-slate-500"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Mute toggle */}
        <div className="flex flex-col items-center gap-2 p-5 border-t border-slate-800/60 bg-slate-900/50 shrink-0">
          <span className="text-slate-400 text-xs">Tap to Mute / Unmute</span>
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className={[
              "w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform",
              muted ? "bg-slate-700" : "bg-blue-500",
            ].join(" ")}
          >
            {muted ? <MicOff size={22} className="text-white" /> : <Mic size={22} className="text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}