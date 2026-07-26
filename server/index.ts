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
} from "./rooms";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("room:create", ({ name }: { name: string }) => {
    const room = createRoom(socket.id, name || "Player");
    socket.join(room.id);
    socket.emit("room:joined", { roomId: room.id, yourColor: "RED" });
    io.to(room.id).emit("room:update", room);
  });

  socket.on("room:join", ({ roomId, name }: { roomId: string; name: string }) => {
    const room = joinRoom(roomId, socket.id, name || "Player");
    if (!room) {
      socket.emit("room:error", { message: "Could not join room (full, started, or doesn't exist)" });
      return;
    }
    socket.join(roomId);
    const me = room.players.find((p) => p.socketId === socket.id)!;
    socket.emit("room:joined", { roomId: room.id, yourColor: me.color });
    io.to(roomId).emit("room:update", room);
  });

  socket.on("room:start", ({ roomId }: { roomId: string }) => {
    const room = startGame(roomId);
    if (!room) {
      socket.emit("room:error", { message: "Need at least 2 players to start" });
      return;
    }
    io.to(roomId).emit("room:update", room);
  });

  socket.on("game:roll", ({ roomId }: { roomId: string }) => {
    const result = handleRoll(roomId, socket.id);
    if (!result) return;
    io.to(roomId).emit("room:update", result.room);
  });

  socket.on("game:selectMove", ({ roomId, tokenId }: { roomId: string; tokenId: string }) => {
    const room = handleSelectMove(roomId, socket.id, tokenId);
    if (!room) return;
    io.to(roomId).emit("room:update", room);
  });

  socket.on("disconnect", () => {
    const room = markDisconnected(socket.id);
    if (room) io.to(room.id).emit("room:update", room);
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = 4000;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on http://localhost:${PORT}`);
});