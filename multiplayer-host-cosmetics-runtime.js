// Host-authoritative cosmetics bridge for online multiplayer.
// Cosmetic state only; game rules and move state are untouched.
const { Socket } = require('socket.io');
const PATCH = '__ludoHostCosmeticsRuntimeV5';
const proto = Socket.prototype;
const roomCosmetics = new Map();

globalThis.__ludoHostCosmeticsCleanup = (code) => {
  const normalized = String(code || '').trim().toUpperCase();
  if (normalized) roomCosmetics.delete(normalized);
};

if (!proto[PATCH]) {
  proto[PATCH] = true;
  const originalOnevent = proto.onevent;
  proto.onevent = function (packet) {
    try {
      const data = packet && packet.data;
      if (Array.isArray(data) && data[0] === 'host-cosmetics-update') {
        const roomCode = String(this.data?.roomCode || '').trim().toUpperCase();
        const senderId = String(this.data?.authUserId || this.data?.playerId || '').trim();
        const canonicalHost = String(globalThis.__ludoCanonicalHostForRoom?.(roomCode) || '').trim();
        if (!roomCode || !canonicalHost || canonicalHost !== senderId) return;
        const payload = data[1] || {};
        const cosmetics = {
          board: String(payload.board || 'classic').slice(0, 80),
          dice: String(payload.dice || 'classic').slice(0, 80),
          yard: String(payload.yard || '').slice(0, 120),
        };
        roomCosmetics.set(roomCode, cosmetics);
        this.to(roomCode).emit('host-cosmetics', cosmetics);
        return;
      }
      if (Array.isArray(data) && data[0] === 'join-room') {
        const roomCode = String(data[1]?.roomCode || '').trim().toUpperCase();
        const result = originalOnevent.call(this, packet);
        const cosmetics = roomCosmetics.get(roomCode);
        if (cosmetics && String(this.data?.roomCode || '').toUpperCase() === roomCode) this.emit('host-cosmetics', cosmetics);
        return result;
      }
    } catch (e) {
      console.error('host cosmetics runtime', e);
    }
    return originalOnevent.call(this, packet);
  };
}
module.exports = {};
