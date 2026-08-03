"use client";

import { useEffect } from "react";
import { useVoiceChat } from "@/lib/hooks/useVoiceChat";

interface VoiceControlsProps {
  roomId: string;
  enabled: boolean;
}

export default function VoiceControls({ roomId, enabled }: VoiceControlsProps) {
  const { muted, toggleMute, connect } = useVoiceChat();

  // Connect is a no-op if already live for this room, so this is safe to
  // re-run on every render without re-requesting the mic or re-joining.
  useEffect(() => {
    connect(roomId, enabled);
  }, [roomId, enabled, connect]);

  // Only tear the connection down when this component actually unmounts
  // (i.e. the room page itself unmounts) - not on every re-render.
  useEffect(() => {
    return () => {
      useVoiceChat.getState().disconnect();
    };
  }, []);

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