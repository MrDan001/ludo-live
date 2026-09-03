const { Socket } = require('socket.io');

if (Socket && !Socket.prototype.__ludoMultiplayerStakeCreateRoomFix) {
  Socket.prototype.__ludoMultiplayerStakeCreateRoomFix = true;
  const originalOn = Socket.prototype.on;
  Socket.prototype.on = function(event, listener) {
    if (event !== 'join-room') return originalOn.call(this, event, listener);
    return originalOn.call(this, event, async (...args) => {
      const payload = args[0] || {};
      this.data.__ludoCreatingRoom = !!payload.host;
      try {
        return await listener.apply(this, args);
      } finally {
        delete this.data.__ludoCreatingRoom;
      }
    });
  };
}
