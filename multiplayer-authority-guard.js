const { Server } = require("socket.io");

// The multiplayer rule engine remains the single gameplay authority.
// This guard also protects a 2-player room during the lobby -> game handoff:
// when the host navigates away, Socket.IO disconnects the lobby socket. The
// old room cleanup treated that disconnect as the host leaving and destroyed
// the room, which kicked the other player back to Online Space. Once a match
// has been started, the room must remain alive for the game/reconnect flow.
if (!Server.prototype.__ludoAuthorityGuard) {
  Server.prototype.__ludoAuthorityGuard = true;
  const patchedOn = Server.prototype.on;

  Server.prototype.on = function (event, listener) {
    if (event !== "connection") return patchedOn.call(this, event, listener);

    const guardedListener = (socket) => {
      const originalSocketOn = socket.on.bind(socket);

      // The friend must receive the same start intent before its lobby socket
      // disconnects. The server's room remains alive while both clients move
      // into MultiplayerGame.
      originalSocketOn("__ludo_game_started__", () => {
        socket.data.ludoGameStarted = true;
      });

      socket.on = (name, ...args) => {
        if (name === "game-roll" || name === "game-move") return socket;

        if (name === "start-game") {
          const originalListener = args[0];
          if (typeof originalListener !== "function") return originalSocketOn(name, ...args);
          const wrappedStart = (...eventArgs) => {
            socket.data.ludoGameStarted = true;
            const roomCode = socket.data.roomCode;
            if (roomCode) socket.to(roomCode).emit("__ludo_game_started__");
            return originalListener(...eventArgs);
          };
          return originalSocketOn(name, wrappedStart, ...args.slice(1));
        }

        if (name === "disconnect") {
          const originalDisconnect = args[0];
          if (typeof originalDisconnect !== "function") return originalSocketOn(name, ...args);
          const wrappedDisconnect = (...eventArgs) => {
            if (socket.data.ludoGameStarted) return;
            return originalDisconnect(...eventArgs);
          };
          return originalSocketOn(name, wrappedDisconnect, ...args.slice(1));
        }

        return originalSocketOn(name, ...args);
      };

      try {
        return listener(socket);
      } finally {
        // Keep the wrapper active for the socket lifetime so the disconnect
        // handler registered by server.js is protected after connection setup.
      }
    };

    return patchedOn.call(this, event, guardedListener);
  };
}
