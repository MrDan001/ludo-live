function autoResolveNoMove({ rules, tokens, colors, rolled, advanceTurn }) {
  if (rules.hasLegalMove(tokens, colors, rolled)) return false;
  advanceTurn(rolled);
  return true;
}

module.exports = { autoResolveNoMove };
