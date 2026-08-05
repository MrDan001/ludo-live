import { createServer } from "http";
import { Server } from "socket.io";
import {
  createRoom,
  joinRoom,
  getRoom,
  startGame,
  handleRoll,
  handleSelectMove,
  markDisconnected,
  addChatMessage,
  toggleReady,
  setBetAmount,
  setGameMode,
  skipDisconnectedTurn,
  checkLastPlayerStanding,
  removePlayer,
} from "./rooms";

type RTCSessionDescriptionInit = { type: string; sdp?: string };
type RTCIceCandidateInit = { candidate?: string; sdpMid?: string | null; sdpMLineIndex?: number | null };

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// Grace period before a disconnected player's turn gets auto-played for
// them, so one dropped connection doesn't freeze the match for everyone
// else. Re-armed after every roll/move/disconnect - anything that could
// change whose turn it is.
const TURN_TIMEOUT_MS = 10_000;
const turnTimers = new Map<string, NodeJS.Timeout>();

function clearTurnTimer(roomId: string) {
  const t = turnTimers.get(roomId);
  if (t) {
    clearTimeout(t);
    turnTimers.delete(roomId);
  }
}

function scheduleAutoPlayCheck(roomId: string) {
  clearTurnTimer(roomId);

  const room = getRoom(roomId);
  if (!room || !room.started || !room.gameState || room.gameState.winner) return;

  const currentPlayer = room.players.find((p) => p.color === room.gameState!.currentTurnColor);
  if (!currentPlayer || currentPlayer.connected) return; // connected player's turn - nothing to schedule

  const connectedCount = room.players.filter((p) => p.connected).length;
  if (connectedCount < 2) return; // last-player-standing territory, not this mechanism

  const timer = setTimeout(() => {
    const updated = skipDisconnectedTurn(roomId);
    if (updated) {
      io.to(roomId).emit("room:update", updated);
    }
    // Re-check in case the newly-current player is also disconnected -
    // chains straight through multiple dropped players in a row.
    scheduleAutoPlayCheck(roomId);
  }, TURN_TIMEOUT_MS);

  turnTimers.set(roomId, timer);
}

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("room:create", ({ name, userId, avatarUrl }: { name: string; userId: string; avatarUrl?: string }) => {
    const room = createRoom(socket.id, userId, name || "Player", avatarUrl);
    socket.join(room.id);
    socket.emit("room:joined", { roomId: room.id, yourColor: "RED" });
    io.to(room.id).emit("room:update", room);
  });

  socket.on(
    "room:join",
    ({ roomId, name, userId, avatarUrl }: { roomId: string; name: string; userId: string; avatarUrl?: string }) => {
      const result = joinRoom(roomId, socket.id, userId, name || "Player", avatarUrl);
      if (!result) {
        socket.emit("room:error", { message: "Room not found" });
        return;
      }
      if ("error" in result) {
        socket.emit("room:error", { message: result.error });
        return;
      }
      socket.join(roomId);
      const me = result.players.find((p) => p.socketId === socket.id)!;
      socket.emit("room:joined", { roomId: result.id, yourColor: me.color });
      io.to(roomId).emit("room:update", result);

      // A reconnect may have just brought the current turn-holder back -
      // re-check whether the auto-skip timer still needs to be armed.
      scheduleAutoPlayCheck(result.id);
    }
  );

  socket.on("room:start", async ({ roomId, userId }: { roomId: string; userId: string }) => {
    const result = await startGame(roomId, userId);
    if (!result) {
      socket.emit("room:error", { message: "Room not found" });
      return;
    }
    if ("error" in result) {
      socket.emit("room:error", { message: result.error });
      return;
    }
    io.to(roomId).emit("room:update", result);
    scheduleAutoPlayCheck(roomId);
  });

  socket.on("room:toggleReady", ({ roomId }: { roomId: string }) => {
    const room = toggleReady(roomId, socket.id);
    if (!room) return;
    io.to(roomId).emit("room:update", room);
  });

  socket.on("room:setBet", ({ roomId, userId, amount }: { roomId: string; userId: string; amount: number }) => {
    const result = setBetAmount(roomId, userId, amount);
    if (!result) return;
    if ("error" in result) {
      socket.emit("room:error", { message: result.error });
      return;
    }
    io.to(roomId).emit("room:update", result);
  });

  socket.on("room:setMode", ({ roomId, userId, mode }: { roomId: string; userId: string; mode: string }) => {
    const result = setGameMode(roomId, userId, mode);
    if (!result) return;
    if ("error" in result) {
      socket.emit("room:error", { message: result.error });
      return;
    }
    io.to(roomId).emit("room:update", result);
  });

  socket.on(
    "room:removePlayer",
    ({ roomId, hostUserId, targetUserId }: { roomId: string; hostUserId: string; targetUserId: string }) => {
      const result = removePlayer(roomId, hostUserId, targetUserId);
      if (!result) return;
      if ("error" in result) {
        socket.emit("room:error", { message: result.error });
        return;
      }

      io.to(roomId).emit("room:update", result.room);

      const removedSocket = io.sockets.sockets.get(result.removedSocketId);
      if (removedSocket) {
        removedSocket.emit("room:kicked", { message: "The host removed you from the room" });
        removedSocket.leave(roomId);
      }
    }
  );

  socket.on("game:roll", ({ roomId }: { roomId: string }) => {
    const result = handleRoll(roomId, socket.id);
    if (!result) return;
    // Emitted separately from room:update, and always carries the real
    // rolled numbers - even when there were no valid moves and the room
    // state's pendingRoll gets cleared again in this same tick. The client
    // uses this as the single source of truth for what the dice display.
    io.to(roomId).emit("game:rolled", {
      d1: result.roll.d1,
      d2: result.roll.d2,
      hasValidMoves: result.moves.length > 0,
    });
    io.to(roomId).emit("room:update", result.room);
    scheduleAutoPlayCheck(roomId);
  });

  socket.on(
    "game:selectMove",
    async ({ roomId, tokenId, toPosition }: { roomId: string; tokenId: string; toPosition: number }) => {
      const room = await handleSelectMove(roomId, socket.id, tokenId, toPosition);
      if (!room) return;
      io.to(roomId).emit("room:update", room);
      scheduleAutoPlayCheck(roomId);
    }
  );

  // Room chat - free-text messages between players in a room
  socket.on("chat:message", ({ roomId, text }: { roomId: string; text: string }) => {
    const result = addChatMessage(roomId, socket.id, text, false);
    if (!result) {
      socket.emit("chat:error", { message: "Message could not be sent" });
      return;
    }
    io.to(roomId).emit("chat:new", result.message);
  });

  // Quick chat - one-tap preset phrases only (validated server-side against QUICK_CHAT_PRESETS)
  socket.on("chat:quick", ({ roomId, text }: { roomId: string; text: string }) => {
    const result = addChatMessage(roomId, socket.id, text, true);
    if (!result) {
      socket.emit("chat:error", { message: "Quick message could not be sent" });
      return;
    }
    io.to(roomId).emit("chat:new", result.message);
  });

  // WebRTC signaling relay - just passes messages between peers in the room
  socket.on("voice:join", ({ roomId }: { roomId: string }) => {
    socket.to(roomId).emit("voice:peer-joined", { socketId: socket.id });
  });

  socket.on("voice:offer", ({ roomId, targetId, offer }: { roomId: string; targetId: string; offer: RTCSessionDescriptionInit }) => {
    io.to(targetId).emit("voice:offer", { fromId: socket.id, offer });
  });

  socket.on("voice:answer", ({ targetId, answer }: { targetId: string; answer: RTCSessionDescriptionInit }) => {
    io.to(targetId).emit("voice:answer", { fromId: socket.id, answer });
  });

  socket.on("voice:ice-candidate", ({ targetId, candidate }: { targetId: string; candidate: RTCIceCandidateInit }) => {
    io.to(targetId).emit("voice:ice-candidate", { fromId: socket.id, candidate });
  });

  socket.on("voice:leave", ({ roomId }: { roomId: string }) => {
    socket.to(roomId).emit("voice:peer-left", { socketId: socket.id });
  });

  // Broadcasts a player's own mute state so peers can show accurate mic
  // icons for each other in the Voice Chat panel.
  socket.on("voice:mute-changed", ({ roomId, muted }: { roomId: string; muted: boolean }) => {
    socket.to(roomId).emit("voice:mute-changed", { socketId: socket.id, muted });
  });

  socket.on("disconnect", async () => {
    const room = markDisconnected(socket.id);
    if (room) {
      io.to(room.id).emit("room:update", room);

      // Did that disconnect just drop us to exactly one connected player?
      // If so, the match is over now - no need to arm the turn-skip timer
      // for a match that's already been decided.
      const resolved = await checkLastPlayerStanding(room.id);
      if (resolved) {
        clearTurnTimer(resolved.id);
        io.to(resolved.id).emit("room:update", resolved);
      } else {
        scheduleAutoPlayCheck(room.id);
      }
    }
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on http://localhost:${PORT}`);
});