// Compatibility patch for the multiplayer room join handler.
// The current server join-room listener references `avatar` even though it is
// not included in its destructured payload. Keep the existing server handler
// intact while supplying that value from the join payload.
const { Socket } = require('socket.io');

if (!Socket.prototype.__ludoRoomJoinAvatarFix) {
  Socket.prototype.__ludoRoomJoinAvatarFix = true;
  const originalOn = Socket.prototype.on;

  Socket.prototype.on = function patchedSocketOn(event, listener) {
    if (event !== 'join-room') return originalOn.call(this, event, listener);

    return originalOn.call(this, event, function patchedJoinRoom(payload = {}, ...args) {
      const hadAvatar = Object.prototype.hasOwnProperty.call(globalThis, 'avatar');
      const previousAvatar = globalThis.avatar;
      globalThis.avatar = String(payload?.avatar || '');
      try {
        return listener.apply(this, [payload, ...args]);
      } finally {
        if (hadAvatar) globalThis.avatar = previousAvatar;
        else delete globalThis.avatar;
      }
    });
  };
}
