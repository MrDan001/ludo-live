"use client";

import { create } from "zustand";
import { getSocket } from "@/lib/socket/client";
import { ChatMessage, QUICK_CHAT_PRESETS } from "@/types/game";

export { QUICK_CHAT_PRESETS };

interface RoomChatStore {
  messages: ChatMessage[];
  roomId: string | null;
  error: string | null;
  unreadCount: number;

  // Attaches socket listeners for the given room. Safe to call every time
  // the chat panel mounts - listeners are torn down and re-added, and
  // switching rooms clears out the previous room's messages.
  connect: (roomId: string, initialMessages?: ChatMessage[]) => void;

  sendMessage: (text: string) => void;
  sendQuick: (text: string) => void;

  markRead: () => void;
}

export const useRoomChat = create<RoomChatStore>((set, get) => ({
  messages: [],
  roomId: null,
  error: null,
  unreadCount: 0,

  connect: (roomId, initialMessages) => {
    const socket = getSocket();
    const isNewRoom = get().roomId !== roomId;

    socket.off("chat:new");
    socket.off("chat:error");

    if (isNewRoom) {
      set({
        roomId,
        messages: initialMessages ?? [],
        error: null,
        unreadCount: 0,
      });
    } else if (initialMessages && initialMessages.length > get().messages.length) {
      // Room already tracked here but a fresher history came in (e.g. from
      // a room:update snapshot) - reconcile without wiping local state.
      set({ messages: initialMessages });
    }

    socket.on("chat:new", (message: ChatMessage) => {
      if (message.roomId !== get().roomId) return;
      set((s) => ({
        messages: [...s.messages, message],
        unreadCount: s.unreadCount + 1,
      }));
    });

    socket.on("chat:error", ({ message }: { message: string }) => {
      set({ error: message });
    });
  },

  sendMessage: (text) => {
    const { roomId } = get();
    if (!roomId || !text.trim()) return;
    getSocket().emit("chat:message", { roomId, text: text.trim() });
  },

  sendQuick: (text) => {
    const { roomId } = get();
    if (!roomId) return;
    getSocket().emit("chat:quick", { roomId, text });
  },

  markRead: () => set({ unreadCount: 0 }),
}));