// Refresh-safe multiplayer room lifecycle.
// A browser refresh/network reconnect is a temporary socket disconnect, not an intentional leave.
// Explicit `leave-room` is marked intentional and therefore remains immediate.
const { Socket } = require('socket.io');
const betSystem = require('./bet-system');

if (!Socket.prototype.__ludoRefreshPersistencePatched) {
  Socket.prototype.__ludoRefreshPersistencePatched = true;
  const originalOn = Socket.prototype.on;

  Socket.prototype.on = function(event, listener) {
    if (event === 'join-room') {
      return originalOn.call(this, event, async (...args) => {
        const payload = args[0] || {};
        const code = String(payload.roomCode || '').trim().toUpperCase();
        const playerId = String(payload.playerId || '').trim();
        const result = await listener.apply(this, args);

        // The bet system keeps its own room registry. When a refreshed socket
        // replaces the old socket, carry the player's stake/ready/host state
        // onto the replacement socket instead of treating refresh as a new join.
        try {
          const room = betSystem.rooms.get(code);
          if (room && playerId) {
            const replacement = room.members.get(this.id);
            const oldEntry = [...room.members.entries()].find(([sid, m]) => sid !== this.id && String(m.playerId || '').trim() === playerId);
            if (replacement && oldEntry) {
              const [oldSocketId, oldMember] = oldEntry;
              replacement.ready = !!oldMember.ready;
              replacement.host = !!oldMember.host;
              if (room.stakedPlayers.has(oldSocketId)) {
                room.stakedPlayers.delete(oldSocketId);
                room.stakedPlayers.add(this.id);
              }
              room.members.delete(oldSocketId);
            }
          }
        } catch {}
        return result;
      });
    }

    if (event === 'leave-room') {
      return originalOn.call(this, event, (...args) => {
        this.data.intentionalRoomLeave = true;
        this.data.roomRefreshIntent = false;
        return listener.apply(this, args);
      });
    }

    if (event !== 'disconnect') return originalOn.call(this, event, listener);

    return originalOn.call(this, event, (...args) => {
      if (this.data?.intentionalRoomLeave || !this.data?.roomCode) return listener.apply(this, args);

      // Give a refreshed page time to create its replacement socket and rejoin
      // the same room. If it never returns, the normal disconnect cleanup runs.
      const socket = this;
      socket.data.roomRefreshIntent = true;
      setTimeout(() => {
        if (!socket.data?.roomRefreshIntent) return;
        listener.apply(socket, args);
      }, 5000);
    });
  };
}
