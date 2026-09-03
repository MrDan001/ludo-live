const { Pool } = require('pg');

const globalState = globalThis;
if (!globalState.__ludoStakeRooms) globalState.__ludoStakeRooms = new Map();
const rooms = globalState.__ludoStakeRooms;
let pool = null;

function db() {
  if (!pool) {
    const raw = process.env.DATABASE_URL;
    if (!raw) throw new Error('DATABASE_URL is not configured');
    pool = new Pool({
      connectionString: raw,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 2,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 5000,
      allowExitOnIdle: true,
    });
  }
  return pool;
}

function normalizeCode(value) { return String(value || '').trim().toUpperCase(); }
function normalizeStake(value) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 100 || n > 10000) return null;
  return n;
}
function publicStake(code) {
  const entry = rooms.get(code);
  if (!entry) return { stakeType: 'free', stakeCoins: 0, paid: false };
  return { stakeType: entry.stakeCoins > 0 ? 'paid' : 'free', stakeCoins: entry.stakeCoins, paid: entry.stakeCoins > 0 };
}
async function hasEnoughCoins(playerId, amount) {
  if (!playerId) return { ok: false, reason: 'Please sign in before joining a paid room.' };
  try {
    const result = await db().query('SELECT coins,is_banned FROM ludo_users WHERE id=$1 LIMIT 1', [String(playerId)]);
    const user = result.rows[0];
    if (!user || user.is_banned) return { ok: false, reason: 'Your account cannot join this room.' };
    const coins = Number(user.coins) || 0;
    if (coins < amount) return { ok: false, reason: `You need ${amount.toLocaleString()} coins to join this paid room. Your balance is ${coins.toLocaleString()}.` };
    return { ok: true, coins };
  } catch (error) {
    console.error('stake wallet check', error);
    return { ok: false, reason: 'Unable to verify your coin balance right now. Please try again.' };
  }
}
function registerRoom(code, hostPlayerId, stakeCoins) {
  const normalizedStake = Number(stakeCoins) || 0;
  if (normalizedStake !== 0 && normalizeStake(normalizedStake) === null) throw new Error('Stake must be 0 for a free room or between 100 and 10,000 coins.');
  const existing = rooms.get(code);
  if (existing && existing.hostPlayerId !== String(hostPlayerId || '')) throw new Error('This room already has a stake setting.');
  rooms.set(code, { hostPlayerId: String(hostPlayerId || ''), stakeCoins: normalizedStake, createdAt: existing?.createdAt || Date.now(), updatedAt: Date.now() });
  return publicStake(code);
}
function patchSocketOn(Socket) {
  const originalOn = Socket.prototype.on;
  if (Socket.prototype.__ludoStakePatched) return;
  Socket.prototype.__ludoStakePatched = true;
  Socket.prototype.on = function patchedStakeOn(event, listener) {
    if (event !== 'join-room') return originalOn.call(this, event, listener);
    return originalOn.call(this, event, async (...args) => {
      const incoming = args[0] || {};
      const code = normalizeCode(incoming.roomCode);
      const pid = String(incoming.playerId || '').trim();
      const existing = rooms.get(code);
      const requestedHost = !!incoming.host;
      const hasStakeFields = incoming.stakeType !== undefined || incoming.stakeCoins !== undefined;

      // Capture the host's create-room choice before server.js broadcasts room-list.
      if (requestedHost && pid && hasStakeFields) {
        const requestedType = String(incoming.stakeType || '').toLowerCase();
        const requestedCoins = requestedType === 'free' ? 0 : (incoming.stakeCoins ?? 0);
        const normalizedStake = Number(requestedCoins) === 0 ? 0 : normalizeStake(requestedCoins);
        if (normalizedStake === null) return this.emit('room-error', 'Paid room stakes must be between 100 and 10,000 coins.');
        if (existing && existing.hostPlayerId !== pid) return this.emit('room-error', 'Only the player who created this room can change its stake setting.');
        try { registerRoom(code, pid, normalizedStake); }
        catch (error) { return this.emit('room-error', error instanceof Error ? error.message : 'Unable to save the room stake.'); }
      }

      const entry = rooms.get(code);
      if (entry && requestedHost && entry.hostPlayerId !== pid) return this.emit('room-error', 'Only the player who created this room can claim it as host.');
      const stakeCoins = entry ? Number(entry.stakeCoins) || 0 : 0;
      if (stakeCoins > 0) {
        const check = await hasEnoughCoins(pid, stakeCoins);
        if (!check.ok) return this.emit('room-error', check.reason);
      }
      const payload = { ...incoming, stakeType: stakeCoins > 0 ? 'paid' : 'free', stakeCoins };
      return listener.call(this, payload, ...args.slice(1));
    });
  };
}
function patchServerEmit(Server) {
  if (Server.prototype.__ludoStakeEmitPatched) return;
  Server.prototype.__ludoStakeEmitPatched = true;
  const originalEmit = Server.prototype.emit;
  Server.prototype.emit = function patchedStakeEmit(event, ...args) {
    if (event === 'room-list' && Array.isArray(args[0])) {
      args[0] = args[0].map(room => ({ ...room, ...publicStake(normalizeCode(room?.code)) }));
      const activeCodes = new Set(args[0].map(room => normalizeCode(room?.code)).filter(Boolean));
      const now = Date.now();
      for (const [code, entry] of rooms.entries()) {
        if (!activeCodes.has(code) && now - Number(entry.updatedAt || entry.createdAt || now) > 6 * 60 * 60 * 1000) rooms.delete(code);
      }
    }
    return originalEmit.call(this, event, ...args);
  };
}
try {
  const socketIo = require('socket.io');
  const Socket = require('socket.io').Socket;
  if (Socket) patchSocketOn(Socket);
  if (socketIo.Server) patchServerEmit(socketIo.Server);
} catch (error) { console.error('stake room runtime patch', error); }
globalState.__ludoStakeRoomRegister = registerRoom;
globalState.__ludoStakeRoomGet = code => publicStake(normalizeCode(code));
