const { Server } = require("socket.io");

// The canonical multiplayer rule engine owns the 2/2 and 4/4 game lifecycle.
// server.js remains responsible for rooms/chat/friends, but its legacy game
// handlers must not register alongside multiplayer-rules.js.
if (!Server.prototype.__ludoAuthorityGuard) {
  Server.prototype.__ludoAuthorityGuard = true;
  const patchedOn = Server.prototype.on;

  Server.prototype.on = function (event, listener) {
    if (event !== "connection") return patchedOn.call(this, event, listener);

    const guardedListener = (socket) => {
      const originalSocketOn = socket.on.bind(socket);

      // Once the canonical engine starts a match, keep the lobby room alive
      // while both clients transition into MultiplayerGame.
      originalSocketOn("__ludo_game_started__", () => {
        socket.data.ludoGameStarted = true;
      });

      socket.on = (name, ...args) => {
        // These events belong exclusively to multiplayer-rules.js.
        if (name === "game-roll" || name === "game-move" || name === "start-game") {
          return socket;
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

      return listener(socket);
    };

    return patchedOn.call(this, event, guardedListener);
  };
}
