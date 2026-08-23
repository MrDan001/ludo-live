const { Server } = require('socket.io');

// This preload adds an authoritative forfeit event without replacing the
// existing room/game implementation. It works with multiplayer-rules.js,
// which owns the live game state in its closure.
const originalOn = Server.prototype.on;
if (!Server.prototype.__ludoForfeitPatched) {
  Server.prototype.__ludoForfeitPatched = true;
  Server.prototype.on = function (event, listener) {
    if (event !== 'connection' || listener.__ludoForfeitWrapped) return originalOn.call(this, event, listener);
    const wrapped = (socket) => {
      listener(socket);
      installForfeitHandler(socket);
    };
    wrapped.__ludoForfeitWrapped = true;
    return originalOn.call(this, event, wrapped);
  };
}

function installForfeitHandler(socket) {
  socket.on('game-forfeit', ({ reason = 'player-forfeit' } = {}) => {
    const pid = String(socket.data.playerId || socket.data.__ludoPid || '').trim();
    const code = String(socket.data.roomCode || '').trim().toUpperCase();
    if (!pid || !code) return;

    // multiplayer-rules.js exposes its state through the socket's game-state
    // stream. The forfeit event is also sent to the server-side room so the
    // normal client result handling can immediately end the board.
    socket.emit('game-forfeited', {
      playerId: pid,
      roomCode: code,
      reason: String(reason).slice(0, 120),
    });

    // Broadcast a deterministic result. The active opponent is identified by
    // the other connected socket(s); the game UI then stops accepting input.
    const sockets = socket.nsp.sockets;
    for (const [id, peer] of sockets) {
      if (id === socket.id) continue;
      if (String(peer.data.roomCode || '').toUpperCase() !== code) continue;
      const peerPid = String(peer.data.playerId || peer.data.__ludoPid || '').trim();
      if (!peerPid) continue;
      peer.emit('game-forfeit-result', {
        loserId: pid,
        winnerId: peerPid,
        roomCode: code,
      });
      socket.emit('game-forfeit-result', {
        loserId: pid,
        winnerId: peerPid,
        roomCode: code,
      });
      return;
    }
  });
}
