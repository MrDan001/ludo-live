"use client";

import { create } from "zustand";
import { getSocket } from "@/lib/socket/client";
import { GameState, PlayerColor } from "@/lib/engine/gameState";
import { MoveSource } from "@/lib/engine/moves";
import { ChatMessage } from "@/types/game";

interface RoomPlayer {
  socketId: string;
  userId: string;
  color: PlayerColor;
  name: string;
  connected: boolean;
  avatarUrl?: string;
  ready: boolean;
  teammateColor?: PlayerColor;
}

interface RoomData {
  id: string;
  hostUserId: string;
  players: RoomPlayer[];
  gameState: GameState | null;
  started: boolean;
  pendingRoll: { d1: number; d2: number; sum: number; hasSix: boolean } | null;
  pendingMoves: { tokenId: string; toPosition: number; dieValue: number; source: MoveSource }[];
  messages: ChatMessage[];
  betAmount: number;
  gameMode: string;
  pot: number;
  tournamentId?: string;
  tournamentMaxPlayers?: number;
}

interface MultiplayerStore {
  room: RoomData | null;
  yourColor: PlayerColor | null;
  yourUserId: string | null;
  error: string | null;
  kickedMessage: string | null;
  rollSeq: number;
  starting: boolean;
  lastRoll: { d1: number; d2: number } | null;

  connect: () => void;
  createRoom: (name: string, userId: string, avatarUrl?: string) => void;
  joinRoom: (roomId: string, name: string, userId: string, avatarUrl?: string) => void;
  joinTournamentMatch: (tournamentId: string, name: string, userId: string, avatarUrl?: string) => void;
  startGame: (roomId: string) => void;
  roll: (roomId: string) => void;
  selectMove: (roomId: string, tokenId: string, toPosition: number) => void;
  toggleReady: (roomId: string) => void;
  setBetAmount: (roomId: string, userId: string, amount: number) => void;
  setGameMode: (roomId: string, userId: string, mode: string) => void;
  removePlayer: (roomId: string, targetUserId: string) => void;
  clearError: () => void;
  clearKicked: () => void;
  finishMoveAnimation: () => void;
}

export const useMultiplayerGame = create<MultiplayerStore>((set, get) => ({
  room: null,
  yourColor: null,
  yourUserId: null,
  error: null,
  kickedMessage: null,
  rollSeq: 0,
  starting: false,
  lastRoll: null,

  connect: () => {
    const socket = getSocket();

    socket.off("room:joined");
    socket.off("room:update");
    socket.off("room:error");
    socket.off("room:kicked");
    socket.off("game:rolled");
    socket.off("connect", handleSocketReconnect);

    function handleSocketReconnect() {
      const { room, yourUserId } = get();
      if (!room || !yourUserId) return;

      // Socket.IO creates a new socket id after a dropped connection. The
      // server keeps the seat by userId, so rejoin the same room automatically
      // instead of leaving the player stuck as "disconnected" after a Wi-Fi
      // hiccup, mobile backgrounding, or temporary network loss.
      if (room.tournamentId) {
        socket.emit("tournament:joinMatch", {
          tournamentId: room.tournamentId,
          name: room.players.find((p) => p.userId === yourUserId)?.name || "Player",
          userId: yourUserId,
          avatarUrl: room.players.find((p) => p.userId === yourUserId)?.avatarUrl,
        });
      } else {
        const me = room.players.find((p) => p.userId === yourUserId);
        if (me) {
          socket.emit("room:join", {
            roomId: room.id,
            name: me.name || "Player",
            userId: yourUserId,
            avatarUrl: me.avatarUrl,
          });
        }
      }
    }

    socket.on("connect", handleSocketReconnect);

    socket.on("room:joined", ({ yourColor }: { roomId: string; yourColor: PlayerColor }) => {
      set({ yourColor, error: null });
    });

    socket.on("room:update", (room: RoomData) => {
      set({ room, starting: false });
    });

    socket.on("room:error", ({ message }: { message: string }) => {
      set({ error: message, starting: false });
    });

    socket.on("room:kicked", ({ message }: { message: string }) => {
      set({ kickedMessage: message, room: null });
    });

    socket.on("game:rolled", ({ d1, d2, hasValidMoves }: { d1: number; d2: number; hasValidMoves: boolean }) => {
      set((s) => ({ lastRoll: { d1, d2 }, rollSeq: s.rollSeq + 1 }));
      if (!hasValidMoves) {
        setTimeout(() => {
          set((s) => (s.lastRoll?.d1 === d1 && s.lastRoll?.d2 === d2 ? { lastRoll: null } : {}));
        }, 1200);
      }
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

  joinTournamentMatch: (tournamentId, name, userId, avatarUrl) => {
    set({ yourUserId: userId });
    getSocket().emit("tournament:joinMatch", { tournamentId, name, userId, avatarUrl });
  },

  startGame: (roomId) => {
    set({ starting: true, error: null });
    getSocket().emit("room:start", { roomId, userId: get().yourUserId });
  },

  roll: (roomId) => {
    getSocket().emit("game:roll", { roomId });
  },

  selectMove: (roomId, tokenId, toPosition) => {
    getSocket().emit("game:selectMove", { roomId, tokenId, toPosition });
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

  removePlayer: (roomId, targetUserId) => {
    getSocket().emit("room:removePlayer", { roomId, hostUserId: get().yourUserId, targetUserId });
  },

  clearError: () => set({ error: null }),
  clearKicked: () => set({ kickedMessage: null }),
  finishMoveAnimation: () => set({ lastRoll: null }),
}));