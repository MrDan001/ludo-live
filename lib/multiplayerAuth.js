const { Pool } = require('pg');
const { createHash } = require('crypto');

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
  const part = String(header || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${SESSION_COOKIE}=`));
  return part ? decodeURIComponent(part.slice(SESSION_COOKIE.length + 1)) : '';
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
      AND COALESCE(s.absolute_expires_at,s.created_at + INTERVAL '12 hours')>NOW()
    LIMIT 1
  `, [hash]);
  if (!result.rowCount) return null;
  const user = result.rows[0];
  try {
    await connection.query(`UPDATE ludo_sessions SET last_activity_at=NOW() WHERE token_hash=$1`, [hash]);
  } catch {}
  return user;
}

module.exports = { authenticatedUser };
