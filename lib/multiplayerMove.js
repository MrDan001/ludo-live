const rules = require('./ludoRules');

function playerColors(room, playerId) {
  const players = room?.game?.players || [];
  const player = players.find(p => String(p.playerId || p.id) === String(playerId));
  return player ? rules.playerColorsForSeats(players.length === 2 ? 2 : 4, player.seat) : [];
}

function ensureTokens(room) {
  const g = room.game;
  g.tokens = g.tokens || {};
  for (const player of g.players || []) {
    const pid = String(player.playerId || player.id);
    g.tokens[pid] = g.tokens[pid] || {};
    const colors = rules.playerColorsForSeats(g.players.length === 2 ? 2 : 4, player.seat);
    for (const color of colors) for (let id = 0; id < 4; id++) {
      const key = `${color}:${id}`;
      if (!g.tokens[pid][key] || typeof g.tokens[pid][key].position !== 'number') g.tokens[pid][key] = { position: 0 };
    }
  }
  return g.tokens;
}

function flattenTokens(room) {
  const byPlayer = ensureTokens(room), out = [];
  for (const player of room.game.players || []) {
    const pid = String(player.playerId || player.id);
    for (const [key, value] of Object.entries(byPlayer[pid] || {})) {
      const [color, idText] = key.split(':'), id = Number(idText);
      if (!color || !Number.isInteger(id)) continue;
      const position = Number(value?.position ?? 0);
      out.push({ color, id, position, state: rules.tokenState(position), playerId: pid });
    }
  }
  return out;
}

function writeBack(room, tokens) {
  const out = {};
  for (const t of tokens) {
    out[t.playerId] = out[t.playerId] || {};
    out[t.playerId][`${t.color}:${t.id}`] = { position: t.position };
  }
  room.game.tokens = out;
}

function legalFor(room, playerId, dice) {
  const player = (room.game.players || []).find(p => String(p.playerId || p.id) === String(playerId));
  if (!player) return false;
  const colors = rules.playerColorsForSeats(room.game.players.length === 2 ? 2 : 4, player.seat);
  return rules.hasLegalMove(flattenTokens(room), colors, Number(dice));
}

function applyAuthoritativeMove({ room, playerId, tokenId, dice }) {
  if (!room?.game) return { ok: false, reason: 'no_game' };
  const player = (room.game.players || []).find(p => String(p.playerId || p.id) === String(playerId));
  if (!player) return { ok: false, reason: 'player_not_found' };
  const colors = rules.playerColorsForSeats(room.game.players.length === 2 ? 2 : 4, player.seat);
  const value = Number(dice);
  const [color, idText] = String(tokenId || '').split(':'), id = Number(idText);
  if (!Number.isInteger(value) || value < 1 || value > 6) return { ok: false, reason: 'invalid_dice' };
  if (!color || !Number.isInteger(id) || !colors.includes(color)) return { ok: false, reason: 'not_your_token' };
  const tokens = flattenTokens(room);
  const token = tokens.find(t => t.playerId === String(playerId) && t.color === color && t.id === id);
  if (!token || !rules.canMove(tokens, token, value)) return { ok: false, reason: 'illegal_move' };
  const result = rules.applyMove(tokens, token, value);
  if (!result) return { ok: false, reason: 'illegal_move' };
  writeBack(room, result.tokens);
  return { ok: true, to: result.target, captured: result.captured ? { playerId: result.captured.playerId, color: result.captured.color, id: result.captured.id } : null, won: rules.hasWon(result.tokens, colors) };
}

module.exports = { ensureTokens, flattenTokens, legalFor, applyAuthoritativeMove };
