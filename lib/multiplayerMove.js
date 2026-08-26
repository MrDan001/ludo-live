const rules = require('./ludoRules');

/**
 * Authoritative multiplayer move adapter.
 * Uses the existing canonical rules without modifying Tournament or Bot-vs-Human code.
 */
function createTokensFromState(tokensByPlayer = {}) {
  const out = [];
  for (const [playerId, tokens] of Object.entries(tokensByPlayer)) {
    for (const [tokenId, value] of Object.entries(tokens || {})) {
      const [color, idText] = String(tokenId).split(':');
      const id = Number.isInteger(Number(idText)) ? Number(idText) : Number(tokenId);
      if (!color || !Number.isInteger(id)) continue;
      const position = Number(value?.position ?? 0);
      out.push({ color, id, position, state: rules.tokenState(position), playerId });
    }
  }
  return out;
}

function applyAuthoritativeMove({ tokensByPlayer, tokenId, dice, colors }) {
  const tokens = createTokensFromState(tokensByPlayer);
  const [color, idText] = String(tokenId || '').split(':');
  const id = Number(idText);
  if (!color || !Number.isInteger(id) || !Number.isInteger(Number(dice))) return { ok: false, reason: 'invalid_move' };
  if (!colors.includes(color)) return { ok: false, reason: 'not_your_token' };

  const token = tokens.find(t => t.color === color && t.id === id);
  if (!token || !rules.canMove(tokens, token, Number(dice))) return { ok: false, reason: 'illegal_move' };

  const result = rules.applyMove(tokens, token, Number(dice));
  if (!result) return { ok: false, reason: 'illegal_move' };

  const next = {};
  for (const t of result.tokens) {
    if (!next[t.playerId]) next[t.playerId] = {};
    next[t.playerId][`${t.color}:${t.id}`] = { position: t.position, state: t.state };
  }
  return {
    ok: true,
    tokensByPlayer: next,
    target: result.target,
    captured: result.captured ? { color: result.captured.color, id: result.captured.id, playerId: result.captured.playerId } : null,
  };
}

module.exports = { createTokensFromState, applyAuthoritativeMove };
