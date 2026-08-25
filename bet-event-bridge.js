// Authoritative in-room betting event bridge.
//
// Why this exists:
// The application has several legacy multiplayer modules that wrap Socket.IO
// registration. The betting UI must not depend on a particular socket.on()
// registration order. Socket.IO's onAny() receives every incoming event, so this
// bridge gives the stake agreement flow one reliable server entry point while
// leaving the existing Ludo/game handlers untouched.
//
// This bridge does NOT deduct coins when the host agrees an amount. Wallet
// deduction remains in bet-system.lockBet(), which runs only when all players
// have staked and the match is starting.

const { rooms, state, validStake, broadcastState, MIN_STAKE, MAX_STAKE } = require('./bet-system');
const { Server } = require('socket.io');

if (!Server.prototype.__ludoBetEventBridgePatched) {
  Server.prototype.__ludoBetEventBridgePatched = true;
  const originalOn = Server.prototype.on;

  Server.prototype.on = function(event, listener) {
    if (event !== 'connection') return originalOn.call(this, event, listener);

    return originalOn.call(this, event, (socket) => {
      // Keep the application's normal connection handler first so roomCode,
      // playerId and the canonical room lifecycle are initialized as usual.
      listener(socket);

      socket.onAny((eventName, payload = {}) => {
        const event = String(eventName || '');
        const code = String(socket.data?.roomCode || payload?.roomCode || '').trim().toUpperCase();
        if (!code) return;

        // Rehydrate the betting-room projection whenever a player joins or
        // reconnects. This makes refreshes safe: the current stake state is
        // returned from the server again instead of starting at zero.
        if (event === 'join-room') {
          let room = rooms.get(code);
          if (!room) {
            const size = Number(payload?.roomSize) === 2 ? 2 : 4;
            room = { code, roomSize: size, stake: 0, members: new Map(), stakedPlayers: new Set(), locked: false, betStatus: 'open', betId: null };
            rooms.set(code, room);
          }
          room.roomSize = Number(payload?.roomSize) === 2 ? 2 : Number(payload?.roomSize) === 4 ? 4 : room.roomSize;
          const playerId = String(payload?.playerId || socket.data?.playerId || '').trim();
          const old = [...room.members.entries()].find(([, m]) => m.playerId === playerId);
          if (old) room.members.delete(old[0]);
          room.members.set(socket.id, {
            socketId: socket.id,
            playerId,
            name: String(payload?.name || 'Player').slice(0, 24),
            host: !!payload?.host || !!old?.[1]?.host,
            ready: !!payload?.host || !!old?.[1]?.ready
          });
          socket.emit('bet-room-state', state(room));
          return;
        }

        // Support the canonical event plus the legacy aliases that were used
        // by earlier room UI revisions. This makes the server tolerant of a
        // stale client bundle during a rolling deployment.
        const isSetStake = event === 'set-stake' || event === 'set-agreed-stake' || event === 'set-agreed' || event === 'set-bet-stake';
        if (isSetStake) {
          const room = rooms.get(code);
          const member = room?.members.get(socket.id);
          const requested = Math.trunc(Number(payload?.stake ?? payload?.amount ?? payload?.value ?? 0));
          if (!room || !member) return socket.emit('stake-error', 'Room state is not ready. Please refresh the room.');
          if (!member.host) return socket.emit('stake-error', 'Only the room host can set the agreed stake.');
          if (room.locked) return socket.emit('stake-error', 'The stake is already locked for this match.');
          if (!validStake(requested)) return socket.emit('stake-error', `Stake must be between ${MIN_STAKE} and ${MAX_STAKE} coins.`);
          if (room.stakedPlayers.size > 0 && requested !== room.stake) return socket.emit('stake-error', 'The stake cannot change after a player has confirmed it.');

          room.stake = requested;
          room.stakedPlayers.clear();
          room.betStatus = 'open';
          const pot = requested * room.roomSize;
          const nextState = state(room);
          socket.emit('bet-room-state', nextState);
          socket.nsp.to(code).emit('bet-room-state', nextState);
          socket.nsp.to(code).emit('bet-agreed', { stake: requested, pot });
          socket.emit('stake-set-confirmed', { stake: requested, pot });
          return;
        }

        if (event === 'stake' || event === 'stake-confirm' || event === 'confirm-stake' || event === 'stake-to-start') {
          const room = rooms.get(code);
          const member = room?.members.get(socket.id);
          if (!room || !member) return socket.emit('stake-error', 'Room state is not ready. Please refresh the room.');
          if (!validStake(room.stake)) return socket.emit('stake-error', 'The host has not set an agreed stake yet.');
          if (room.locked) return socket.emit('stake-error', 'The match stake is already locked.');
          room.stakedPlayers.add(socket.id);
          broadcastState(socket.nsp, room);
          socket.nsp.to(code).emit('stake-confirmed', { stake: room.stake, playerId: member.playerId || member.socketId });
          return;
        }

        if (event === 'leave-room') {
          const room = rooms.get(code);
          if (!room) return;
          room.members.delete(socket.id);
          room.stakedPlayers.delete(socket.id);
          if (room.members.size === 0) rooms.delete(code);
          else broadcastState(socket.nsp, room);
        }
      });
    });
  };
}
