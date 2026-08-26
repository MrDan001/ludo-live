// Stake/canonical start bridge is intentionally disabled.
// The authoritative bet-system.js already owns the start-game staking gate.
// Keeping a second start-game wrapper here caused the stake-lock transaction
// to be invoked twice and could leave the client stuck on "Locking coins…".
// This preload remains as a compatibility module because package.json loads it.
module.exports = {};
