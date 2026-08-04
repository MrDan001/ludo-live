"use client";

import { create } from "zustand";
import { getSocket } from "@/lib/socket/client";
import { GameState, PlayerColor } from "@/lib/engine/gameState";
import { ChatMessage } from "@/types/game";

interface RoomPlayer {
  socketId: string;
  userId: string;
  color: PlayerColor;
  name: string;
  connected: boolean;
  avatarUrl?: string;
  ready: boolean;
}

interface RoomData {
  id: string;
  hostUserId: string;
  players: RoomPlayer[];
  gameState: GameState | null;
  started: boolean;
  pendingRoll: { d1: number; d2: number; sum: number; hasSix: boolean } | null;
  pendingMoves: { tokenId: string; toPosition: number }[];
  messages: ChatMessage[];
  betAmount: number;
  gameMode: string;
  pot: number;
}

interface MultiplayerStore {
  room: RoomData | null;
  yourColor: PlayerColor | null;
  yourUserId: string | null;
  error: string | null;
  rollSeq: number;
  starting: boolean;

  connect: () => void;
  createRoom: (name: string, userId: string, avatarUrl?: string) => void;
  joinRoom: (roomId: string, name: string, userId: string, avatarUrl?: string) => void;
  startGame: (roomId: string) => void;
  roll: (roomId: string) => void;
  selectMove: (roomId: string, tokenId: string) => void;
  toggleReady: (roomId: string) => void;
  setBetAmount: (roomId: string, userId: string, amount: number) => void;
  setGameMode: (roomId: string, userId: string, mode: string) => void;
  clearError: () => void;
}

export const useMultiplayerGame = create<MultiplayerStore>((set, get) => ({
  room: null,
  yourColor: null,
  yourUserId: null,
  error: null,
  rollSeq: 0,
  starting: false,

  connect: () => {
    const socket = getSocket();

    socket.off("room:joined");
    socket.off("room:update");
    socket.off("room:error");

    socket.on("room:joined", ({ yourColor }: { roomId: string; yourColor: PlayerColor }) => {
      set({ yourColor, error: null });
    });

    socket.on("room:update", (room: RoomData) => {
      set((s) => ({
        room,
        rollSeq: room.pendingRoll ? s.rollSeq + 1 : s.rollSeq,
        starting: false,
      }));
    });

    socket.on("room:error", ({ message }: { message: string }) => {
      set({ error: message, starting: false });
    });
  },

  createRoom: (name, userId, avatarUrl) => {
    set({ yourUserId: userId });
    getSocket().emit("room:create", { name, userId, avatarUrl });
  },

  joinRoom: (roomId, name, userId, avatarUrl) => {
    set({ yourUserId: userId });
    getSocket().emit("room:join", { roomId, name, userId, avatarUrl });
  },

  startGame: (roomId) => {
    set({ starting: true, error: null });
    getSocket().emit("room:start", { roomId, userId: get().yourUserId });
  },

  roll: (roomId) => {
    getSocket().emit("game:roll", { roomId });
  },

  selectMove: (roomId, tokenId) => {
    getSocket().emit("game:selectMove", { roomId, tokenId });
  },

  toggleReady: (roomId) => {
    getSocket().emit("room:toggleReady", { roomId });
  },

  setBetAmount: (roomId, userId, amount) => {
    getSocket().emit("room:setBet", { roomId, userId, amount });
  },

  setGameMode: (roomId, userId, mode) => {
    getSocket().emit("room:setMode", { roomId, userId, mode });
  },

  clearError: () => set({ error: null }),
}));