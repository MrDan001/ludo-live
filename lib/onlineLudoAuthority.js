const {
  canMove,
  hasLegalMove,
  hasWon,
  playerColorsForSeats,
  tokenState,
  nextProgress,
  getTokenCell,
  isSafeProgress,
  FINISH,
} = require("./ludoRules");

const COLORS = ["red", "yellow", "green", "blue"];
const TOKEN_COUNT = 4;

function createTokens(players) {
  const tokens = {};
  const count = players.length === 2 ? 2 : 4;
  for (const player of players) {
    const pid = String(player.playerId);
    const colors = playerColorsForSeats(count, player.seat);
    tokens[pid] = {};
    for (const color of colors) {
      for (let id = 0; id < TOKEN_COUNT; id++) tokens[pid][`${color}:${id}`] = { position: 0 };
    }
  }
  return tokens;
}

function flattenTokens(state) {
  const out = [];
  for (const [playerId, playerTokens] of Object.entries(state.tokens || {})) {
    for (const [key, value] of Object.entries(playerTokens || {})) {
      const [color, idText] = key.split(":");
      const id = Number(idText);
      if (!COLORS.includes(color) || !Number.isInteger(id) || id < 0 || id >= TOKEN_COUNT) continue;
      const position = Number(value?.position ?? 0);
      out.push({ playerId, color, id, position, state: tokenState(position) });
    }
  }
  return out;
}

function writeTokens(state, flat) {
  const next = {};
  for (const token of flat) {
    next[token.playerId] ||= {};
    next[token.playerId][`${token.color}:${token.id}`] = { position: token.position };
  }
  state.tokens = next;
}

function playerFor(state, playerId) {
  return (state.players || []).find((p) => String(p.playerId) === String(playerId)) || null;
}

function colorsFor(state, playerId) {
  const player = playerFor(state, playerId);
  if (!player) return [];
  return player.colors?.length ? player.colors : playerColorsForSeats(state.players.length === 2 ? 2 : 4, player.seat);
}

function nextPlayerId(state) {
  const index = state.players.findIndex((p) => String(p.playerId) === String(state.currentPlayerId));
  if (index < 0 || !state.players.length) return null;
  return state.players[(index + 1) % state.players.length]?.playerId || null;
}

function createGame(players) {
  const normalized = players.map((p, seat) => ({
    playerId: String(p.playerId),
    name: String(p.name || "Player"),
    seat,
    colors: p.colors?.length ? p.colors : playerColorsForSeats(players.length === 2 ? 2 : 4, seat),
    level: Math.max(1, Number(p.level) || 1),
    avatar: String(p.avatar || ""),
    coins: Math.max(0, Number(p.coins) || 0),
  }));
  return {
    status: "playing",
    currentPlayerId: normalized[0]?.playerId || null,
    dice: null,
    pendingMove: null,
    sixStreak: 0,
    players: normalized,
    tokens: createTokens(normalized),
    winnerId: null,
    stateRevision: 0,
  };
}

function roll(state, playerId, random = Math.random) {
  if (state.status !== "playing") return { ok: false, reason: "game_not_playing" };
  if (String(state.currentPlayerId) !== String(playerId)) return { ok: false, reason: "not_your_turn" };
  if (state.pendingMove !== null) return { ok: false, reason: "finish_current_move" };
  const value = 1 + Math.floor(random() * 6);
  state.dice = value;
  state.pendingMove = value;
  state.stateRevision += 1;
  return { ok: true, value, stateRevision: state.stateRevision };
}

function move(state, playerId, tokenId) {
  if (state.status !== "playing") return { ok: false, reason: "game_not_playing" };
  if (String(state.currentPlayerId) !== String(playerId)) return { ok: false, reason: "not_your_turn" };
  if (state.pendingMove === null) return { ok: false, reason: "roll_first" };

  const dice = Number(state.pendingMove);
  const player = playerFor(state, playerId);
  const colors = colorsFor(state, playerId);
  const all = flattenTokens(state);
  const legal = hasLegalMove(all, colors, dice);

  if (tokenId === "__skip__") {
    if (legal) return { ok: false, reason: "legal_move_exists" };
    return finishTurn(state, playerId, dice, null);
  }

  const [color, idText] = String(tokenId || "").split(":");
  const id = Number(idText);
  if (!player || !colors.includes(color) || !Number.isInteger(id)) return { ok: false, reason: "not_your_token" };

  const token = all.find((t) => String(t.playerId) === String(playerId) && t.color === color && t.id === id);
  if (!token) return { ok: false, reason: "token_not_found" };
  if (!canMove(all, token, dice)) return { ok: false, reason: "illegal_move" };

  const target = nextProgress(token.position, dice);
  if (target === null) return { ok: false, reason: "illegal_move" };
  const from = token.position;
  const moved = all.map((t) => t.playerId === token.playerId && t.color === token.color && t.id === token.id ? { ...t, position: target, state: tokenState(target) } : t);
  const movedToken = moved.find((t) => t.playerId === token.playerId && t.color === token.color && t.id === token.id);

  let captured = null;
  if (movedToken && target > 0 && target < 52 && !isSafeProgress(color, target)) {
    const cell = getTokenCell(color, target);
    if (cell) {
      const opponents = moved.filter((t) => t.position > 0 && t.position < FINISH && !colors.includes(t.color) && JSON.stringify(getTokenCell(t.color, t.position)) === JSON.stringify(cell));
      if (opponents.length === 1) {
        captured = opponents[0];
        const capturedIndex = moved.indexOf(captured);
        moved[capturedIndex] = { ...captured, position: 0, state: "yard" };
        const killerIndex = moved.findIndex((t) => t.playerId === token.playerId && t.color === token.color && t.id === token.id);
        if (killerIndex >= 0) moved[killerIndex] = { ...moved[killerIndex], position: FINISH, state: "finished" };
      }
    }
  }

  writeTokens(state, moved);
  state.stateRevision += 1;

  const result = finishTurn(state, playerId, dice, {
    tokenId,
    from,
    target: captured ? FINISH : target,
    captured: captured ? { playerId: captured.playerId, color: captured.color, id: captured.id } : null,
    captureToCenter: Boolean(captured),
    stateRevision: state.stateRevision,
  });
  return { ...result, playerId, tokenId };
}

function finishTurn(state, playerId, dice, moveInfo) {
  if (moveInfo && hasWon(flattenTokens(state), colorsFor(state, playerId))) {
    state.status = "finished";
    state.winnerId = playerId;
    state.currentPlayerId = null;
  } else {
    state.sixStreak = dice === 6 ? state.sixStreak + 1 : 0;
    if (dice !== 6 || state.sixStreak >= 3) {
      state.currentPlayerId = nextPlayerId(state);
      state.sixStreak = 0;
    }
  }
  state.pendingMove = null;
  state.dice = null;
  state.stateRevision += 1;
  return { ok: true, ...(moveInfo || {}), stateRevision: state.stateRevision };
}

function snapshot(state) {
  return {
    status: state.status,
    currentPlayerId: state.currentPlayerId,
    dice: state.dice,
    pendingMove: state.pendingMove,
    sixStreak: state.sixStreak,
    players: state.players,
    tokens: state.tokens,
    winnerId: state.winnerId,
    stateRevision: state.stateRevision,
  };
}

module.exports = { createGame, roll, move, snapshot, flattenTokens };
