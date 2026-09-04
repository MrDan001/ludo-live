// Host-authoritative cosmetics bridge for online multiplayer.
// This is intentionally cosmetic-only: it never changes game rules or move state.
const { Socket } = require('socket.io');
const PATCH = '__ludoHostCosmeticsRuntimeV1';
const proto = Socket.prototype;
if (!proto[PATCH]) {
  proto[PATCH] = true;
  const originalOn = proto.on;
  proto.on = function (event, listener) {
    if (event !== 'host-cosmetics-update') return originalOn.call(this, event, listener);
    return originalOn.call(this, event, (payload = {}) => {
      const roomCode = String(this.data?.roomCode || '').trim().toUpperCase();
      if (!roomCode) return;
      const cosmetics = {
        board: String(payload.board || 'classic').slice(0, 80),
        dice: String(payload.dice || 'classic').slice(0, 80),
        yard: String(payload.yard || '').slice(0, 120),
      };
      this.to(roomCode).emit('host-cosmetics', cosmetics);
    });
  };
}
