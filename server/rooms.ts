import {
  GameState,
  PlayerColor,
  ALL_COLORS,
  createInitialGameState,
} from "../lib/engine/gameState";
import { rollTwoDice, DiceRoll } from "../lib/engine/dice";
import { getValidMoves, applyMove, getNextTurnColor, MoveOption, TEAM_PARTNER } from "../lib/engine/moves";
import { prisma } from "./db";
import { ChatMessage, QUICK_CHAT_PRESETS } from "../types/game";

const MAX_STORED_MESSAGES = 200;
const MAX_MESSAGE_LENGTH = 200;
const DEFAULT_BET_AMOUNT = 0;
const DEFAULT_GAME_MODE = "Classic";
const MAX_BET_AMOUNT = 1_000_000;

// Where the Next.js app (which owns /api/tournaments/*) is reachable from
// this process. Defaults to the local dev server; set to the deployed
// app's URL in production, since the socket server and the Next app are
// separate processes/services.
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

export interface RoomPlayer {
  socketId: string;
  userId: string;
  color: PlayerColor;
  name: string;
  connected: boolean;
  avatarUrl?: string;
  ready: boolean;
  // Set only in 2-player team mode: the second color this human also
  // controls (Yellow if their primary color is Red, Blue if Green).
  teammateColor?: PlayerColor;
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
  // Set only for a room created from a filled Tournament (see
  // createOrJoinTournamentRoom) - id of that Tournament. Presence of this
  // field is what tells the rest of the room lifecycle "this match's
  // result needs to settle a tournament prize pool, not a bet pot."
  tournamentId?: string;
  // How many entrants this tournament has in total - carried onto the
  // room purely so the waiting-room UI can show "2/4 joined" without a
  // separate fetch back to the tournament API.
  tournamentMaxPlayers?: number;
  // Guards the settle call the same way resultRecorded guards match
  // recording - so a reconnect/replay near the winning move can never
  // trigger a second payout.
  tournamentSettled?: boolean;
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
): Room | { error: string } | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  // Reconnection: this user already has a seat in this room - whether
  // they just dropped mid-game or their tab reloaded in the lobby. Resume
  // their existing seat/color instead of treating them as a new player.
  // Works whether the game has started or not, and even after a match has
  // been decided (they'll just see the final result - nothing about a
  // finished, paid-out match gets undone by reconnecting).
  const existing = room.players.find((p) => p.userId === userId);
  if (existing) {
    existing.socketId = socketId;
    existing.connected = true;
    if (name) existing.name = name;
    if (avatarUrl) existing.avatarUrl = avatarUrl;
    return room;
  }

  // Brand new player - only allowed pre-game, with a free seat.
  if (room.started) return { error: "Game already in progress" };
  if (room.players.length >= 4) return { error: "Room is full" };

  const usedColors = new Set(room.players.map((p) => p.color));
  const nextColor = ALL_COLORS.find((c) => !usedColors.has(c));
  if (!nextColor) return { error: "Room is full" };

  room.players.push({ socketId, userId, color: nextColor, name, connected: true, avatarUrl, ready: false });
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

// Join (creating on first arrival) the match room for a filled tournament.
// Unlike joinRoom, there's no separate "create" step and no host picking
// who's allowed in - the room's roster is exactly the tournament's paid
// entrants, known from the database, and any of them connecting is enough
// to stand the room up. Colors are assigned deterministically from entry
// order so every entrant lands on the same color regardless of connection
// order or reconnects.
export async function createOrJoinTournamentRoom(
  tournamentId: string,
  socketId: string,
  userId: string,
  name: string,
  avatarUrl?: string
): Promise<Room | { error: string } | null> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { entries: { orderBy: { joinedAt: "asc" } } },
  });
  if (!tournament) return null;

  // The tournament only moves to in_progress once it's full (see the join
  // route) - anything else means there's no match to connect to yet, or
  // it's already been played out.
  if (tournament.status !== "in_progress") {
    return { error: "This tournament isn't ready to play yet" };
  }

  const entry = tournament.entries.find((e) => e.userId === userId);
  if (!entry) return { error: "You didn't enter this tournament" };

  const roomId = `t_${tournamentId}`;
  let room = rooms.get(roomId);

  if (!room) {
    room = {
      id: roomId,
      hostUserId: tournament.entries[0].userId,
      players: [],
      gameState: null,
      started: false,
      pendingRoll: null,
      pendingMoves: [],
      consecutiveSixes: 0,
      resultRecorded: false,
      messages: [],
      // No bet escrow here - the entry fee was already deducted (and
      // pooled into tournament.prizePool) when each player joined, so
      // there's nothing for startGame's bet logic to do and no room.pot
      // for recordMatchResult to separately pay out. The prize pays out
      // through settleTournamentMatch instead, once, from prizePool.
      betAmount: 0,
      gameMode: DEFAULT_GAME_MODE,
      pot: 0,
      tournamentId,
      tournamentMaxPlayers: tournament.entries.length,
      tournamentSettled: false,
    };
    rooms.set(roomId, room);
  }

  const existing = room.players.find((p) => p.userId === userId);
  if (existing) {
    // Reconnect - same as joinRoom's reconnect path.
    existing.socketId = socketId;
    existing.connected = true;
    if (name) existing.name = name;
    if (avatarUrl) existing.avatarUrl = avatarUrl;
  } else {
    if (room.players.length >= tournament.entries.length) return { error: "Tournament room is full" };
    // Color = this entrant's fixed position in join order, so it never
    // depends on who happens to connect (or reconnect) first.
    const color = ALL_COLORS[tournament.entries.findIndex((e) => e.userId === userId) % ALL_COLORS.length];
    room.players.push({ socketId, userId, color, name, connected: true, avatarUrl, ready: true });
  }

  // Every paid entrant is present - kick the match off immediately, no
  // lobby/ready-up step, since entering the tournament already was the
  // commitment to play.
  if (!room.started && room.players.length === tournament.entries.length) {
    const isTeamMode = room.players.length === 2;
    let activeColors: PlayerColor[];

    if (isTeamMode) {
      room.players[0].color = "RED";
      room.players[0].teammateColor = "YELLOW";
      room.players[1].color = "GREEN";
      room.players[1].teammateColor = "BLUE";
      activeColors = ["RED", "GREEN", "YELLOW", "BLUE"];
    } else {
      activeColors = room.players.map((p) => p.color);
    }

    room.gameState = createInitialGameState(activeColors, [], isTeamMode);
    room.started = true;
  }

  return room;
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

  const isTeamMode = room.players.length === 2;
  let activeColors: PlayerColor[];

  if (isTeamMode) {
    // Deterministic team assignment regardless of whatever colors they
    // happened to hold during lobby churn: first joiner (by array order)
    // is Red+Yellow, second is Green+Blue.
    room.players[0].color = "RED";
    room.players[0].teammateColor = "YELLOW";
    room.players[1].color = "GREEN";
    room.players[1].teammateColor = "BLUE";
    activeColors = ["RED", "GREEN", "YELLOW", "BLUE"];
  } else {
    room.players.forEach((p) => {
      p.teammateColor = undefined;
    });
    activeColors = room.players.map((p) => p.color);
  }

  room.gameState = createInitialGameState(activeColors, [], isTeamMode);
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
  // In 2-player team mode, a player also controls their teammateColor
  // (Yellow if primary is Red, Blue if primary is Green) - so either match
  // counts as "it's their turn," not just an exact primary-color match.
  const controlsCurrentColor =
    !!player &&
    (player.color === room.gameState.currentTurnColor || player.teammateColor === room.gameState.currentTurnColor);
  if (!controlsCurrentColor) return null;

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

export async function handleSelectMove(
  roomId: string,
  socketId: string,
  tokenId: string,
  toPosition: number
): Promise<Room | null> {
  const room = rooms.get(roomId);
  if (!room || !room.gameState || !room.pendingRoll) return null;

  const player = room.players.find((p) => p.socketId === socketId);
  // Same teammateColor allowance as handleRoll - see comment there.
  const controlsCurrentColor =
    !!player &&
    (player.color === room.gameState.currentTurnColor || player.teammateColor === room.gameState.currentTurnColor);
  if (!controlsCurrentColor) return null;

  // Matched on tokenId AND toPosition, not tokenId alone - a token can now
  // have two valid destinations at once (one per die value), so tokenId by
  // itself would be ambiguous about which one was actually chosen.
  const move = room.pendingMoves.find((m) => m.tokenId === tokenId && m.toPosition === toPosition);
  if (!move) return null;

  const applied = applyMove(room.gameState, move);

  if (applied.winner) {
    room.gameState = applied;
    room.pendingRoll = null;
    room.pendingMoves = [];

    if (!room.resultRecorded) {
      room.resultRecorded = true;
      const matchId = await recordMatchResult(room);
      if (room.tournamentId) await settleTournamentMatch(room, matchId);
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

async function recordMatchResult(room: Room): Promise<string | undefined> {
  if (!room.gameState?.winner) return undefined;

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
    return match.id;
  } catch (err) {
    console.error("Failed to record match result:", err);
    return undefined;
  }
}

// Called once a tournament room's match has a recorded winner. Pays the
// tournament's coin prize pool out to the winner by calling the settle
// route - the same trusted internal endpoint Stage 3 built and locked
// behind INTERNAL_API_SECRET specifically for this handler to call, now
// that there's a real match result to hand it. This is a pure credit:
// entry fees were already deducted (and pooled) when each player joined,
// so nothing here deducts anything.
async function settleTournamentMatch(room: Room, matchId: string | undefined) {
  if (!room.tournamentId || room.tournamentSettled) return;
  if (!room.gameState?.winner) return;

  const winnerColor = room.gameState.winner;
  // In team mode the winning "color" can be a teammateColor holder too.
  const winnerPlayer = room.players.find((p) => p.color === winnerColor || p.teammateColor === winnerColor);
  if (!winnerPlayer) {
    console.error(`Tournament ${room.tournamentId}: no player controls winning color ${winnerColor}`);
    return;
  }

  if (!process.env.INTERNAL_API_SECRET) {
    console.error(`Tournament ${room.tournamentId}: INTERNAL_API_SECRET not set, cannot settle`);
    return;
  }

  room.tournamentSettled = true;

  try {
    const res = await fetch(`${APP_BASE_URL}/api/tournaments/${room.tournamentId}/settle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_API_SECRET,
      },
      body: JSON.stringify({ winnerId: winnerPlayer.userId, matchId }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error(`Failed to settle tournament ${room.tournamentId}:`, body.error ?? res.status);
      // Allow a retry on a later event (e.g. checkLastPlayerStanding after
      // a disconnect) rather than leaving the pot permanently unpaid.
      room.tournamentSettled = false;
      return;
    }

    console.log(`Tournament ${room.tournamentId} settled, winner: ${winnerPlayer.name}`);
  } catch (err) {
    console.error(`Failed to settle tournament ${room.tournamentId}:`, err);
    room.tournamentSettled = false;
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

// If it's a disconnected player's turn and 2+ others are still connected,
// their turn just gets passed along after the grace period - nothing is
// rolled or moved on their behalf, they're simply skipped.
export function skipDisconnectedTurn(roomId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room || !room.started || !room.gameState || room.gameState.winner) return null;

  const currentColor = room.gameState.currentTurnColor;
  // Match on primary color OR teammate color - in 2-player team mode the
  // player controlling Yellow/Blue is found via teammateColor, not color.
  const currentPlayer = room.players.find((p) => p.color === currentColor || p.teammateColor === currentColor);

  // A connected player controls this color - nothing to skip.
  if (currentPlayer && currentPlayer.connected) return null;

  // Someone controls this color but they're disconnected - only auto-skip
  // if there's still a real match going (2+ connected players); a lone
  // straggler is "last player standing" territory instead.
  if (currentPlayer) {
    const connectedCount = room.players.filter((p) => p.connected).length;
    if (connectedCount < 2) return null;
  }

  // (If currentPlayer is undefined, this color has no controller at all -
  // a genuinely empty/uncontrolled seat - so we fall through and skip it
  // unconditionally below.)

  const activeColors = room.gameState.players.filter((p) => p.isActive).map((p) => p.color);
  const currentIndex = activeColors.indexOf(currentColor);
  const nextColor = activeColors[(currentIndex + 1) % activeColors.length];

  room.pendingRoll = null;
  room.pendingMoves = [];
  room.consecutiveSixes = 0;
  room.gameState = { ...room.gameState, currentTurnColor: nextColor };

  return room;
}

// If a live bet match drops to exactly one connected player, the match is
// over right there - that one player is the winner and takes the entire
// pot (their own bet plus everyone else's). Anyone who disconnected has
// forfeited their stake - there is no refund path, by design.
export async function checkLastPlayerStanding(roomId: string): Promise<Room | null> {
  const room = rooms.get(roomId);
  if (!room || !room.started || !room.gameState || room.gameState.winner) return null;

  const connectedPlayers = room.players.filter((p) => p.connected);
  if (connectedPlayers.length !== 1) return null;

  const survivor = connectedPlayers[0];
  room.gameState = { ...room.gameState, winner: survivor.color };
  room.pendingRoll = null;
  room.pendingMoves = [];

  if (!room.resultRecorded) {
    room.resultRecorded = true;
    const matchId = await recordMatchResult(room);
    if (room.tournamentId) await settleTournamentMatch(room, matchId);
  }

  return room;
}

export function removePlayer(
  roomId: string,
  hostUserId: string,
  targetUserId: string
): { room: Room; removedSocketId: string } | { error: string } | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.started) return { error: "Cannot remove players after the game has started" };
  if (hostUserId !== room.hostUserId) return { error: "Only the host can remove players" };
  if (targetUserId === room.hostUserId) return { error: "The host can't remove themselves" };

  const index = room.players.findIndex((p) => p.userId === targetUserId);
  if (index === -1) return { error: "Player not found" };

  const [removed] = room.players.splice(index, 1);
  return { room, removedSocketId: removed.socketId };
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