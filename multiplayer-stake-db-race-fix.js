const { Client } = require('pg');

// The stake runtime creates the per-room bet row inside a transaction. Two
// near-simultaneous joins can both observe no row before either INSERT commits.
// Make that single INSERT idempotent so the second join reuses the same room bet
// instead of surfacing the room_code unique-constraint error.
if (Client && !Client.prototype.__ludoMultiplayerStakeDbRaceFix) {
  Client.prototype.__ludoMultiplayerStakeDbRaceFix = true;
  const originalQuery = Client.prototype.query;
  Client.prototype.query = function(queryText, values, callback) {
    if (typeof queryText === 'string' && /INSERT\s+INTO\s+ludo_multiplayer_match_bets\s*\(/i.test(queryText)) {
      queryText = queryText.replace(
        /\s*RETURNING\s+\*/i,
        ' ON CONFLICT (room_code) DO UPDATE SET room_code=EXCLUDED.room_code RETURNING *'
      );
    }
    return originalQuery.call(this, queryText, values, callback);
  };
}
