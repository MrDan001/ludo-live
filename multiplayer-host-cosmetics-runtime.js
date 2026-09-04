// Host-authoritative cosmetics bridge for online multiplayer.
// Cosmetic state only; game rules and move state are untouched.
const { Socket } = require('socket.io');
const PATCH = '__ludoHostCosmeticsRuntimeV2';
const proto = Socket.prototype;
if (!proto[PATCH]) {
  proto[PATCH] = true;
  const originalOnevent = proto.onevent;
  proto.onevent = function (packet) {
    try {
      const data = packet && packet.data;
      if (Array.isArray(data) && data[0] === 'host-cosmetics-update') {
        const roomCode = String(this.data?.roomCode || '').trim().toUpperCase();
        if (roomCode) {
          const payload = data[1] || {};
          const cosmetics = {
            board: String(payload.board || 'classic').slice(0, 80),
            dice: String(payload.dice || 'classic').slice(0, 80),
            yard: String(payload.yard || '').slice(0, 120),
          };
          this.to(roomCode).emit('host-cosmetics', cosmetics);
        }
        return;
      }
    } catch (e) {
      console.error('host cosmetics runtime', e);
    }
    return originalOnevent.call(this, packet);
  };
}
