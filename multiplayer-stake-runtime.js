const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const MIN_STAKE = 100;
const MAX_STAKE = 10000;
const state = globalThis;
let pool = null;
let schemaReady = null;

function db() {
  if (!pool) {
    const raw = process.env.DATABASE_URL;
    if (!raw) throw new Error('DATABASE_URL is not configured');
    let connectionString = raw;
    try {
      const u = new URL(connectionString);
      u.searchParams.delete('sslmode'); u.searchParams.delete('sslcert'); u.searchParams.delete('sslkey'); u.searchParams.delete('sslrootcert');
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

function normalizeCode(value) { return String(value || '').trim().toUpperCase().slice(0, 32); }
function normalizeStake(value) {
  const n = Math.trunc(Number(value));
  return Number.isInteger(n) && n >= MIN_STAKE && n <= MAX_STAKE ? n : null;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = await db().connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS ludo_multiplayer_match_bets(
            id BIGSERIAL PRIMARY KEY,
            room_code TEXT NOT NULL UNIQUE,
            mode_players INTEGER NOT NULL CHECK(mode_players IN (2,4)),
            stake_per_player INTEGER NOT NULL CHECK(stake_per_player BETWEEN ${MIN_STAKE} AND ${MAX_STAKE}),
            pot BIGINT NOT NULL CHECK(pot >= 0),
            status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','locked','settled','refunded','cancelled')),
            winner_id TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            started_at TIMESTAMPTZ,
            settled_at TIMESTAMPTZ
          );
          CREATE INDEX IF NOT EXISTS ludo_multiplayer_match_bets_status_idx ON ludo_multiplayer_match_bets(status,created_at DESC);
          CREATE TABLE IF NOT EXISTS ludo_multiplayer_match_bet_players(
            bet_id BIGINT NOT NULL REFERENCES ludo_multiplayer_match_bets(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
            stake INTEGER NOT NULL CHECK(stake BETWEEN ${MIN_STAKE} AND ${MAX_STAKE}),
            joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY(bet_id,user_id)
          );
          CREATE INDEX IF NOT EXISTS ludo_multiplayer_match_bet_players_user_idx ON ludo_multiplayer_match_bet_players(user_id,joined_at DESC);
          CREATE TABLE IF NOT EXISTS ludo_wallet_audit(
            id BIGSERIAL PRIMARY KEY,
            user_id TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,
            currency TEXT NOT NULL CHECK(currency IN ('coins','gems')),
            amount BIGINT NOT NULL,
            balance_before BIGINT NOT NULL,
            balance_after BIGINT NOT NULL,
            source TEXT NOT NULL DEFAULT 'unknown',
            source_ref TEXT,
            actor_user_id TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,
            actor_type TEXT NOT NULL DEFAULT 'user',
            request_id TEXT,
            ip_address TEXT,
            user_agent TEXT,
            status TEXT NOT NULL DEFAULT 'verified',
            reason TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          ALTER TABLE ludo_wallet_audit ADD COLUMN IF NOT EXISTS actor_type TEXT NOT NULL DEFAULT 'user';
          ALTER TABLE ludo_wallet_audit ADD COLUMN IF NOT EXISTS source_ref TEXT;
          ALTER TABLE ludo_wallet_audit ADD COLUMN IF NOT EXISTS request_id TEXT;
          ALTER TABLE ludo_wallet_audit ADD COLUMN IF NOT EXISTS reason TEXT;
          CREATE INDEX IF NOT EXISTS ludo_wallet_audit_user_idx ON ludo_wallet_audit(user_id,created_at DESC);
        `);
      } finally { client.release(); }
    })().catch(error => { schemaReady = null; throw error; });
  }
  return schemaReady;
}

async function setWalletContext(client, meta) {
  const requestId = meta.requestId || randomUUID();
  const actorType = meta.actorType || (meta.actorUserId ? 'user' : 'system');
  if (!meta.source || !meta.sourceRef || !meta.reason || (!meta.actorUserId && actorType !== 'system')) {
    throw new Error('Wallet metadata requires source, source_ref, request_id, reason and actor.');
  }
  await client.query(`SELECT
    set_config('ludo.wallet_source',$1,true),
    set_config('ludo.wallet_source_ref',$2,true),
    set_config('ludo.wallet_actor',$3,true),
    set_config('ludo.wallet_actor_type',$4,true),
    set_config('ludo.wallet_request_id',$5,true),
    set_config('ludo.wallet_ip',$6,true),
    set_config('ludo.wallet_user_agent',$7,true),
    set_config('ludo.wallet_reason',$8,true)`, [
      meta.source, meta.sourceRef, String(meta.actorUserId || ''), actorType, requestId,
      String(meta.ip || ''), String(meta.userAgent || ''), meta.reason,
    ]);
  return requestId;
}

async function adjustCoins(client, userId, delta, meta) {
  const row = await client.query('SELECT id,coins,is_banned FROM ludo_users WHERE id=$1 FOR UPDATE', [String(userId)]);
  const user = row.rows[0];
  if (!user || user.is_banned) throw new Error('The player account cannot participate in this match.');
  const before = Number(user.coins) || 0;
  const after = before + Number(delta);
  if (!Number.isSafeInteger(after) || after < 0) throw new Error('Insufficient coins for this staking operation.');
  await setWalletContext(client, meta);
  await client.query('UPDATE ludo_users SET coins=$1 WHERE id=$2', [after, String(userId)]);
  return { before, after, amount: Number(delta) };
}

async function roomStake(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  await ensureSchema();
  const result = await db().query(`
    SELECT b.id,b.room_code,b.mode_players,b.stake_per_player,b.pot,b.status,b.winner_id,b.created_at,b.started_at,b.settled_at,
           COUNT(p.user_id)::int AS staked_players,
           COALESCE(SUM(p.stake),0)::bigint AS staked_amount
    FROM ludo_multiplayer_match_bets b
    LEFT JOIN ludo_multiplayer_match_bet_players p ON p.bet_id=b.id
    WHERE b.room_code=$1
    GROUP BY b.id
    LIMIT 1`, [normalized]);
  if (!result.rowCount) return null;
  const row = result.rows[0];
  return {
    betId: String(row.id),
    roomCode: normalized,
    roomSize: Number(row.mode_players) || 2,
    stakePerPlayer: Number(row.stake_per_player) || 0,
    pot: Number(row.pot) || 0,
    stakedAmount: Number(row.staked_amount) || 0,
    stakedPlayers: Number(row.staked_players) || 0,
    status: String(row.status || 'open'),
    winnerId: row.winner_id ? String(row.winner_id) : null,
    createdAt: row.created_at,
    startedAt: row.started_at,
    settledAt: row.settled_at,
  };
}

async function ensurePlayerStake({ code, playerId, roomSize, stake, socket }) {
  const normalizedCode = normalizeCode(code);
  const normalizedStake = normalizeStake(stake);
  const pid = String(playerId || '').trim();
  if (!normalizedCode || !pid || !normalizedStake) return { ok: true, funded: false };

  const size = Number(roomSize) === 2 ? 2 : 4;
  if (!socket.data?.roomCode) {
    const adapterCount = socket.nsp.adapter.rooms.get(normalizedCode)?.size || 0;
    if (adapterCount === 0 && !socket.data?.ludoCreatingRoom) return { ok: false, error: 'Room no longer exists. Please create or join a fresh room.' };
  }

  await ensureSchema();
  const client = await db().connect();
  let funded = false;
  try {
    await client.query('BEGIN');
    let betResult = await client.query('SELECT * FROM ludo_multiplayer_match_bets WHERE room_code=$1 FOR UPDATE', [normalizedCode]);
    let bet = betResult.rows[0];
    if (bet && ['settled','refunded','cancelled'].includes(String(bet.status))) {
      throw new Error('This room is no longer accepting stakes.');
    }
    if (bet && Number(bet.stake_per_player) !== normalizedStake) {
      throw new Error('The room stake has changed. Please rejoin using the current room stake.');
    }
    if (bet && Number(bet.mode_players) !== size) {
      throw new Error('The room player count does not match the stake configuration.');
    }
    if (!bet) {
      const created = await client.query(`INSERT INTO ludo_multiplayer_match_bets(room_code,mode_players,stake_per_player,pot,status)
        VALUES($1,$2,$3,0,'open') RETURNING *`, [normalizedCode, size, normalizedStake]);
      bet = created.rows[0];
    }

    const existingPlayer = await client.query('SELECT stake FROM ludo_multiplayer_match_bet_players WHERE bet_id=$1 AND user_id=$2 FOR UPDATE', [bet.id, pid]);
    if (!existingPlayer.rowCount) {
      const sourceRef = `${normalizedCode}:bet:${bet.id}:stake:${pid}`;
      await adjustCoins(client, pid, -normalizedStake, {
        source: 'multiplayer_stake',
        sourceRef,
        actorUserId: pid,
        actorType: 'user',
        reason: `Multiplayer stake of ${normalizedStake.toLocaleString()} coins for room ${normalizedCode}`,
      });
      await client.query('INSERT INTO ludo_multiplayer_match_bet_players(bet_id,user_id,stake) VALUES($1,$2,$3)', [bet.id, pid, normalizedStake]);
      await client.query('UPDATE ludo_multiplayer_match_bets SET pot=pot+$1 WHERE id=$2', [normalizedStake, bet.id]);
      funded = true;
    }
    await client.query('COMMIT');
    return { ok: true, funded, betId: String(bet.id), stake: normalizedStake };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to secure the multiplayer stake.' };
  } finally { client.release(); }
}

async function releasePlayerStake(code, playerId) {
  const normalizedCode = normalizeCode(code);
  const pid = String(playerId || '').trim();
  if (!normalizedCode || !pid) return;
  await ensureSchema();
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const bet = await client.query('SELECT * FROM ludo_multiplayer_match_bets WHERE room_code=$1 FOR UPDATE', [normalizedCode]);
    if (!bet.rowCount || bet.rows[0].status !== 'open') { await client.query('COMMIT'); return; }
    const row = await client.query('SELECT stake FROM ludo_multiplayer_match_bet_players WHERE bet_id=$1 AND user_id=$2 FOR UPDATE', [bet.rows[0].id, pid]);
    if (!row.rowCount) { await client.query('COMMIT'); return; }
    const stake = Number(row.rows[0].stake) || 0;
    const sourceRef = `${normalizedCode}:bet:${bet.rows[0].id}:refund:${pid}`;
    await adjustCoins(client, pid, stake, {
      source: 'multiplayer_stake_refund',
      sourceRef,
      actorType: 'system',
      reason: `Refund of ${stake.toLocaleString()} coins because room ${normalizedCode} was left before the match started`,
    });
    await client.query('DELETE FROM ludo_multiplayer_match_bet_players WHERE bet_id=$1 AND user_id=$2', [bet.rows[0].id, pid]);
    await client.query('UPDATE ludo_multiplayer_match_bets SET pot=GREATEST(0,pot-$1) WHERE id=$2', [stake, bet.rows[0].id]);
    const remaining = await client.query('SELECT COUNT(*)::int AS count FROM ludo_multiplayer_match_bet_players WHERE bet_id=$1', [bet.rows[0].id]);
    if (Number(remaining.rows[0].count) === 0) await client.query("UPDATE ludo_multiplayer_match_bets SET status='cancelled',settled_at=NOW() WHERE id=$1", [bet.rows[0].id]);
    await client.query('COMMIT');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('[multiplayer-stake] refund failed', normalizedCode, pid, error);
  } finally { client.release(); }
}

async function markMatchStarted(code) {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return;
  await ensureSchema();
  try {
    await db().query(`UPDATE ludo_multiplayer_match_bets
      SET status='locked',started_at=COALESCE(started_at,NOW())
      WHERE room_code=$1 AND status='open'`, [normalizedCode]);
  } catch (error) { console.error('[multiplayer-stake] start lock failed', normalizedCode, error); }
}

async function settleMatch(code, winnerId) {
  const normalizedCode = normalizeCode(code);
  const winner = String(winnerId || '').trim();
  if (!normalizedCode) return;
  await ensureSchema();
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const betResult = await client.query('SELECT * FROM ludo_multiplayer_match_bets WHERE room_code=$1 FOR UPDATE', [normalizedCode]);
    if (!betResult.rowCount) { await client.query('COMMIT'); return; }
    const bet = betResult.rows[0];
    if (!['open','locked'].includes(String(bet.status))) { await client.query('COMMIT'); return; }
    const players = await client.query('SELECT user_id,stake FROM ludo_multiplayer_match_bet_players WHERE bet_id=$1 ORDER BY user_id FOR UPDATE', [bet.id]);
    const pot = Number(bet.pot) || 0;
    if (winner) {
      const winnerExists = players.rows.some(p => String(p.user_id) === winner);
      if (!winnerExists) throw new Error('Winner did not fund this multiplayer match.');
      if (pot > 0) {
        const sourceRef = `${normalizedCode}:bet:${bet.id}:payout`;
        await adjustCoins(client, winner, pot, {
          source: 'multiplayer_stake_payout',
          sourceRef,
          actorType: 'system',
          reason: `Winner payout of ${pot.toLocaleString()} coins for multiplayer room ${normalizedCode}`,
        });
      }
      await client.query("UPDATE ludo_multiplayer_match_bets SET status='settled',winner_id=$1,settled_at=NOW() WHERE id=$2", [winner, bet.id]);
    } else {
      for (const player of players.rows) {
        const stake = Number(player.stake) || 0;
        if (!stake) continue;
        const sourceRef = `${normalizedCode}:bet:${bet.id}:refund:${String(player.user_id)}`;
        await adjustCoins(client, String(player.user_id), stake, {
          source: 'multiplayer_stake_refund',
          sourceRef,
          actorType: 'system',
          reason: `Refund of ${stake.toLocaleString()} coins because multiplayer room ${normalizedCode} ended without a winner`,
        });
      }
      await client.query("UPDATE ludo_multiplayer_match_bets SET status='refunded',settled_at=NOW() WHERE id=$1", [bet.id]);
    }
    await client.query('COMMIT');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('[multiplayer-stake] settlement failed', normalizedCode, error);
  } finally { client.release(); }
}

async function installSocketHooks() {
  const { Socket } = require('socket.io');
  if (!Socket || Socket.prototype.__ludoMultiplayerStakeRuntime) return;
  Socket.prototype.__ludoMultiplayerStakeRuntime = true;
  const originalOn = Socket.prototype.on;
  Socket.prototype.on = function(event, listener) {
    if (event === 'join-room') {
      return originalOn.call(this, event, async (...args) => {
        const payload = args[0] || {};
        const code = normalizeCode(payload.roomCode);
        const playerId = String(payload.playerId || '').trim();
        const roomInfo = state.__ludoStakeRoomGet ? state.__ludoStakeRoomGet(code) : null;
        const stake = normalizeStake(roomInfo?.stakeCoins || 0);
        const roomSize = Number(payload.roomSize) === 2 ? 2 : 4;
        let fundedHere = false;
        if (stake) {
          const result = await ensurePlayerStake({ code, playerId, roomSize, stake, socket: this });
          if (!result.ok) return this.emit('room-error', result.error || 'Unable to secure your room stake.');
          fundedHere = !!result.funded;
        }
        const result = await listener.apply(this, args);
        if (stake && fundedHere && String(this.data?.roomCode || '').trim().toUpperCase() !== code) {
          await releasePlayerStake(code, playerId);
        }
        return result;
      });
    }
    if (event === 'leave-room') {
      return originalOn.call(this, event, async (...args) => {
        const code = normalizeCode(this.data?.roomCode);
        const pid = String(this.data?.playerId || '').trim();
        const result = await listener.apply(this, args);
        const room = code && await roomStake(code);
        if (room?.status === 'open') await releasePlayerStake(code, pid);
        return result;
      });
    }
    if (event === 'disconnect') {
      return originalOn.call(this, event, async (...args) => {
        const code = normalizeCode(this.data?.roomCode);
        const pid = String(this.data?.playerId || '').trim();
        const result = await listener.apply(this, args);
        const room = code && await roomStake(code);
        if (room?.status === 'open') await releasePlayerStake(code, pid);
        return result;
      });
    }
    return originalOn.call(this, event, listener);
  };
}

state.__ludoMatchStarted = markMatchStarted;
state.__ludoMatchFinished = settleMatch;
state.__ludoMultiplayerStakeGet = roomStake;

ensureSchema().catch(error => console.error('[multiplayer-stake] schema initialization failed', error));
installSocketHooks().catch(error => console.error('[multiplayer-stake] socket hook initialization failed', error));

module.exports = { MIN_STAKE, MAX_STAKE, ensureSchema, roomStake, ensurePlayerStake, releasePlayerStake, markMatchStarted, settleMatch };
