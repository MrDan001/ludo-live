// Reliability bridge for the in-room stake agreement UI.
// This is intentionally separate from Ludo rules and wallet settlement.
// It provides a second, explicit event path for the host's stake action so a
// Socket.IO listener-order/runtime mismatch cannot leave the UI on "Setting…".
const { Socket } = require('socket.io');
const { rooms, state, validStake, broadcastState, MIN_STAKE, MAX_STAKE } = require('./bet-system');

if (!Socket.prototype.__ludoBetRuntimeFixPatched) {
  Socket.prototype.__ludoBetRuntimeFixPatched = true;
  const originalOn = Socket.prototype.on;
  Socket.prototype.on = function(event, listener) {
    if (event === 'set-stake-fallback') {
      return originalOn.call(this, event, (payload = {}) => {
        const code = String(this.data?.roomCode || '').trim().toUpperCase();
        const room = code ? rooms.get(code) : null;
        const member = room?.members.get(this.id);
        const requested = Math.trunc(Number(payload?.stake || 0));
        if (!room || !member?.host) return this.emit('room-error', 'Only the host can set the agreed stake.');
        if (room.locked) return this.emit('room-error', 'The stake is already locked for this match.');
        if (!validStake(requested)) return this.emit('room-error', `Stake must be between ${MIN_STAKE} and ${MAX_STAKE} coins.`);
        if (room.stakedPlayers.size > 0 && requested !== room.stake) return this.emit('room-error', 'The stake cannot change after a player has confirmed it.');
        room.stake = requested;
        room.stakedPlayers.clear();
        room.betStatus = 'open';
        broadcastState(this.nsp, room);
        this.nsp.to(room.code).emit('bet-agreed', { stake: requested, pot: requested * room.roomSize });
      });
    }
    return originalOn.call(this, event, listener);
  };
}
