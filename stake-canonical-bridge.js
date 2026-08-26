// Bridge the canonical multiplayer start flow with the authoritative staking system.
// This module is preloaded BEFORE multiplayer-canonical.js so its start-game
// wrapper runs before the canonical start handler. Free Play is excluded.
const { Socket } = require('socket.io');
const { rooms, state, broadcastState } = require('./bet-system');

if (!Socket.prototype.__ludoStakeCanonicalBridgePatched) {
  Socket.prototype.__ludoStakeCanonicalBridgePatched = true;
  const originalOn = Socket.prototype.on;
  Socket.prototype.on = function (event, listener) {
    if (event !== 'start-game') return originalOn.call(this, event, listener);
    return originalOn.call(this, event, async (...args) => {
      const roomCode = String(this.data?.roomCode || '').trim().toUpperCase();
      const room = roomCode ? rooms.get(roomCode) : null;
      // Free Play sends freePlay=true and never enters the staking pipeline.
      if (!room || this.data?.freePlay === true) return listener(...args);
      if (!room.stake || !room.stakedPlayers || room.stakedPlayers.size !== room.roomSize) return listener(...args);
      if (room.locked || room.betStatus === 'locked' || room.betStatus === 'settled') return listener(...args);
      try {
        const bet = require('./bet-system');
        const result = await bet.lockBet(room);
        if (!result.ok) return this.emit('start-error', result.error || 'Unable to compile the stakes.');
        broadcastState(this.nsp, room);
      } catch (error) {
        return this.emit('start-error', error instanceof Error ? error.message : 'Unable to compile the stakes.');
      }
      return listener(...args);
    });
  };
}
