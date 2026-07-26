import {
    GameState,
    PlayerColor,
    ALL_COLORS,
    createInitialGameState,
  } from "../lib/engine/gameState";
  import { rollTwoDice, DiceRoll } from "../lib/engine/dice";
  import { getValidMoves, applyMove, getNextTurnColor, MoveOption } from "../lib/engine/moves";
  
  export interface RoomPlayer {
    socketId: string;
    color: PlayerColor;
    name: string;
    connected: boolean;
  }
  
  export interface Room {
    id: string;
    players: RoomPlayer[];
    gameState: GameState | null;
    started: boolean;
    pendingRoll: DiceRoll | null;
    pendingMoves: MoveOption[];
    consecutiveSixes: number;
  }
  
  const rooms = new Map<string, Room>();
  
  export function generateRoomId(): string {
    let id: string;
    do {
      id = Math.floor(1000 + Math.random() * 9000).toString();
    } while (rooms.has(id));
    return id;
  }
  
  export function createRoom(hostSocketId: string, hostName: string): Room {
    const id = generateRoomId();
    const room: Room = {
      id,
      players: [{ socketId: hostSocketId, color: "RED", name: hostName, connected: true }],
      gameState: null,
      started: false,
      pendingRoll: null,
      pendingMoves: [],
      consecutiveSixes: 0,
    };
    rooms.set(id, room);
    return room;
  }
  
  export function joinRoom(roomId: string, socketId: string, name: string): Room | null {
    const room = rooms.get(roomId);
    if (!room) return null;
    if (room.started) return null;
    if (room.players.length >= 4) return null;
  
    const usedColors = new Set(room.players.map((p) => p.color));
    const nextColor = ALL_COLORS.find((c) => !usedColors.has(c));
    if (!nextColor) return null;
  
    room.players.push({ socketId, color: nextColor, name, connected: true });
    return room;
  }
  
  export function getRoom(roomId: string): Room | undefined {
    return rooms.get(roomId);
  }
  
  export function startGame(roomId: string): Room | null {
    const room = rooms.get(roomId);
    if (!room || room.players.length < 2) return null;
  
    const activeColors = room.players.map((p) => p.color);
    room.gameState = createInitialGameState(activeColors, []);
    room.started = true;
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
  
  export function handleSelectMove(roomId: string, socketId: string, tokenId: string): Room | null {
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
      return room;
    }
  
    const forfeited = room.consecutiveSixes >= 3;
    const nextColor = getNextTurnColor(applied, room.pendingRoll, forfeited ? 3 : room.consecutiveSixes);
    room.gameState = { ...applied, currentTurnColor: nextColor, consecutiveSixes: forfeited ? 0 : room.consecutiveSixes };
    room.pendingRoll = null;
    room.pendingMoves = [];
  
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