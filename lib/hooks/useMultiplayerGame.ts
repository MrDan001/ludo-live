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
  // Set only in 2-player team mode - the second color this human also
  // controls (Yellow if their primary is Red, Blue if Green).
  teammateColor?: PlayerColor;
}

interface RoomData {
  id: string;
  hostUserId: string;
  players: RoomPlayer[];
  gameState: GameState | null;
  started: boolean;
  pendingRoll: { d1: number; d2: number; sum: number; hasSix: boolean } | null;
  pendingMoves: { tokenId: string; toPosition: number; dieValue: number }[];
  messages: ChatMessage[];
  betAmount: number;
  gameMode: string;
  pot: number;
  // Present only for a room created from a filled tournament - id of that
  // Tournament. Drives the tournament-specific waiting/lobby UI and lets
  // the room screen skip bet/mode controls that don't apply there.
  tournamentId?: string;
  // Total entrants expected for that tournament - see server/rooms.ts.
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
  // The dice display's source of truth - set the instant a roll happens
  // (whether or not it produced a valid move) and only cleared once the
  // board's step-by-step move animation finishes (or, if there was nothing
  // to animate, after a short grace period). This is what makes the dice
  // hold their value and stay visible through the whole hop sequence
  // instead of resetting the moment a move is selected.
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
  /** Called by the board once a move's hop animation is fully done -
   *  releases the dice hold, allowing the next roll. */
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
        // Nothing will animate - hold the numbers just long enough to be
        // seen, then release the dice so the next player isn't stuck.
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