"use client";

import { useVoiceChat } from "@/lib/hooks/useVoiceChat";

interface VoiceControlsProps {
  roomId: string;
  enabled: boolean;
}

export default function VoiceControls({ roomId, enabled }: VoiceControlsProps) {
  const { muted, toggleMute } = useVoiceChat(roomId, enabled);

  return (
    <button
      onClick={toggleMute}
      className={[
        "px-4 py-2 rounded-lg font-semibold flex items-center gap-2",
        muted ? "bg-slate-700 text-white" : "bg-emerald-600 text-white",
      ].join(" ")}
    >
      {muted ? "🎤 Unmute" : "🔴 Mute"}
    </button>
  );
}