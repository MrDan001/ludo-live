"use client";

import { create } from "zustand";
import { getSocket } from "@/lib/socket/client";
import { GameState, PlayerColor } from "@/lib/engine/gameState";

interface RoomPlayer {
  socketId: string;
  color: PlayerColor;
  name: string;
  connected: boolean;
}

interface RoomData {
  id: string;
  players: RoomPlayer[];
  gameState: GameState | null;
  started: boolean;
  pendingRoll: { d1: number; d2: number; sum: number; hasSix: boolean } | null;
  pendingMoves: { tokenId: string; toPosition: number }[];
}

interface MultiplayerStore {
  room: RoomData | null;
  yourColor: PlayerColor | null;
  error: string | null;
  rollSeq: number;

  connect: () => void;
  createRoom: (name: string, userId: string) => void;
  joinRoom: (roomId: string, name: string, userId: string) => void;
  startGame: (roomId: string) => void;
  roll: (roomId: string) => void;
  selectMove: (roomId: string, tokenId: string) => void;
}

export const useMultiplayerGame = create<MultiplayerStore>((set, get) => ({
  room: null,
  yourColor: null,
  error: null,
  rollSeq: 0,

  connect: () => {
    const socket = getSocket();

    socket.off("room:joined");
    socket.off("room:update");
    socket.off("room:error");

    socket.on("room:joined", ({ yourColor }: { roomId: string; yourColor: PlayerColor }) => {
      set({ yourColor, error: null });
    });

    socket.on("room:update", (room: RoomData) => {
      set((s) => ({ room, rollSeq: room.pendingRoll ? s.rollSeq + 1 : s.rollSeq }));
    });

    socket.on("room:error", ({ message }: { message: string }) => {
      set({ error: message });
    });
  },

  createRoom: (name, userId) => {
    getSocket().emit("room:create", { name, userId });
  },

  joinRoom: (roomId, name, userId) => {
    getSocket().emit("room:join", { roomId, name, userId });
  },

  startGame: (roomId) => {
    getSocket().emit("room:start", { roomId });
  },

  roll: (roomId) => {
    getSocket().emit("game:roll", { roomId });
  },

  selectMove: (roomId, tokenId) => {
    getSocket().emit("game:selectMove", { roomId, tokenId });
  },
}));