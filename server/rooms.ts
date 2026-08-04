import {
  GameState,
  PlayerColor,
  ALL_COLORS,
  createInitialGameState,
} from "../lib/engine/gameState";
import { rollTwoDice, DiceRoll } from "../lib/engine/dice";
import { getValidMoves, applyMove, getNextTurnColor, MoveOption } from "../lib/engine/moves";
import { prisma } from "./db";
import { ChatMessage, QUICK_CHAT_PRESETS } from "../types/game";

const MAX_STORED_MESSAGES = 200;
const MAX_MESSAGE_LENGTH = 200;
const DEFAULT_BET_AMOUNT = 0;
const DEFAULT_GAME_MODE = "Classic";
const MAX_BET_AMOUNT = 1_000_000;

export interface RoomPlayer {
  socketId: string;
  userId: string;
  color: PlayerColor;
  name: string;
  connected: boolean;
  avatarUrl?: string;
  ready: boolean;
}

export interface Room {
  id: string;
  hostUserId: string;
  players: RoomPlayer[];
  gameState: GameState | null;
  started: boolean;
  pendingRoll: DiceRoll | null;
  pendingMoves: MoveOption[];
  consecutiveSixes: number;
  resultRecorded: boolean;
  messages: ChatMessage[];
  betAmount: number;
  gameMode: string;
  pot: number;
}

const rooms = new Map<string, Room>();

export function generateRoomId(): string {
  let id: string;
  do {
    id = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(id));
  return id;
}

export function createRoom(hostSocketId: string, hostUserId: string, hostName: string, hostAvatarUrl?: string): Room {
  const id = generateRoomId();
  const room: Room = {
    id,
    hostUserId,
    players: [
      {
        socketId: hostSocketId,
        userId: hostUserId,
        color: "RED",
        name: hostName,
        connected: true,
        avatarUrl: hostAvatarUrl,
        ready: true, // host is implicitly ready - they control Start Game
      },
    ],
    gameState: null,
    started: false,
    pendingRoll: null,
    pendingMoves: [],
    consecutiveSixes: 0,
    resultRecorded: false,
    messages: [],
    betAmount: DEFAULT_BET_AMOUNT,
    gameMode: DEFAULT_GAME_MODE,
    pot: 0,
  };
  rooms.set(id, room);
  return room;
}

export function joinRoom(
  roomId: string,
  socketId: string,
  userId: string,
  name: string,
  avatarUrl?: string
): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.started) return null;
  if (room.players.length >= 4) return null;

  const usedColors = new Set(room.players.map((p) => p.color));
  const nextColor = ALL_COLORS.find((c) => !usedColors.has(c));
  if (!nextColor) return null;

  room.players.push({ socketId, userId, color: nextColor, name, connected: true, avatarUrl, ready: false });
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

class InsufficientFundsError extends Error {
  constructor(public playerName: string, public required: number) {
    super(`${playerName} doesn't have enough coins to cover this bet`);
  }
}

export async function startGame(roomId: string, userId: string): Promise<Room | { error: string } | null> {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.started) return { error: "Game already started" };
  if (userId !== room.hostUserId) return { error: "Only the host can start the game" };
  if (room.players.length < 2) return { error: "Need at least 2 players to start" };

  const notReady = room.players.find((p) => !p.ready);
  if (notReady) return { error: `${notReady.name} isn't ready yet` };

  if (room.betAmount > 0) {
    try {
      // Interactive transaction: verify every player can cover the bet
      // *before* deducting from anyone, so a mid-transaction failure never
      // leaves some players charged and others not.
      await prisma.$transaction(async (tx) => {
        for (const p of room.players) {
          const user = await tx.user.findUnique({ where: { id: p.userId } });
          if (!user || user.coins < room.betAmount) {
            throw new InsufficientFundsError(p.name, room.betAmount);
          }
        }
        for (const p of room.players) {
          await tx.user.update({
            where: { id: p.userId },
            data: { coins: { decrement: room.betAmount } },
          });
        }
      });
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return { error: err.message };
      }
      console.error("Bet escrow transaction failed:", err);
      return { error: "Could not process the bet - please try again" };
    }
  }

  const activeColors = room.players.map((p) => p.color);
  room.gameState = createInitialGameState(activeColors, []);
  room.started = true;
  room.pot = room.betAmount * room.players.length;
  return room;
}

export function handleRoll(roomId: string, socketId: string): {
  room: Room;
  roll: DiceRoll;
  moves: MoveOption[];
} | null {
  const room = rooms.get(roomId);
  if (!room || !room.gameState) return null;

  const player = room.players.find((p) => p.socketId === socketId);
  if (!player || player.color !== room.gameState.currentTurnColor) return null;

  const roll = rollTwoDice();
  const moves = getValidMoves(room.gameState, roll);

  room.consecutiveSixes = roll.hasSix ? room.consecutiveSixes + 1 : 0;
  room.pendingRoll = roll;
  room.pendingMoves = moves;

  if (moves.length === 0) {
    const nextColor = getNextTurnColor(room.gameState, roll, room.consecutiveSixes);
    room.gameState = { ...room.gameState, currentTurnColor: nextColor };
    room.pendingRoll = null;
    room.pendingMoves = [];
  }

  return { room, roll, moves };
}

export async function handleSelectMove(roomId: string, socketId: string, tokenId: string): Promise<Room | null> {
  const room = rooms.get(roomId);
  if (!room || !room.gameState || !room.pendingRoll) return null;

  const player = room.players.find((p) => p.socketId === socketId);
  if (!player || player.color !== room.gameState.currentTurnColor) return null;

  const move = room.pendingMoves.find((m) => m.tokenId === tokenId);
  if (!move) return null;

  const applied = applyMove(room.gameState, move);

  if (applied.winner) {
    room.gameState = applied;
    room.pendingRoll = null;
    room.pendingMoves = [];

    if (!room.resultRecorded) {
      room.resultRecorded = true;
      await recordMatchResult(room);
    }

    return room;
  }

  const forfeited = room.consecutiveSixes >= 3;
  const nextColor = getNextTurnColor(applied, room.pendingRoll, forfeited ? 3 : room.consecutiveSixes);
  room.gameState = { ...applied, currentTurnColor: nextColor, consecutiveSixes: forfeited ? 0 : room.consecutiveSixes };
  room.pendingRoll = null;
  room.pendingMoves = [];

  return room;
}

async function recordMatchResult(room: Room) {
  if (!room.gameState?.winner) return;

  try {
    const winnerColor = room.gameState.winner;
    const winnerPlayer = room.players.find((p) => p.color === winnerColor);

    const match = await prisma.match.create({
      data: {
        roomCode: room.id,
        winnerId: winnerPlayer?.userId ?? null,
      },
    });

    for (const player of room.players) {
      await prisma.matchPlayer.create({
        data: {
          matchId: match.id,
          userId: player.userId,
          color: player.color,
          won: player.color === winnerColor,
        },
      });

      await prisma.leaderboardEntry.upsert({
        where: { userId: player.userId },
        update: {
          gamesPlayed: { increment: 1 },
          wins: player.color === winnerColor ? { increment: 1 } : undefined,
        },
        create: {
          userId: player.userId,
          gamesPlayed: 1,
          wins: player.color === winnerColor ? 1 : 0,
        },
      });
    }

    // Pay out the escrowed bet pot to the winner. The bet was already
    // deducted from every player up front in startGame, so this is a pure
    // credit - nothing to deduct here.
    if (room.pot > 0 && winnerPlayer) {
      await prisma.user.update({
        where: { id: winnerPlayer.userId },
        data: { coins: { increment: room.pot } },
      });
      console.log(`Paid out pot of ${room.pot} coins to ${winnerPlayer.name}`);
    }

    console.log(`Match recorded for room ${room.id}, winner: ${winnerColor}`);
  } catch (err) {
    console.error("Failed to record match result:", err);
  }
}

export function addChatMessage(
  roomId: string,
  socketId: string,
  text: string,
  isQuick: boolean
): { room: Room; message: ChatMessage } | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.find((p) => p.socketId === socketId);
  if (!player) return null;

  const trimmed = text.trim();
  if (!trimmed) return null;

  // Quick chat may only send one of the fixed presets — this keeps it
  // unmoderated-text-free by construction rather than by filtering.
  if (isQuick && !QUICK_CHAT_PRESETS.includes(trimmed)) return null;
  if (!isQuick && trimmed.length > MAX_MESSAGE_LENGTH) return null;

  const message: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    roomId,
    senderId: socketId,
    senderName: player.name,
    senderColor: player.color,
    senderAvatarUrl: player.avatarUrl,
    text: isQuick ? trimmed : trimmed.slice(0, MAX_MESSAGE_LENGTH),
    isQuick,
    timestamp: Date.now(),
  };

  room.messages.push(message);
  if (room.messages.length > MAX_STORED_MESSAGES) {
    room.messages.splice(0, room.messages.length - MAX_STORED_MESSAGES);
  }

  return { room, message };
}

export function toggleReady(roomId: string, socketId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room || room.started) return null;

  const player = room.players.find((p) => p.socketId === socketId);
  if (!player) return null;

  // The host stays implicitly ready - they don't toggle out, since they're
  // the one who presses Start Game.
  if (player.userId === room.hostUserId) return room;

  player.ready = !player.ready;
  return room;
}

export function setBetAmount(
  roomId: string,
  userId: string,
  amount: number
): Room | { error: string } | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.started) return { error: "Game already started" };
  if (userId !== room.hostUserId) return { error: "Only the host can change the bet amount" };
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_BET_AMOUNT) {
    return { error: "Invalid bet amount" };
  }

  room.betAmount = Math.floor(amount);
  return room;
}

export function setGameMode(roomId: string, userId: string, mode: string): Room | { error: string } | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.started) return { error: "Game already started" };
  if (userId !== room.hostUserId) return { error: "Only the host can change the game mode" };

  room.gameMode = mode;
  return room;
}

export function markDisconnected(socketId: string): Room | null {
  for (const room of rooms.values()) {
    const player = room.players.find((p) => p.socketId === socketId);
    if (player) {
      player.connected = false;
      return room;
    }
  }
  return null;
}