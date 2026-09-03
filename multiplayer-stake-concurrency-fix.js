const { Pool } = require('pg');
const { Socket } = require('socket.io');

if (Socket && !Socket.prototype.__ludoMultiplayerStakeConcurrencyFix) {
  Socket.prototype.__ludoMultiplayerStakeConcurrencyFix = true;
  let pool = null;

  function db() {
    if (!pool) {
      const raw = process.env.DATABASE_URL;
      if (!raw) return null;
      let connectionString = raw;
      try {
        const u = new URL(connectionString);
        u.searchParams.delete('sslmode');
        u.searchParams.delete('sslcert');
        u.searchParams.delete('sslkey');
        u.searchParams.delete('sslrootcert');
        connectionString = u.toString();
      } catch {}
      pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 2,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 5000,
      });
    }
    return pool;
  }

  const originalOn = Socket.prototype.on;
  Socket.prototype.on = function(event, listener) {
    if (event !== 'join-room') return originalOn.call(this, event, listener);

    return originalOn.call(this, event, async (...args) => {
      const payload = args[0] || {};
      const stakeType = String(payload.stakeType || '').toLowerCase();
      const stakeCoins = Math.trunc(Number(payload.stakeCoins) || 0);
      if (stakeType !== 'paid' || stakeCoins < 100 || stakeCoins > 10000) {
        return listener.apply(this, args);
      }

      const code = String(payload.code || '').trim().toUpperCase();
      const poolRef = db();
      if (!code || !poolRef) return listener.apply(this, args);

      const client = await poolRef.connect();
      try {
        await client.query('SELECT pg_advisory_lock(hashtextextended($1, 0))', [code]);
        try {
          return await listener.apply(this, args);
        } finally {
          await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [code]);
        }
      } finally {
        client.release();
      }
    });
  };
}
