// ROOM_LIFECYCLE_CLEANUP
// Keeps abandoned multiplayer rooms from lingering and transfers host ownership
// immediately when the current host leaves before the match starts.
// This preload intentionally does not change Ludo movement/rules or bet settlement.

const roomParents = new WeakMap();
const roomIndex = new Map();
const originalMapSet = Map.prototype.set;
const originalMapDelete = Map.prototype.delete;

Map.prototype.set = function patchedSet(key, value) {
  if (value && value.members instanceof Map && value.code && value.hostId !== undefined && value.roomSize !== undefined) {
    const code = String(value.code).trim().toUpperCase();
    const meta = { parent: this, code, room: value };
    roomParents.set(value.members, meta);
    roomIndex.set(code, meta);
  }
  return originalMapSet.call(this, key, value);
};

Map.prototype.delete = function patchedDelete(key) {
  const result = originalMapDelete.call(this, key);
  const meta = roomParents.get(this);
  if (result && meta && this.size === 0) {
    const currentRoom = meta.parent.get(meta.code);
    if (currentRoom && currentRoom.members === this) originalMapDelete.call(meta.parent, meta.code);
    roomParents.delete(this);
    if (roomIndex.get(meta.code)?.room === meta.room) roomIndex.delete(meta.code);
  }
  return result;
};

const { Socket } = require('socket.io');
if (!Socket.prototype.__ludoImmediateRoomLifecyclePatched) {
  Socket.prototype.__ludoImmediateRoomLifecyclePatched = true;
  const previousOn = Socket.prototype.on;
  Socket.prototype.on = function patchedSocketOn(event, listener) {
    if (event !== 'disconnect') return previousOn.call(this, event, listener);

    return previousOn.call(this, event, (...args) => {
      const code = String(this.data?.roomCode || '').trim().toUpperCase();
      const meta = code ? roomIndex.get(code) : null;
      const room = meta?.room;
      const member = room?.members?.get(this.id);
      const wasHost = !!member && (room.hostId === this.id || room.hostPlayerId === (member.playerId || member.id));

      // server.js has an old special-case that closes 2-player rooms when the
      // host disconnects. Temporarily avoid that branch so the remaining player
      // can become host immediately, which is the intended room contract now.
      const originalSize = room?.roomSize;
      if (wasHost && room && originalSize === 2) room.roomSize = 3;

      let result;
      try {
        result = listener.apply(this, args);
      } finally {
        if (room && originalSize === 2) room.roomSize = originalSize;
      }

      const current = code ? roomIndex.get(code)?.room : null;
      if (!current) return result;

      // No members remain: delete the room registry entry immediately.
      if (current.members.size === 0) {
        const parent = roomIndex.get(code)?.parent;
        if (parent) originalMapDelete.call(parent, code);
        roomIndex.delete(code);
        return result;
      }

      // A non-empty pre-game room gets a new host immediately. There is no
      // five-second host-pending window anymore.
      if (wasHost && current.members.size > 0 && !current.game) {
        if (current.hostTimer) clearTimeout(current.hostTimer);
        current.hostTimer = null;
        current.hostPending = false;
        current.hostEligible = false;

        const candidates = [...current.members.values()];
        const nextHost = candidates[Math.floor(Math.random() * candidates.length)];
        if (nextHost) {
          for (const m of candidates) m.host = false;
          nextHost.host = true;
          nextHost.ready = true;
          current.hostId = nextHost.id;
          current.hostPlayerId = nextHost.playerId || nextHost.id;
          try {
            const io = this.nsp;
            io.to(code).emit('host-transferred', {
              roomCode: code,
              hostId: nextHost.id,
              hostPlayerId: nextHost.playerId || nextHost.id,
              reason: 'The previous host left. Host ownership was transferred immediately.'
            });
            io.to(code).emit('roster', [...current.members.values()]);
            io.emit('room-list', [...roomIndex.values()]
              .map(x => x.room)
              .filter(Boolean)
              .map(r => ({
                code: r.code,
                players: r.members.size,
                roomSize: r.roomSize,
                hostName: r.members.get(r.hostId)?.name || 'Host',
                board: r.members.get(r.hostId)?.board || 'classic'
              }))
              .filter(r => r.players < r.roomSize));
          } catch {}
        }
      }
      return result;
    });
  };
}
