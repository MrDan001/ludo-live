const { Socket } = require("socket.io");
const { applyMove, canMove, hasLegalMove, hasWon, playerColorsForSeats, tokenState } = require("./lib/ludoRules");

// Multiplayer game-authority patch. Bot-vs-Human and Tournament are not touched.
// server.js still owns rooms/ready/chat; this preload takes authoritative ownership
// of only the live game roll/move state so client-supplied positions cannot bypass rules.
if (!Socket.prototype.__ludoAuthorityPatched) {
  const originalOn = Socket.prototype.on;
  const liveRooms = new Map();
  Socket.prototype.__ludoAuthorityPatched = true;

  const roomOf = socket => String(socket?.data?.roomCode || "").trim().toUpperCase();
  const pidOf = socket => String(socket?.data?.playerId || "").trim();
  const makeTokens = () => {
    const tokens = {};
    for (const color of ["red", "yellow", "green", "blue"]) {
      tokens[color] = {};
      for (let id = 0; id < 4; id++) tokens[color][String(id)] = { position: 0 };
    }
    return tokens;
  };
  const flatTokens = room => Object.entries(room.tokens).flatMap(([color, ids]) => Object.entries(ids).map(([id, v]) => ({
    color, id: Number(id), position: Number(v.position) || 0, state: tokenState(Number(v.position) || 0),
  })));
  const syncTokens = (room, tokens) => {
    for (const t of tokens) {
      room.tokens[t.color] ||= {};
      room.tokens[t.color][String(t.id)] = { position: t.position };
    }
  };
  const snapshot = room => ({
    status: room.status,
    currentPlayerId: room.currentPlayerId,
    dice: room.dice,
    pendingMove: room.pendingMove,
    sixStreak: room.sixStreak,
    players: room.players.map(p => ({ playerId: p.playerId, name: p.name, seat: p.seat, colors: p.colors })),
    tokens: room.tokens,
    winnerId: room.winnerId || null,
  });
  const emitState = (socket, room) => socket.nsp.to(room.code).emit("game-state", snapshot(room));
  const nextPlayer = room => {
    const index = room.players.findIndex(p => p.playerId === room.currentPlayerId);
    const next = room.players[(index + 1) % room.players.length];
    return next?.playerId || null;
  };

  Socket.prototype.on = function(event, listener) {
    if (event === "join-room") {
      return originalOn.call(this, event, function(payload = {}) {
        const code = String(payload.roomCode || "").trim().toUpperCase();
        const pid = String(payload.playerId || "").trim();
        if (code && pid) {
          let shadow = liveRooms.get(code);
          if (!shadow) {
            shadow = { code, members: new Map(), players: [], status: "waiting", currentPlayerId: null, dice: null, pendingMove: null, sixStreak: 0, tokens: {}, winnerId: null };
            liveRooms.set(code, shadow);
          }
          shadow.members.set(pid, { playerId: pid, name: String(payload.name || "Player"), id: this.id });
        }
        const result = listener.apply(this, arguments);
        const shadow = liveRooms.get(code);
        if (shadow?.status === "playing") emitState(this, shadow);
        return result;
      });
    }

    if (event === "start-game") {
      return originalOn.call(this, event, function() {
        const result = listener.apply(this, arguments);
        const code = roomOf(this);
        const shadow = liveRooms.get(code);
        if (code && shadow) {
          const sockets = [...this.nsp.sockets.values()].filter(s => s.rooms?.has(code));
          for (const s of sockets) {
            const pid = pidOf(s);
            if (pid) shadow.members.set(pid, { playerId: pid, name: String(s.data?.profileName || shadow.members.get(pid)?.name || "Player"), id: s.id });
          }
          const source = [...shadow.members.values()];
          const players = source.map((m, seat) => ({
            playerId: m.playerId,
            name: m.name,
            seat,
            colors: playerColorsForSeats(source.length === 2 ? 2 : 4, seat),
          }));
          shadow.players = players;
          shadow.status = "playing";
          shadow.currentPlayerId = players[0]?.playerId || null;
          shadow.dice = null;
          shadow.pendingMove = null;
          shadow.sixStreak = 0;
          shadow.winnerId = null;
          shadow.tokens = makeTokens();
          this.nsp.to(code).emit("game-state", snapshot(shadow));
        }
        return result;
      });
    }

    if (event === "game-roll") {
      return originalOn.call(this, event, function() {
        const code = roomOf(this), pid = pidOf(this), room = liveRooms.get(code);
        if (!room || room.status !== "playing" || room.currentPlayerId !== pid || room.pendingMove !== null) return;
        const value = 1 + Math.floor(Math.random() * 6);
        room.dice = value;
        room.pendingMove = value;
        this.nsp.to(code).emit("game-dice", { playerId: pid, value });
        emitState(this, room);
      });
    }

    if (event === "game-move") {
      return originalOn.call(this, event, function(payload = {}) {
        const code = roomOf(this), pid = pidOf(this), room = liveRooms.get(code);
        if (!room || room.status !== "playing" || room.currentPlayerId !== pid || room.pendingMove === null) return;
        const dice = Number(room.pendingMove);
        const colors = room.players.find(p => p.playerId === pid)?.colors || [];
        const all = flatTokens(room);
        const legal = hasLegalMove(all, colors, dice);
        const tokenId = String(payload.tokenId || "");

        if (tokenId === "__skip__") {
          if (legal) return;
        } else {
          const parts = tokenId.split(":");
          if (parts.length !== 2 || !colors.includes(parts[0])) return;
          const id = Number(parts[1]);
          const token = all.find(t => t.color === parts[0] && t.id === id);
          if (!token || !canMove(all, token, dice)) return;
          const result = applyMove(all, token, dice);
          if (!result) return;
          syncTokens(room, result.tokens);
          this.nsp.to(code).emit("game-moved", {
            playerId: pid,
            tokenId,
            to: result.target,
            captured: result.captured ? { color: result.captured.color, id: result.captured.id } : null,
          });
          if (hasWon(result.tokens, colors)) {
            room.status = "finished";
            room.winnerId = pid;
            room.currentPlayerId = null;
            room.pendingMove = null;
            room.dice = null;
            emitState(this, room);
            return;
          }
        }

        if (dice === 6) room.sixStreak += 1;
        else room.sixStreak = 0;
        const forceNext = room.sixStreak >= 3;
        if (forceNext || dice !== 6) {
          room.sixStreak = forceNext ? 0 : room.sixStreak;
          room.currentPlayerId = nextPlayer(room);
        }
        room.pendingMove = null;
        room.dice = null;
        emitState(this, room);
      });
    }

    if (event === "disconnect") {
      return originalOn.call(this, event, function() {
        const code = roomOf(this), pid = pidOf(this), shadow = liveRooms.get(code);
        if (shadow && pid && shadow.status === "waiting") shadow.members.delete(pid);
        return listener.apply(this, arguments);
      });
    }

    return originalOn.call(this, event, listener);
  };
}

module.exports = {};
