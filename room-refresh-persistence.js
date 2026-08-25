// Refresh-safe multiplayer room lifecycle.
// A browser refresh is a temporary socket disconnect, not an intentional leave.
// Explicit `leave-room` remains immediate and is not delayed by this bridge.
const { Socket } = require('socket.io');

if (!Socket.prototype.__ludoRefreshPersistencePatched) {
  Socket.prototype.__ludoRefreshPersistencePatched = true;
  const originalOn = Socket.prototype.on;
  Socket.prototype.on = function(event, listener) {
    if (event !== 'disconnect') return originalOn.call(this, event, listener);

    return originalOn.call(this, event, (...args) => {
      if (!this.data?.roomRefreshIntent) return listener.apply(this, args);

      // Give the refreshed page time to create its replacement socket and
      // rejoin the same room. The existing join-room logic replaces the old
      // socket entry by playerId, so the delayed disconnect callback becomes
      // a no-op when the replacement is already present.
      const socket = this;
      setTimeout(() => {
        if (!socket.data?.roomRefreshIntent) return;
        listener.apply(socket, args);
      }, 5000);
    });
  };
}
