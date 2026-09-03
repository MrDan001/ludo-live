"use client";

import { useEffect } from "react";
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

export default function OnlineMultiplayerChatRuntimeFix() {
  useEffect(() => {
    return () => {};
  }, []);
  return <OnlineMultiplayerGame />;
}
