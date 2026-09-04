const { Pool } = require('pg');
const { createHash } = require('crypto');
const { Socket } = require('socket.io');

const SESSION_COOKIE = 'ludo_session';
let pool = null;
let poolDisabled = false;

function db() {
  if (poolDisabled) return null;
  if (!pool) {
    const raw = process.env.DATABASE_URL;
    if (!raw) { poolDisabled = true; return null; }
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
      max: 4,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 5000,
    });
  }
  return pool;
}

function cookieValue(header) {
  const text = String(header || '');
  const match = text.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : '';
}

async function authenticatedUser(cookie) {
  const token = cookieValue(cookie);
  const connection = db();
  if (!token || !connection) return null;
  const hash = createHash('sha256').update(token).digest('hex');
  const result = await connection.query(`
    SELECT u.id,u.username,u.level,u.coins,u.avatar,u.is_banned
    FROM ludo_users u
    JOIN ludo_sessions s ON s.user_id=u.id
    WHERE s.token_hash=$1
      AND u.is_banned=FALSE
      AND s.expires_at>NOW()
      AND COALESCE(s.last_activity_at,s.created_at)>NOW()-INTERVAL '30 minutes'
      AND COALESCE(s.absolute_expires_at,s.created_at + INTERVAL '12 hours')>NOW()
    LIMIT 1
  `, [hash]);
  return result.rows[0] || null;
}

if (!Socket.prototype.__ludoMultiplayerAuthRuntime) {
  Socket.prototype.__ludoMultiplayerAuthRuntime = true;
  const originalOn = Socket.prototype.on;

  Socket.prototype.on = function multiplayerAuthOn(event, listener) {
    if (event !== 'join-room') return originalOn.call(this, event, listener);
    return originalOn.call(this, event, async (payload = {}, ...args) => {
      const user = await authenticatedUser(this.handshake?.headers?.cookie).catch(() => null);
      if (!user) {
        this.emit('room-error', 'Your Ludo Live session has expired. Please log in again.');
        return;
      }
      const next = { ...payload };
      next.playerId = String(user.id);
      next.name = String(user.username || 'Player').slice(0, 24);
      next.level = Math.max(1, Number(user.level) || 1);
      next.coins = Math.max(0, Number(user.coins) || 0);
      this.data.authUserId = String(user.id);
      this.data.authUserName = next.name;
      this.data.authUserLevel = next.level;
      this.data.authUserCoins = next.coins;
      this.data.authenticatedAt = Date.now();
      return listener.apply(this, [next, ...args]);
    });
  };
}

module.exports = { authenticatedUser };
