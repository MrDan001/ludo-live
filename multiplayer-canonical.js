const { Socket } = require("socket.io");
const authority = require("./lib/onlineLudoAuthority");
const { playerColorsForSeats } = require("./lib/ludoRules");

if (!Socket.prototype.__ludoOnlineAuthorityV4) {
  const originalOn = Socket.prototype.on;
  const games = new Map();
  const members = new Map();
  const reconnectGraceMs = 30000;

  const roomCode = (socket) => String(socket?.data?.roomCode || "").trim().toUpperCase();
  const playerId = (socket) => String(socket?.data?.authUserId || socket?.data?.playerId || "").trim();
  const getRoom = (socket) => games.get(roomCode(socket));
  const ackFrom = (args) => [...args].reverse().find((arg) => typeof arg === "function");
  const safeAck = (ack, payload) => { if (typeof ack === "function") { try { ack(payload); } catch {} } };

  const ensureRoom = (code, nsp) => {
    let room = games.get(code);
    if (!room) {
      room = { code, status: "waiting", members: new Map(), game: null, hostPlayerId: null, nsp };
      games.set(code, room);
    } else if (nsp) room.nsp = nsp;
    return room;
  };

  const stateFor = (room) => room?.game ? authority.snapshot(room.game) : null;
  const emitState = (room) => { if (room?.game) { room.lastState = stateFor(room); room.nsp?.to(room.code).emit("game-state", room.lastState); } };
  const emitStateTo = (socket, room) => { if (room?.game) socket.emit("game-state", stateFor(room)); };
  const connectedMembers = (room) => [...(room?.members?.values?.() || [])].filter((m) => m.connected !== false && m.socketId);
  const currentMember = (room, pid) => room?.members.get(pid) || null;
  const otherConnectedMembers = (room, pid) => connectedMembers(room).filter((m) => String(m.playerId) !== String(pid));
  const clearReconnectTimer = (member) => { if (member?.reconnectTimer) clearTimeout(member.reconnectTimer); if (member) member.reconnectTimer = null; };

  const broadcastConnection = (room, pid, connected, reason) => {
    room?.nsp?.to(room.code).emit("game-connection", { roomCode: room.code, playerId: String(pid), connected: !!connected, reason: reason || null });
  };

  const forfeitPlayer = async (socket, room, pid, reason = "opponent_left") => {
    const tracked = room?.members.get(pid);
    if (!tracked || !room?.game || room.game.status !== "playing") return false;
    const remaining = otherConnectedMembers(room, pid);
    if (!remaining.length) return false;
    clearReconnectTimer(tracked);
    room.game.players = room.game.players.filter((p) => String(p.playerId) !== String(pid));
    if (String(room.game.currentPlayerId || "") === String(pid)) room.game.currentPlayerId = String(remaining[0].playerId);
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
      emitState(room);
      room.nsp?.to(room.code).emit("game-forfeit-winner", { winnerId: String(winner.playerId), winnerName: String(winner.name || "Player"), pot, reason, roomCode: room.code });
      try { await globalThis.__ludoCreateWinnerNotification?.(room.code, String(winner.playerId), String(winner.name || "Player")); } catch (error) { console.error("[multiplayer-forfeit] notification failed", room.code, error); }
    } else {
      room.nsp?.to(room.code).emit("game-player-left", { playerId: String(pid), remaining: remaining.map((m) => String(m.playerId)) });
      emitState(room);
    }
    return true;
  };

  const scheduleForfeit = (room, pid) => {
    const member = room?.members.get(pid);
    if (!member || member.connected !== false || member.reconnectTimer) return;
    member.reconnectTimer = setTimeout(async () => {
      member.reconnectTimer = null;
      const liveRoom = games.get(room.code);
      const current = liveRoom?.members.get(pid);
      if (!liveRoom || !current || current.connected !== false) return;
      if (!liveRoom.game || liveRoom.game.status !== "playing") return;
      if (!otherConnectedMembers(liveRoom, pid).length) { scheduleForfeit(liveRoom, pid); return; }
      await forfeitPlayer(null, liveRoom, pid, "opponent_disconnected");
    }, reconnectGraceMs);
  };

  globalThis.__ludoForfeitPlayer = forfeitPlayer;
  globalThis.__ludoCanonicalHostForRoom = (code) => games.get(String(code || "").trim().toUpperCase())?.hostPlayerId || null;
  globalThis.__ludoCanonicalCleanupRoom = (code) => {
    const normalized = String(code || "").trim().toUpperCase();
    const room = games.get(normalized);
    if (room) { for (const m of room.members.values()) clearReconnectTimer(m); games.delete(normalized); }
  };
  Socket.prototype.__ludoOnlineAuthorityV4 = true;

  Socket.prototype.on = function (event, listener) {
    if (event === "join-room") {
      return originalOn.call(this, event, function (payload = {}, ...extra) {
        const next = { ...payload };
        const code = String(next.roomCode || "").trim().toUpperCase();
        const pid = String(this.data?.authUserId || next.playerId || "").trim();
        if (!code || !pid) return listener.apply(this, [next, ...extra]);
        const room = ensureRoom(code, this.nsp);
        let member = room.members.get(pid);
        if (!member && room.game) { this.emit("room-error", "This match has already started. Reconnect using the same player account."); return; }
        if (!member) {
          member = { playerId: pid, name: String(next.name || "Player").slice(0, 24), avatar: String(next.avatar || ""), level: Math.max(1, Number(next.level) || 1), coins: Math.max(0, Number(next.coins) || 0), peerId: null, socketId: this.id, connected: true, host: room.members.size === 0, ready: room.members.size === 0, reconnectTimer: null };
          room.members.set(pid, member);
          if (!room.hostPlayerId) room.hostPlayerId = pid;
        } else {
          clearReconnectTimer(member);
          const wasDisconnected = member.connected === false || !member.socketId;
          member.socketId = this.id;
          member.connected = true;
          member.name = String(next.name || member.name || "Player").slice(0, 24);
          member.avatar = String(next.avatar ?? member.avatar ?? "");
          member.level = Math.max(1, Number(next.level) || member.level || 1);
          member.coins = Number.isFinite(Number(next.coins)) ? Number(next.coins) : (member.coins ?? 0);
          if (wasDisconnected) broadcastConnection(room, pid, true, "reconnected");
        }
        this.data.roomCode = code;
        this.data.playerId = pid;
        if (!this.data.authUserId) this.data.authUserId = pid;
        const result = listener.apply(this, [next, ...extra]);
        if (room.game) {
          const gamePlayer = room.game.players.find((p) => String(p.playerId) === pid);
          if (gamePlayer) { gamePlayer.name = member.name; gamePlayer.avatar = member.avatar; gamePlayer.level = member.level; gamePlayer.coins = member.coins; }
          emitStateTo(this, room);
          this.emit("game-connection", { roomCode: code, playerId: pid, connected: true, reason: "reconnected" });
        }
        room.nsp?.to(code).emit("game-roster", [...room.members.values()].map((m) => ({ ...m, socketId: undefined, reconnectTimer: undefined })));
        return result;
      });
    }

    if (event === "start-game") {
      // The legacy server start-game listener is intentionally not invoked.
      // This wrapper owns match creation and is the only game authority.
      return originalOn.call(this, event, function (...args) {
        const ack = ackFrom(args);
        const code = roomCode(this), pid = playerId(this), room = games.get(code);
        if (!room) { safeAck(ack, { ok: false, error: "room_not_found" }); this.emit("start-error", "Room no longer exists. Please rejoin the room."); return; }
        if (String(room.hostPlayerId || "") !== pid) { safeAck(ack, { ok: false, error: "not_host" }); this.emit("start-error", "Only the room host can start the game."); return; }
        if (room.game) { safeAck(ack, { ok: false, error: "already_started" }); this.emit("start-error", "Game has already started."); return; }
        const live = connectedMembers(room);
        const roomSize = live.length === 2 ? 2 : live.length === 4 ? 4 : 0;
        if (!roomSize || live.length !== roomSize) { safeAck(ack, { ok: false, error: "waiting_for_players" }); this.emit("start-error", `Waiting for all players (${live.length}/${roomSize || "full"}).`); return; }
        if (!live.every((m) => m.ready !== false)) { safeAck(ack, { ok: false, error: "players_not_ready" }); this.emit("start-error", "All players must be ready."); return; }
        const players = live.map((member, seat) => ({ playerId: String(member.playerId), name: member.name, avatar: member.avatar, level: member.level, coins: member.coins, peerId: member.peerId || null, seat, colors: playerColorsForSeats(roomSize, seat) }));
        room.game = authority.createGame(players);
        room.status = "playing";
        for (const member of live) member.host = String(member.playerId) === String(room.hostPlayerId);
        room.nsp?.to(code).emit("start-game", { board: live.find((m) => String(m.playerId) === String(room.hostPlayerId))?.board || "classic", members: live.map((m) => ({ ...m, socketId: undefined, reconnectTimer: undefined })) });
        emitState(room);
        void globalThis.__ludoMatchStarted?.(code, roomSize);
        safeAck(ack, { ok: true, state: stateFor(room) });
      });
    }

    if (event === "game-roll") {
      return originalOn.call(this, event, function (...args) {
        const ack = ackFrom(args), room = getRoom(this), pid = playerId(this);
        if (!room?.game) { safeAck(ack, { ok: false, error: "game_not_started" }); return; }
        const result = authority.roll(room.game, pid);
        if (!result.ok) { safeAck(ack, { ok: false, error: result.reason }); this.emit("game-roll-error", { error: result.reason }); return; }
        room.nsp?.to(room.code).emit("game-dice", { playerId: pid, value: result.value, stateRevision: result.stateRevision });
        emitState(room);
        safeAck(ack, { ok: true, value: result.value, stateRevision: result.stateRevision });
      });
    }

    if (event === "game-move") {
      return originalOn.call(this, event, function (...args) {
        const payload = args[0] || {}, ack = ackFrom(args), room = getRoom(this), pid = playerId(this);
        if (!room?.game) { safeAck(ack, { ok: false, error: "game_not_started" }); return; }
        const result = authority.move(room.game, pid, String(payload.tokenId || ""));
        if (!result.ok) { safeAck(ack, { ok: false, error: result.reason }); this.emit("game-move-error", { error: result.reason }); return; }
        if (result.tokenId) room.nsp?.to(room.code).emit("game-moved", { playerId: pid, tokenId: result.tokenId, from: result.from, to: result.target, finalTo: result.finalTo, captureProgress: result.captureProgress, captured: result.captured || null, captureToCenter: Boolean(result.captureToCenter), stateRevision: result.stateRevision });
        emitState(room);
        safeAck(ack, { ok: true, stateRevision: result.stateRevision, tokenId: result.tokenId || null });
        if (room.game.status === "finished") void globalThis.__ludoMatchFinished?.(room.code, String(room.game.winnerId || ""));
      });
    }

    if (event === "game-recover") {
      return originalOn.call(this, event, function (...args) {
        const ack = ackFrom(args), room = getRoom(this), pid = playerId(this);
        if (!room?.game) { safeAck(ack, { ok: false, error: "game_not_started" }); return; }
        if (!currentMember(room, pid)) { safeAck(ack, { ok: false, error: "not_in_match" }); return; }
        emitStateTo(this, room);
        safeAck(ack, { ok: true, state: stateFor(room) });
      });
    }

    if (event === "leave-room") {
      return originalOn.call(this, event, async function (...args) {
        const code = roomCode(this), pid = playerId(this), room = games.get(code);
        if (room?.game && pid) await forfeitPlayer(this, room, pid, "opponent_left");
        return listener.apply(this, args);
      });
    }

    if (event === "disconnect") {
      return originalOn.call(this, event, function (...args) {
        const code = roomCode(this), pid = playerId(this), room = games.get(code), member = pid ? room?.members.get(pid) : null;
        if (member && String(member.socketId) === String(this.id)) {
          member.connected = false;
          member.socketId = null;
          broadcastConnection(room, pid, false, "socket_disconnect");
          if (room.game?.status === "playing") scheduleForfeit(room, pid);
          room.nsp?.to(code).emit("game-roster", [...room.members.values()].map((m) => ({ ...m, socketId: undefined, reconnectTimer: undefined })));
        }
        return listener.apply(this, args);
      });
    }

    return originalOn.call(this, event, listener);
  };
}

module.exports = {};
