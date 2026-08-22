const { Server } = require("socket.io");

// Multiplayer rule engine. It is preloaded before server.js and attaches only
// to Socket.IO connection events, leaving the existing rooms/chat/friends code intact.
const originalOn = Server.prototype.on;
if (!Server.prototype.__ludoRulesPatched) {
  Server.prototype.__ludoRulesPatched = true;
  Server.prototype.on = function (event, listener) {
    if (event !== "connection" || listener.__ludoRulesWrapped) return originalOn.call(this, event, listener);
    const wrapped = (socket) => {
      listener(socket);
      installGameHandlers(socket);
    };
    wrapped.__ludoRulesWrapped = true;
    return originalOn.call(this, event, wrapped);
  };
}

const games = new Map();
const COLORS = ["red", "yellow", "green", "blue"];
const START = { red: 0, blue: 13, green: 26, yellow: 39 };
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const FINISH = 56;

function pidOf(socket) { return String(socket.data.playerId || "").trim(); }
function roomCodeOf(socket) { return String(socket.data.roomCode || "").trim().toUpperCase(); }
function colorsForSeat(seat, roomSize) {
  if (roomSize === 2) return seat === 0 ? ["red", "yellow"] : ["green", "blue"];
  return [COLORS[seat] || "red"];
}
function globalPosition(color, position) {
  if (position < 1 || position > 51) return null;
  return (START[color] + position - 1) % 52;
}
function makeTokens() {
  return Object.fromEntries(COLORS.map(color => [color, Object.fromEntries([0,1,2,3].map(id => [String(id), { position: 0 }]))]));
}
function playerForColor(game, color) { return game.players.find(p => p.colors.includes(color)); }
function ownToken(game, pid, color, id) {
  const p = playerForColor(game, color);
  return !!p && p.playerId === pid && game.tokens[color]?.[String(id)];
}
function tokenPosition(game, color, id) { return Number(game.tokens[color]?.[String(id)]?.position || 0); }
function colorHasLegalMove(game, color, roll) {
  return [0,1,2,3].some(id => legalMove(game, color, id, roll).ok);
}
function anyLegalMove(game, pid, roll) {
  const player = game.players.find(p => p.playerId === pid);
  return !!player && player.colors.some(color => colorHasLegalMove(game, color, roll));
}
function blockAt(game, global, ownerToExclude) {
  for (const color of COLORS) {
    const p = playerForColor(game, color);
    if (!p || p.playerId === ownerToExclude) continue;
    let count = 0;
    for (let id = 0; id < 4; id++) {
      const pos = tokenPosition(game, color, id);
      if (globalPosition(color, pos) === global) count++;
    }
    if (count >= 2) return { color, count };
  }
  return null;
}
function occupantsAt(game, global, exceptColor) {
  const found = [];
  for (const color of COLORS) {
    if (color === exceptColor) continue;
    for (let id = 0; id < 4; id++) {
      const pos = tokenPosition(game, color, id);
      if (globalPosition(color, pos) === global) found.push({ color, id, position: pos });
    }
  }
  return found;
}
function pathClear(game, color, from, to) {
  const fromGlobal = globalPosition(color, from);
  if (fromGlobal == null) return true;
  for (let step = 1; step <= to - from; step++) {
    const g = (fromGlobal + step) % 52;
    if (blockAt(game, g, playerForColor(game, color)?.playerId || "")) return false;
  }
  return true;
}
function legalMove(game, color, id, roll) {
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) return { ok: false, reason: "Invalid roll" };
  const pos = tokenPosition(game, color, id);
  if (pos === FINISH) return { ok: false, reason: "Token already finished" };

  let target;
  if (pos === 0) {
    if (roll !== 6) return { ok: false, reason: "A token needs a 6 to leave the yard" };
    target = 1;
  } else {
    target = pos + roll;
    if (target > FINISH) return { ok: false, reason: "Exact count required" };
  }

  // Home lane (52-56) belongs only to the token's colour and has no blocks/captures.
  if (target >= 52) {
    if (!pathClear(game, color, pos, Math.min(target, 51))) return { ok: false, reason: "Opponent block blocks the path" };
    return { ok: true, target, capture: [] };
  }

  if (!pathClear(game, color, pos, target)) return { ok: false, reason: "Opponent block blocks the path" };
  const g = globalPosition(color, target);
  const block = blockAt(game, g, playerForColor(game, color)?.playerId || "");
  if (block) return { ok: false, reason: "Cannot land on an opponent block" };
  const opponents = occupantsAt(game, g, color);
  const capture = SAFE.has(g) ? [] : (opponents.length === 1 ? opponents : []);
  if (!SAFE.has(g) && opponents.length > 1) return { ok: false, reason: "Opponent block" };
  return { ok: true, target, capture };
}
function snapshot(game) {
  return {
    status: game.status,
    currentPlayerId: game.currentPlayerId,
    dice: game.dice,
    pendingMove: game.pendingMove,
    sixStreak: game.sixStreak,
    players: game.players.map(p => ({ playerId: p.playerId, name: p.name, seat: p.seat })),
    tokens: game.tokens,
    winnerId: game.winnerId || null
  };
}
function emitGame(game) {
  for (const p of game.players) {
    if (p.socket && p.socket.connected) p.socket.emit("game-state", snapshot(game));
  }
}
function nextPlayer(game) {
  const idx = game.players.findIndex(p => p.playerId === game.currentPlayerId);
  return game.players[(idx + 1) % game.players.length];
}
function initGame(game) {
  game.status = "playing";
  game.currentPlayerId = game.players[0]?.playerId || null;
  game.dice = null;
  game.pendingMove = null;
  game.sixStreak = 0;
  game.winnerId = null;
  game.tokens = makeTokens();
  for (const color of COLORS) {
    const p = playerForColor(game, color);
    if (p) game.tokens[color] = Object.fromEntries([0,1,2,3].map(id => [String(id), { position: 0 }]));
  }
}
function maybeFinish(game) {
  const player = game.players.find(p => p.playerId === game.currentPlayerId);
  if (!player) return false;
  const won = player.colors.every(color => [0,1,2,3].every(id => tokenPosition(game, color, id) === FINISH));
  if (won) {
    game.status = "finished";
    game.winnerId = player.playerId;
    game.currentPlayerId = null;
    game.dice = null;
    game.pendingMove = null;
    return true;
  }
  return false;
}
function getGameForSocket(socket) { return games.get(roomCodeOf(socket)); }

function attachRoom(socket, payload) {
  const code = String(payload?.roomCode || "").trim().toUpperCase();
  const pid = String(payload?.playerId || "").trim();
  if (!code || !pid) return;
  let game = games.get(code);
  const roomSize = Number(payload?.roomSize) === 2 ? 2 : Number(payload?.roomSize) === 4 ? 4 : Number(payload?.roomSize) || 4;
  if (!game) game = { code, roomSize, players: [], status: "waiting", currentPlayerId: null, dice: null, pendingMove: null, sixStreak: 0, tokens: makeTokens() };
  game.roomSize = roomSize;
  let player = game.players.find(p => p.playerId === pid);
  if (!player) {
    const seat = game.players.length;
    player = { playerId: pid, name: String(payload?.name || "Player").slice(0,24), seat, colors: colorsForSeat(seat, roomSize), socket, ready: seat === 0 };
    game.players.push(player);
  } else {
    player.socket = socket;
    player.name = String(payload?.name || player.name || "Player").slice(0,24);
  }
  socket.data.__ludoPid = pid;
  games.set(code, game);
  if (game.status === "playing") socket.emit("game-state", snapshot(game));
}
function attachReady(socket, payload) {
  const game = getGameForSocket(socket); if (!game) return;
  const pid = pidOf(socket); const p = game.players.find(x => x.playerId === pid); if (p) p.ready = !!payload?.ready;
}
function startGame(socket) {
  const game = getGameForSocket(socket); if (!game || game.status === "playing") return;
  const host = game.players[0];
  if (!host || host.playerId !== pidOf(socket)) return;
  if (game.players.length !== game.roomSize || !game.players.every(p => p.ready)) return;
  initGame(game);
  emitGame(game);
}
function handleRoll(socket) {
  const game = getGameForSocket(socket); if (!game || game.status !== "playing") return;
  const pid = pidOf(socket);
  if (game.currentPlayerId !== pid || game.pendingMove !== null) return;
  const value = 1 + Math.floor(Math.random() * 6);
  game.dice = value;
  game.sixStreak = value === 6 ? game.sixStreak + 1 : 0;
  socket.to(game.code).emit("game-dice", { playerId: pid, value });
  socket.emit("game-dice", { playerId: pid, value });

  // Three consecutive sixes immediately forfeit the turn.
  if (value === 6 && game.sixStreak >= 3) {
    game.pendingMove = null;
    game.dice = null;
    game.sixStreak = 0;
    const next = nextPlayer(game);
    game.currentPlayerId = next?.playerId || null;
    emitGame(game);
    return;
  }

  if (!anyLegalMove(game, pid, value)) {
    // A six with no legal move earns the bonus roll; other dead rolls pass the turn.
    game.pendingMove = null;
    game.dice = null;
    if (value !== 6) game.sixStreak = 0;
    else if (game.sixStreak >= 3) game.sixStreak = 0;
    else game.sixStreak = game.sixStreak;
    if (value !== 6) {
      const next = nextPlayer(game);
      game.currentPlayerId = next?.playerId || null;
    }
    emitGame(game);
    return;
  }

  game.pendingMove = value;
  emitGame(game);
}
function handleMove(socket, payload) {
  const game = getGameForSocket(socket); if (!game || game.status !== "playing") return;
  const pid = pidOf(socket);
  if (game.currentPlayerId !== pid || game.pendingMove === null) return;
  const roll = game.pendingMove;
  const tokenId = String(payload?.tokenId || "");
  if (tokenId === "__skip__") {
    if (anyLegalMove(game, pid, roll)) return;
    game.pendingMove = null; game.dice = null;
    if (roll !== 6) { game.sixStreak = 0; const next = nextPlayer(game); game.currentPlayerId = next?.playerId || null; }
    emitGame(game); return;
  }
  const [color, idRaw] = tokenId.split(":");
  const id = Number(idRaw);
  if (!COLORS.includes(color) || !Number.isInteger(id) || id < 0 || id > 3) return;
  if (!ownToken(game, pid, color, id)) return;
  const check = legalMove(game, color, id, roll);
  if (!check.ok) return;
  const oldPosition = tokenPosition(game, color, id);
  game.tokens[color][String(id)].position = check.target;

  for (const victim of check.capture || []) game.tokens[victim.color][String(victim.id)].position = 0;
  game.pendingMove = null;
  game.dice = null;

  socket.to(game.code).emit("game-moved", { playerId: pid, tokenId, to: check.target, captured: check.capture || [] });
  socket.emit("game-moved", { playerId: pid, tokenId, to: check.target, captured: check.capture || [] });

  if (maybeFinish(game)) { emitGame(game); return; }

  // A six grants another roll; the move must have been completed first.
  if (roll === 6) {
    emitGame(game);
    return;
  }
  game.sixStreak = 0;
  const next = nextPlayer(game);
  game.currentPlayerId = next?.playerId || null;
  emitGame(game);
}
function installGameHandlers(socket) {
  socket.on("join-room", payload => attachRoom(socket, payload));
  socket.on("ready", payload => attachReady(socket, payload));
  socket.on("start-game", () => startGame(socket));
  socket.on("game-roll", () => handleRoll(socket));
  socket.on("game-move", payload => handleMove(socket, payload || {}));
  socket.on("disconnect", () => {
    const code = roomCodeOf(socket); const game = games.get(code); if (!game) return;
    const pid = pidOf(socket); const p = game.players.find(x => x.playerId === pid);
    if (p && p.socket === socket) p.socket = null;
    if (game.status === "playing" && game.currentPlayerId === pid) {
      game.status = "paused"; game.currentPlayerId = null; game.pendingMove = null; game.dice = null; emitGame(game);
    }
    if (game.status === "waiting" && game.players.every(x => !x.socket)) games.delete(code);
  });
}
