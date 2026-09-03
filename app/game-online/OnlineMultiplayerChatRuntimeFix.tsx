"use client";

import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import OnlineMultiplayerGame from "./OnlineMultiplayerGame";

type ChatMessage = { id?: string; name?: string; text?: string; at?: number; playerId?: string };
type GameSocket = Socket & {
  __ludoChatPatched?: boolean;
  __ludoRoomCode?: string;
  __ludoPlayerId?: string;
  __ludoPlayerName?: string;
  __ludoChatListeners?: Set<(message: ChatMessage) => void>;
  __ludoChatHistoryPromise?: Promise<void>;
  __ludoChatSequence?: number;
};

type StakeStatus = {
  roomSize: number;
  stakePerPlayer: number;
  pot: number;
  stakedAmount: number;
  stakedPlayers: number;
  status: string;
};

const patched = Symbol.for("ludo.game-online.chat-runtime-fix");
const socketPrototype = Socket.prototype as any;

if (!socketPrototype[patched]) {
  socketPrototype[patched] = true;

  const originalOn = Socket.prototype.on;
  const originalEmit = Socket.prototype.emit;

  Socket.prototype.on = function (this: GameSocket, event: string, listener: (...args: any[]) => void) {
    if (event !== "chat") return originalOn.call(this, event, listener);

    if (!this.__ludoChatListeners) this.__ludoChatListeners = new Set();
    const wrapped = (message: ChatMessage) => {
      if (!message?.text) return;
      const seq = (this.__ludoChatSequence || 0) + 1;
      this.__ludoChatSequence = seq;
      listener({
        ...message,
        id: `live-${String(message.id || this.id)}-${seq}-${Number(message.at || Date.now())}`,
      });
    };

    this.__ludoChatListeners.add(wrapped);
    return originalOn.call(this, event, wrapped);
  } as typeof Socket.prototype.on;

  Socket.prototype.emit = function (this: GameSocket, event: string, ...args: any[]) {
    if (event === "join-room") {
      const payload = args[0] || {};
      this.__ludoRoomCode = String(payload.roomCode || "").trim().toUpperCase();
      this.__ludoPlayerId = String(payload.playerId || "");
      this.__ludoPlayerName = String(payload.name || "");
      const result = originalEmit.call(this, event, ...args);
      if (this.__ludoRoomCode) void loadHistory(this);
      return result;
    }

    if (event === "chat") {
      const payload = args[0] || {};
      const text = String(payload.text || "").trim().slice(0, 240);
      if (text && this.__ludoRoomCode) {
        void fetch("/api/multiplayer-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomCode: this.__ludoRoomCode, text }),
          cache: "no-store",
          keepalive: true,
        }).catch(() => {});
      }
    }

    return originalEmit.call(this, event, ...args);
  } as typeof Socket.prototype.emit;
}

async function loadHistory(socket: GameSocket) {
  if (!socket.__ludoRoomCode || socket.__ludoChatHistoryPromise) return socket.__ludoChatHistoryPromise;

  const promise = (async () => {
    try {
      const response = await fetch(`/api/multiplayer-chat?roomCode=${encodeURIComponent(socket.__ludoRoomCode || "")}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json();
      const messages: ChatMessage[] = Array.isArray(data?.messages) ? data.messages : [];
      const listeners = socket.__ludoChatListeners ? [...socket.__ludoChatListeners] : [];
      for (const message of messages) {
        if (!message?.text) continue;
        for (const listener of listeners) {
          listener({ ...message, playerId: socket.__ludoPlayerId });
        }
      }
    } catch {
      // Live Socket.IO chat remains available if history cannot be loaded.
    } finally {
      socket.__ludoChatHistoryPromise = undefined;
    }
  })();

  socket.__ludoChatHistoryPromise = promise;
  return promise;
}

function StakeDisplay() {
  const [stake, setStake] = useState<StakeStatus | null>(null);

  useEffect(() => {
    const roomCode = new URLSearchParams(window.location.search).get("room")?.trim().toUpperCase();
    if (!roomCode) return;
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/multiplayer-stake?roomCode=${encodeURIComponent(roomCode)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (alive) setStake(data && Number(data.pot) > 0 ? data : null);
      } catch {}
    };
    void load();
    const timer = window.setInterval(load, 1500);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  if (!stake) return null;

  const status = stake.status === "settled" ? "SETTLED" : stake.status === "locked" ? "LOCKED" : "STAKED";
  return (
    <div style={{
      position: "fixed", zIndex: 55, top: "max(98px, calc(env(safe-area-inset-top) + 98px))", left: "50%",
      transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8,
      padding: "7px 12px", borderRadius: 999, border: "1px solid rgba(214,173,75,.45)",
      background: "rgba(8,8,8,.86)", color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,.35)",
      backdropFilter: "blur(10px)", pointerEvents: "none", whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: 13 }}>🪙</span>
      <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: .8, color: "#aaa" }}>STAKED POT</span>
      <b style={{ fontSize: 11, color: "#f0d579" }}>{stake.pot.toLocaleString()} COINS</b>
      <span style={{ fontSize: 7, fontWeight: 900, color: status === "SETTLED" ? "#73e5a0" : "#aaa" }}>{status}</span>
    </div>
  );
}

export default function OnlineMultiplayerChatRuntimeFix() {
  useEffect(() => {
    return () => {};
  }, []);
  return <><StakeDisplay /><OnlineMultiplayerGame /></>;
}
