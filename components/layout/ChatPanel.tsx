"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X, Smile } from "lucide-react";
import { useRoomChat, QUICK_CHAT_PRESETS } from "@/lib/hooks/useRoomChat";
import { PlayerColor } from "@/lib/engine";

const AVATAR_BG: Record<string, string> = {
  RED: "#ef4444",
  GREEN: "#10b981",
  YELLOW: "#eab308",
  BLUE: "#3b82f6",
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentSocketId: string | null;
}

export default function ChatPanel({ isOpen, onClose, currentSocketId }: ChatPanelProps) {
  const { messages, sendMessage, sendQuick } = useRoomChat();
  const [tab, setTab] = useState<"room" | "quick">("room");
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const handleQuickSend = (preset: string) => {
    sendQuick(preset);
    setTab("room");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm h-[80dvh] bg-slate-950 rounded-t-2xl border-t border-x border-slate-800 shadow-2xl flex flex-col overflow-hidden font-sans animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="relative flex items-center justify-center p-4 border-b border-slate-800/60 bg-slate-900/50 shrink-0">
          <h1 className="text-white text-base font-bold tracking-wide">Chat</h1>
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="absolute right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 pt-3 pb-2 shrink-0">
          <button
            onClick={() => setTab("room")}
            className={[
              "flex-1 py-2 rounded-xl text-sm font-semibold transition-colors",
              tab === "room" ? "bg-emerald-600 text-white" : "bg-slate-800/80 text-slate-400",
            ].join(" ")}
          >
            Room Chat
          </button>
          <button
            onClick={() => setTab("quick")}
            className={[
              "flex-1 py-2 rounded-xl text-sm font-semibold transition-colors",
              tab === "quick" ? "bg-emerald-600 text-white" : "bg-slate-800/80 text-slate-400",
            ].join(" ")}
          >
            Quick Chat
          </button>
        </div>

        {tab === "room" ? (
          <>
            {/* Message list */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  No messages yet — say hi!
                </div>
              )}
              {messages.map((m) => {
                const isMine = m.senderId === currentSocketId;
                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold overflow-hidden"
                      style={{ background: AVATAR_BG[m.senderColor] ?? "#64748b" }}
                    >
                      {m.senderAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.senderAvatarUrl} alt={m.senderName} className="w-full h-full object-cover" />
                      ) : (
                        m.senderName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className={`flex flex-col max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>
                      {!isMine && (
                        <span className="text-slate-400 text-[11px] font-medium mb-0.5 px-1">{m.senderName}</span>
                      )}
                      <div
                        className={[
                          "px-3 py-2 rounded-2xl text-sm break-words",
                          isMine
                            ? "bg-emerald-600 text-white rounded-br-sm"
                            : "bg-slate-800 text-white rounded-bl-sm",
                        ].join(" ")}
                      >
                        {m.text}
                      </div>
                      <span className="text-slate-500 text-[10px] mt-0.5 px-1">{formatTime(m.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input bar */}
            <div className="flex items-center gap-2 p-3 border-t border-slate-800/60 bg-slate-900/50 shrink-0">
              <div className="flex-1 flex items-center gap-2 bg-slate-800 rounded-full px-4 py-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type a message..."
                  maxLength={200}
                  className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none"
                />
                <Smile size={18} className="text-slate-500 shrink-0" />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                aria-label="Send message"
                className="w-10 h-10 rounded-full bg-blue-500 disabled:bg-slate-700 disabled:opacity-60 text-white flex items-center justify-center shrink-0 active:scale-95 transition-transform"
              >
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          /* Quick Chat grid */
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              {QUICK_CHAT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleQuickSend(preset)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl py-3 px-3 text-center transition-colors active:scale-95"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}