// Refresh-safe multiplayer room lifecycle.
// A browser refresh/network reconnect is a temporary socket disconnect, not an intentional leave.
// Explicit `leave-room` is marked intentional and therefore remains immediate.
const { Socket } = require('socket.io');

if (!Socket.prototype.__ludoRefreshPersistencePatched) {
  Socket.prototype.__ludoRefreshPersistencePatched = true;
  const originalOn = Socket.prototype.on;
  Socket.prototype.on = function(event, listener) {
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
      // the same room. The normal join-room handler replaces the old socket
      // entry by playerId, so the delayed disconnect becomes harmless after a
      // successful refresh. If the player never returns, normal room cleanup
      // runs after the grace period.
      const socket = this;
      socket.data.roomRefreshIntent = true;
      setTimeout(() => {
        if (!socket.data?.roomRefreshIntent) return;
        listener.apply(socket, args);
      }, 5000);
    });
  };
}
