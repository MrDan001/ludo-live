const { Socket } = require("socket.io");
const authority = require("./lib/onlineLudoAuthority");
const { playerColorsForSeats } = require("./lib/ludoRules");

// Canonical live-game controller.
// server.js owns lobby/room membership; this preload owns the live game state.
// A player can briefly have more than one browser socket during navigation or
// reconnect, so socket identity is always checked before a stale socket may
// mutate the canonical player/session record.
if (!Socket.prototype.__ludoOnlineAuthorityV2) {
  const originalOn = Socket.prototype.on;
  const games = new Map();
  const members = new Map();

  const roomCode = (socket) => String(socket?.data?.roomCode || "").trim().toUpperCase();
  const playerId = (socket) => String(socket?.data?.playerId || "").trim();
  const getRoom = (socket) => games.get(roomCode(socket));

  const ensureRoom = (code) => {
    let room = games.get(code);
    if (!room) {
      room = { code, status: "waiting", members: new Map(), game: null };
      games.set(code, room);
    }
    return room;
  };

  const stateFor = (room) => room?.game ? authority.snapshot(room.game) : null;
  const emitState = (socket, room) => {
    if (room?.game) socket.nsp.to(room.code).emit("game-state", stateFor(room));
  };

  const currentMember = (room, pid) => {
    const member = room?.members.get(pid);
    if (!member) return null;
    const live = socketById(member.socketId);
    return live ? member : null;
  };

  const socketById = (id) => id ? [...globalThis.__ludoIoSockets?.values?.() || []].find(s => s.id === id) : null;

  const remainingPlayers = (socket, room, pid) => {
    return [...room.members.values()].filter((m) => {
      if (String(m.playerId) === String(pid) || !m.socketId) return false;
      const live = socket.nsp.sockets.get(m.socketId);
      return !!live;
    });
  };

  const forfeitPlayer = async (socket, room, pid) => {
    const tracked = room?.members.get(pid);
    if (!tracked || String(tracked.socketId) !== String(socket.id)) return false;
    if (!room?.game || room.game.status !== "playing") return false;

    const remaining = remainingPlayers(socket, room, pid);
    if (!remaining.length) return false;

    room.game.players = room.game.players.filter(p => String(p.playerId) !== String(pid));
    if (String(room.game.currentPlayerId || "") === String(pid)) {
      room.game.currentPlayerId = String(remaining[0].playerId);
    }
    room.game.pendingMove = null;
    room.game.dice = null;
    room.game.sixStreak = 0;
    room.game.stateRevision++;

    if (remaining.length === 1) {
      const winner = remaining[0];
      room.game.status = "finished";
      room.game.winnerId = String(winner.playerId);
      room.game.currentPlayerId = null;
      const stakeInfo = await globalThis.__ludoMultiplayerStakeGet?.(room.code).catch?.(() => null);
      const pot = Number(stakeInfo?.pot) || 0;
      await globalThis.__ludoMatchFinished?.(room.code, String(winner.playerId));
      emitState(socket, room);
      socket.nsp.to(room.code).emit("game-forfeit-winner", {
        winnerId: String(winner.playerId),
        winnerName: String(winner.name || "Player"),
        pot,
        reason: "opponent_left",
        roomCode: room.code,
      });
      try {
        await globalThis.__ludoCreateWinnerNotification?.(room.code, String(winner.playerId), String(winner.name || "Player"));
      } catch (error) {
        console.error("[multiplayer-forfeit] notification failed", room.code, error);
      }
    } else {
      socket.nsp.to(room.code).emit("game-player-left", {
        playerId: String(pid),
        remaining: remaining.map(m => String(m.playerId)),
      });
      emitState(socket, room);
    }
    return true;
  };

  globalThis.__ludoForfeitPlayer = forfeitPlayer;
  Socket.prototype.__ludoOnlineAuthorityV2 = true;

  Socket.prototype.on = function (event, listener) {
    if (event === "join-room") {
      return originalOn.call(this, event, function (payload = {}) {
        const code = String(payload.roomCode || "").trim().toUpperCase();
        const pid = String(payload.playerId || "").trim();
        if (code && pid) {
          this.data.roomCode = code;
          this.data.playerId = pid;
          this.data.profileName = String(payload.name || "Player");
          this.data.profileAvatar = String(payload.avatar || "");
          this.data.profileLevel = Math.max(1, Number(payload.level) || 1);
          this.data.profileCoins = Math.max(0, Number(payload.coins) || 0);

          const room = ensureRoom(code);
          const previous = room.members.get(pid);
          room.members.set(pid, {
            playerId: pid,
            name: this.data.profileName,
            avatar: this.data.profileAvatar,
            level: this.data.profileLevel,
            coins: this.data.profileCoins,
            socketId: this.id,
          });
          members.set(pid, { code, socketId: this.id });

          // If the match already exists, a reconnect/new board socket must
          // refresh only that player's presentation metadata. Never create a
          // second game or replace the authoritative token/turn state.
          if (room.game) {
            const gamePlayer = room.game.players.find(p => String(p.playerId) === pid);
            if (gamePlayer) {
              gamePlayer.name = this.data.profileName;
              gamePlayer.avatar = this.data.profileAvatar;
              gamePlayer.level = this.data.profileLevel;
              gamePlayer.coins = this.data.profileCoins;
            }
          }

          void previous;
        }

        const result = listener.apply(this, arguments);
        const room = games.get(code);
        if (room?.game) this.emit("game-state", stateFor(room));
        return result;
      });
    }

    if (event === "start-game") {
      return originalOn.call(this, event, function () {
        const result = listener.apply(this, arguments);
        const code = roomCode(this);
        const room = games.get(code);
        if (!room) return result;

        const sockets = [...this.nsp.sockets.values()].filter(s => s.rooms?.has(code));
        for (const s of sockets) {
          const pid = playerId(s);
          if (!pid) continue;
          room.members.set(pid, {
            playerId: pid,
            name: String(s.data?.profileName || room.members.get(pid)?.name || "Player"),
            avatar: String(s.data?.profileAvatar || room.members.get(pid)?.avatar || ""),
            level: Math.max(1, Number(s.data?.profileLevel || room.members.get(pid)?.level) || 1),
            coins: Math.max(0, Number(s.data?.profileCoins ?? room.members.get(pid)?.coins) || 0),
            socketId: s.id,
          });
          members.set(pid, { code, socketId: s.id });
        }

        const list = [...room.members.values()];
        if (!list.length) return result;
        const players = list.map((member, seat) => ({
          ...member,
          seat,
          colors: playerColorsForSeats(list.length === 2 ? 2 : 4, seat),
        }));
        room.game = authority.createGame(players);
        room.status = "playing";
        emitState(this, room);
        if (typeof globalThis.__ludoMatchStarted === "function") {
          void globalThis.__ludoMatchStarted(room.code, room.roomSize || list.length);
        }
        return result;
      });
    }

    if (event === "game-roll") {
      return originalOn.call(this, event, function () {
        const room = getRoom(this);
        const pid = playerId(this);
        if (!room?.game) return;
        const result = authority.roll(room.game, pid);
        if (!result.ok) {
          this.emit("game-roll-error", { error: result.reason });
          return;
        }
        this.nsp.to(room.code).emit("game-dice", {
          playerId: pid,
          value: result.value,
          stateRevision: result.stateRevision,
        });
        emitState(this, room);
      });
    }

    if (event === "game-move") {
      return originalOn.call(this, event, function (payload = {}) {
        const room = getRoom(this);
        const pid = playerId(this);
        if (!room?.game) return;
        const result = authority.move(room.game, pid, String(payload.tokenId || ""));
        if (!result.ok) {
          this.emit("game-move-error", { error: result.reason });
          return;
        }
        if (result.tokenId) {
          this.nsp.to(room.code).emit("game-moved", {
            playerId: pid,
            tokenId: result.tokenId,
            from: result.from,
            to: result.target,
            finalTo: result.finalTo,
            captureProgress: result.captureProgress,
            captured: result.captured || null,
            captureToCenter: Boolean(result.captureToCenter),
            stateRevision: result.stateRevision,
          });
        }
        emitState(this, room);
        if (room.game.status === "finished") {
          void globalThis.__ludoMatchFinished?.(room.code, String(room.game.winnerId || ""));
        }
      });
    }

    if (event === "leave-room") {
      return originalOn.call(this, event, async function () {
        const code = roomCode(this);
        const pid = playerId(this);
        const room = games.get(code);
        if (room?.status === "playing" && pid) await forfeitPlayer(this, room, pid);
        return listener.apply(this, arguments);
      });
    }

    if (event === "disconnect") {
      return originalOn.call(this, event, function () {
        const code = roomCode(this);
        const pid = playerId(this);
        const room = games.get(code);
        const tracked = pid ? room?.members.get(pid) : null;

        // Ignore disconnects from an old socket after the same player has
        // already connected again. This is the key protection against a
        // navigation/reconnect making the two clients appear to split.
        if (tracked && String(tracked.socketId) === String(this.id)) {
          room.members.delete(pid);
          const globalMember = members.get(pid);
          if (globalMember && String(globalMember.socketId) === String(this.id)) members.delete(pid);

          if (room.status === "waiting" && room.members.size === 0) games.delete(code);
        }
        return listener.apply(this, arguments);
      });
    }

    return originalOn.call(this, event, listener);
  };
}

module.exports = {};