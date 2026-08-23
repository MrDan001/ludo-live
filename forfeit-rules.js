const { Server } = require('socket.io');

const endedRooms = new Map();
const originalOn = Server.prototype.on;
if (!Server.prototype.__ludoForfeitPatched) {
  Server.prototype.__ludoForfeitPatched = true;
  Server.prototype.on = function (event, listener) {
    if (event !== 'connection' || listener.__ludoForfeitWrapped) return originalOn.call(this, event, listener);
    const wrapped = (socket) => { listener(socket); installForfeitHandler(socket); };
    wrapped.__ludoForfeitWrapped = true;
    return originalOn.call(this, event, wrapped);
  };
}

function installForfeitHandler(socket) {
  const originalOnevent = socket.onevent.bind(socket);
  socket.onevent = (packet) => {
    const event = packet?.data?.[0];
    const payload = packet?.data?.[1] || {};
    const code = String(socket.data.roomCode || payload?.roomCode || '').trim().toUpperCase();
    if (code && endedRooms.has(code) && ['game-roll','game-move','start-game'].includes(event)) return;
    return originalOnevent(packet);
  };

  socket.on('game-forfeit', ({ roomCode, playerId, reason = 'player-forfeit' } = {}) => {
    const pid = String(playerId || socket.data.playerId || socket.data.__ludoPid || '').trim();
    const code = String(roomCode || socket.data.roomCode || '').trim().toUpperCase();
    if (!pid || !code || endedRooms.has(code)) return;

    const peers = [];
    for (const [, peer] of socket.nsp.sockets) {
      if (peer.id === socket.id) continue;
      if (String(peer.data.roomCode || '').trim().toUpperCase() !== code) continue;
      const peerPid = String(peer.data.playerId || peer.data.__ludoPid || '').trim();
      if (peerPid) peers.push({ socket: peer, playerId: peerPid });
    }
    const winner = peers[0];
    if (!winner) return socket.emit('game-forfeit-error', { message: 'No opponent is available to receive the win.' });

    const result = { status: 'forfeited', loserId: pid, winnerId: winner.playerId, roomCode: code, reason: String(reason).slice(0,120) };
    endedRooms.set(code, result);
    socket.nsp.to(code).emit('game-forfeit-result', result);
    socket.nsp.to(code).emit('game-state', { status:'finished', currentPlayerId:null, dice:null, pendingMove:null, sixStreak:0, winnerId:winner.playerId, result:'forfeit' });
    socket.emit('game-forfeit-result', result);
  });
}
