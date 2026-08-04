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
} from "./rooms";

type RTCSessionDescriptionInit = { type: string; sdp?: string };
type RTCIceCandidateInit = { candidate?: string; sdpMid?: string | null; sdpMLineIndex?: number | null };

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

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
      const room = joinRoom(roomId, socket.id, userId, name || "Player", avatarUrl);
      if (!room) {
        socket.emit("room:error", { message: "Could not join room (full, started, or doesn't exist)" });
        return;
      }
      socket.join(roomId);
      const me = room.players.find((p) => p.socketId === socket.id)!;
      socket.emit("room:joined", { roomId: room.id, yourColor: me.color });
      io.to(roomId).emit("room:update", room);
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

  socket.on("game:roll", ({ roomId }: { roomId: string }) => {
    const result = handleRoll(roomId, socket.id);
    if (!result) return;
    io.to(roomId).emit("room:update", result.room);
  });

  socket.on("game:selectMove", async ({ roomId, tokenId }: { roomId: string; tokenId: string }) => {
    const room = await handleSelectMove(roomId, socket.id, tokenId);
    if (!room) return;
    io.to(roomId).emit("room:update", room);
  });

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

  socket.on("disconnect", () => {
    const room = markDisconnected(socket.id);
    if (room) io.to(room.id).emit("room:update", room);
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on http://localhost:${PORT}`);
});