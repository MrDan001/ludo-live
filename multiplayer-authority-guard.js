const { Server } = require("socket.io");

// The multiplayer rule engine is the single authority for gameplay.
// server.js still owns lobby/chat concerns, but its legacy gameplay listeners
// must not also register on the same socket or they can generate a second
// dice/state source and race the canonical multiplayer engine.
if (!Server.prototype.__ludoAuthorityGuard) {
  Server.prototype.__ludoAuthorityGuard = true;
  const patchedOn = Server.prototype.on;
  Server.prototype.on = function (event, listener) {
    if (event !== "connection") return patchedOn.call(this, event, listener);
    const guardedListener = (socket) => {
      const originalSocketOn = socket.on.bind(socket);
      socket.on = (name, ...args) => {
        if (name === "start-game" || name === "game-roll" || name === "game-move") return socket;
        return originalSocketOn(name, ...args);
      };
      try {
        return listener(socket);
      } finally {
        socket.on = originalSocketOn;
      }
    };
    return patchedOn.call(this, event, guardedListener);
  };
}
