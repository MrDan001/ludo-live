const { Socket } = require("socket.io");
const authority = require("./lib/onlineLudoAuthority");
const { playerColorsForSeats } = require("./lib/ludoRules");

// Clean online-game controller. The board and page UI remain untouched.
// This module owns only live-game state: turn, dice, tokens and movement.
if (!Socket.prototype.__ludoOnlineAuthorityV2) {
  const originalOn = Socket.prototype.on;
  const games = new Map();
  const members = new Map();
  const leaveListeners = new WeakMap();
  Socket.prototype.__ludoOnlineAuthorityV2 = true;

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

  const syncMember = (socket, payload = {}) => {
    const code = roomCode(socket);
    const pid = String(payload.playerId || playerId(socket) || "").trim();
    if (!code || !pid) return null;
    const room = ensureRoom(code);
    room.members.set(pid, {
      playerId: pid,
      name: String(payload.name || socket.data.profileName || "Player"),
      avatar: String(payload.avatar ?? socket.data.profileAvatar ?? ""),
      level: Math.max(1, Number(payload.level ?? socket.data.profileLevel) || 1),
      coins: Math.max(0, Number(payload.coins ?? socket.data.profileCoins) || 0),
    });
    return room;
  };

  const stateFor = (room) => room?.game ? authority.snapshot(room.game) : null;
  const emitState = (socket, room) => {
    if (!room?.game) return;
    socket.nsp.to(room.code).emit("game-state", stateFor(room));
  };

  Socket.prototype.on = function (event, listener) {
    if (event === "leave-room") {
      leaveListeners.set(this, listener);
      return originalOn.call(this, event, listener);
    }

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
          room.members.set(pid, {
            playerId: pid,
            name: this.data.profileName,
            avatar: this.data.profileAvatar,
            level: this.data.profileLevel,
            coins: this.data.profileCoins,
          });
          members.set(pid, { code, socketId: this.id });
        }

        const result = listener.apply(this, arguments);
        const room = games.get(code);
        if (room?.game) {
          this.emit("game-state", stateFor(room));
        }
        return result;
      });
    }

    if (event === "start-game") {
      return originalOn.call(this, event, function () {
        const result = listener.apply(this, arguments);
        const code = roomCode(this);
        const room = games.get(code);
        if (!room) return result;

        const sockets = [...this.nsp.sockets.values()].filter((s) => s.rooms?.has(code));
        for (const s of sockets) {
          const pid = playerId(s);
          if (!pid) continue;
          room.members.set(pid, {
            playerId: pid,
            name: String(s.data?.profileName || room.members.get(pid)?.name || "Player"),
            avatar: String(s.data?.profileAvatar || room.members.get(pid)?.avatar || ""),
            level: Math.max(1, Number(s.data?.profileLevel || room.members.get(pid)?.level) || 1),
            coins: Math.max(0, Number(s.data?.profileCoins ?? room.members.get(pid)?.coins) || 0),
          });
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
            captured: result.captured || null,
            captureToCenter: Boolean(result.captureToCenter),
            stateRevision: result.stateRevision,
          });
        }
        emitState(this, room);
      });
    }

    if (event === "disconnect") {
      return originalOn.call(this, event, function () {
        const code = roomCode(this);
        const pid = playerId(this);
        const room = games.get(code);
        members.delete(pid);
        if (room && pid && room.status === "waiting") room.members.delete(pid);
        if (room && room.status === "waiting" && room.members.size === 0) games.delete(code);
        return listener.apply(this, arguments);
      });
    }

    return originalOn.call(this, event, listener);
  };
}

module.exports = {};
