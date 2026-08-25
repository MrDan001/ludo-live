const { Pool } = require('pg');
const { Socket, Server } = require('socket.io');

const MIN_STAKE = 500;
const MAX_STAKE = 10000;
const rooms = new Map();
let pool = null;
let schemaReady = null;

function db() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
    let connectionString = process.env.DATABASE_URL;
    try {
      const u = new URL(connectionString);
      u.searchParams.delete('sslmode'); u.searchParams.delete('sslcert'); u.searchParams.delete('sslkey'); u.searchParams.delete('sslrootcert');
      connectionString = u.toString();
    } catch {}
    pool = new Pool({ connectionString, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
  }
  return pool;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = db().query(`
      CREATE TABLE IF NOT EXISTS ludo_match_bets(
        id BIGSERIAL PRIMARY KEY,
        room_code TEXT NOT NULL UNIQUE,
        mode_players INTEGER NOT NULL CHECK(mode_players IN (2,4)),
        stake_per_player INTEGER NOT NULL CHECK(stake_per_player BETWEEN ${MIN_STAKE} AND ${MAX_STAKE}),
        pot INTEGER NOT NULL CHECK(pot > 0),
        status TEXT NOT NULL DEFAULT 'locked' CHECK(status IN ('locked','settled','refunded','cancelled')),
        winner_id TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        settled_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS ludo_match_bets_status_idx ON ludo_match_bets(status,created_at DESC);
      CREATE TABLE IF NOT EXISTS ludo_match_bet_players(
        bet_id BIGINT NOT NULL REFERENCES ludo_match_bets(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
        stake INTEGER NOT NULL,
        PRIMARY KEY(bet_id,user_id)
      );
    `).then(() => undefined).catch(e => { schemaReady = null; throw e; });
  }
  return schemaReady;
}

function validStake(value) { const n = Math.trunc(Number(value)); return Number.isInteger(n) && n >= MIN_STAKE && n <= MAX_STAKE; }
function roomFor(socket) { const code = String(socket.data?.roomCode || '').trim().toUpperCase(); return code ? rooms.get(code) : null; }
function state(room) {
  const stake = validStake(room.stake) ? room.stake : 0;
  return { enabled:true, stake, minStake:MIN_STAKE, maxStake:MAX_STAKE, pot:stake ? stake*room.roomSize : 0, roomSize:room.roomSize, locked:!!room.locked, status:room.betStatus||'open', agreed:!!stake, stakedPlayers:room.stakedPlayers?.size||0, allStaked:(room.stakedPlayers?.size||0)===room.roomSize };
}
function broadcastState(io, room) { if (room) io.to(room.code).emit('bet-room-state', state(room)); }

async function lockBet(room) {
  if (!room || room.betStatus === 'locked' || room.betStatus === 'settled') return { ok:true };
  const members = [...room.members.values()].filter(m => m.playerId || m.id);
  if (members.length !== room.roomSize) return { ok:false, error:`Waiting for all players (${members.length}/${room.roomSize}).` };
  if (!validStake(room.stake)) return { ok:false, error:`The host must first agree and set a stake between ${MIN_STAKE} and ${MAX_STAKE} coins.` };
  if (room.stakedPlayers.size !== room.roomSize) return { ok:false, error:`Waiting for all players to stake (${room.stakedPlayers.size}/${room.roomSize}).` };
  const ids = [...new Set(members.map(m => String(m.playerId || m.id).trim()).filter(Boolean))];
  if (ids.length !== room.roomSize) return { ok:false, error:'Every player must have a valid account.' };
  const client = await db().connect();
  try {
    await ensureSchema(); await client.query('BEGIN');
    const rows = await client.query('SELECT id,coins FROM ludo_users WHERE id = ANY($1::text[]) FOR UPDATE',[ids]);
    if (rows.rowCount !== ids.length) throw new Error('One or more players could not be found.');
    const balances = new Map(rows.rows.map(r => [String(r.id),Number(r.coins)||0]));
    for (const id of ids) if ((balances.get(id)||0) < room.stake) throw new Error(`A player needs at least ${room.stake} coins to enter this match.`);
    const existing = await client.query('SELECT id,status FROM ludo_match_bets WHERE room_code=$1 FOR UPDATE',[room.code]);
    if (existing.rowCount && (existing.rows[0].status === 'locked' || existing.rows[0].status === 'settled')) { await client.query('COMMIT'); room.locked=existing.rows[0].status==='locked'; room.betStatus=existing.rows[0].status; room.betId=String(existing.rows[0].id); return {ok:true}; }
    if (existing.rowCount) await client.query('DELETE FROM ludo_match_bets WHERE room_code=$1',[room.code]);
    const pot=room.stake*room.roomSize;
    const bet=await client.query("INSERT INTO ludo_match_bets(room_code,mode_players,stake_per_player,pot,status) VALUES($1,$2,$3,$4,'locked') RETURNING id",[room.code,room.roomSize,room.stake,pot]);
    const betId=bet.rows[0].id;
    for (const id of ids) { await client.query('UPDATE ludo_users SET coins=coins-$1 WHERE id=$2',[room.stake,id]); await client.query('INSERT INTO ludo_match_bet_players(bet_id,user_id,stake) VALUES($1,$2,$3)',[betId,id,room.stake]); }
    await client.query('COMMIT'); room.locked=true; room.betStatus='locked'; room.betId=String(betId); return {ok:true};
  } catch(e) { try { await client.query('ROLLBACK'); } catch {} return {ok:false,error:e instanceof Error?e.message:'Unable to lock the bet.'}; }
  finally { client.release(); }
}

async function settleBet(room,winnerId) {
  if (!room || !winnerId || room.betStatus!=='locked' || room.settling) return {ok:false};
  room.settling=true; const client=await db().connect();
  try {
    await ensureSchema(); await client.query('BEGIN');
    const bet=await client.query('SELECT id,pot,status FROM ludo_match_bets WHERE room_code=$1 FOR UPDATE',[room.code]);
    if (!bet.rowCount) throw new Error('Bet record not found.');
    if (bet.rows[0].status!=='locked') { await client.query('COMMIT'); room.betStatus=bet.rows[0].status; room.locked=false; return {ok:true,duplicate:true}; }
    const pot=Number(bet.rows[0].pot)||0;
    const winner=await client.query('SELECT id FROM ludo_users WHERE id=$1 FOR UPDATE',[winnerId]);
    if (!winner.rowCount) throw new Error('Winner account not found.');
    await client.query('UPDATE ludo_users SET coins=coins+$1 WHERE id=$2',[pot,winnerId]);
    await client.query("UPDATE ludo_match_bets SET status='settled',winner_id=$1,settled_at=NOW() WHERE id=$2 AND status='locked'",[winnerId,bet.rows[0].id]);
    await client.query('COMMIT'); room.betStatus='settled'; room.locked=false; room.settledWinnerId=winnerId; return {ok:true,pot};
  } catch(e) { try { await client.query('ROLLBACK'); } catch {} console.error('[bet] settlement failed',room.code,e); return {ok:false,error:e instanceof Error?e.message:'Unable to settle the bet.'}; }
  finally { room.settling=false; client.release(); }
}

function installBetSystem() {
  if (Socket.prototype.__ludoBetPatched) return;
  Socket.prototype.__ludoBetPatched=true;
  const originalOn=Socket.prototype.on;
  Socket.prototype.on=function(event,listener) {
    if (event==='join-room') return originalOn.call(this,event,async(...args)=>{
      const payload=args[0]||{}; const code=String(payload.roomCode||'').trim().toUpperCase();
      let room=code&&rooms.get(code);
      if (!room) { const size=Number(payload.roomSize)===2?2:4; room={code,roomSize:size,stake:0,members:new Map(),stakedPlayers:new Set(),locked:false,betStatus:'open',betId:null}; rooms.set(code,room); }
      else if (room.locked) return this.emit('room-error','This match has already started.');
      const originalResult=await listener.apply(this,args); const pid=String(payload.playerId||'').trim();
      if (pid&&this.data.roomCode===code) room.members.set(this.id,{socketId:this.id,playerId:pid,name:String(payload.name||'Player').slice(0,24),host:!!payload.host,ready:!!payload.host});
      room.roomSize=Number(payload.roomSize)===2?2:Number(payload.roomSize)===4?4:room.roomSize;
      this.emit('bet-room-state',state(room)); broadcastState(this.nsp,room); return originalResult;
    });
    if (event==='set-stake') return originalOn.call(this,event,(...args)=>{
      const room=roomFor(this); const member=room?.members.get(this.id); const requested=Math.trunc(Number(args[0]?.stake||0));
      if(!room||!member?.host)return this.emit('room-error','Only the host can set the agreed stake.');
      if(room.locked)return this.emit('room-error','The stake is already locked for this match.');
      if(!validStake(requested))return this.emit('room-error',`Stake must be between ${MIN_STAKE} and ${MAX_STAKE} coins.`);
      if(room.stakedPlayers.size>0 && requested!==room.stake)return this.emit('room-error','The stake cannot change after a player has confirmed it.');
      room.stake=requested; room.stakedPlayers.clear(); room.betStatus='open';
      broadcastState(this.nsp,room); this.nsp.to(room.code).emit('bet-agreed',{stake:requested,pot:requested*room.roomSize}); return;
    });
    if (event==='stake') return originalOn.call(this,event,(...args)=>{
      const room=roomFor(this); const member=room?.members.get(this.id);
      if(!room||!member)return;
      if(!validStake(room.stake))return this.emit('stake-error','The host has not set an agreed stake yet.');
      if(room.locked)return this.emit('stake-error','The match stake is already locked.');
      room.stakedPlayers.add(this.id); broadcastState(this.nsp,room); this.emit('stake-confirmed',{stake:room.stake,playerId:member.playerId||member.id}); return;
    });
    if (event==='ready') return originalOn.call(this,event,(...args)=>{const room=roomFor(this);const member=room?.members.get(this.id);if(member)member.ready=!!args[0]?.ready;return listener.apply(this,args);});
    if (event==='disconnect') return originalOn.call(this,event,(...args)=>{const room=roomFor(this);if(room){room.members.delete(this.id);room.stakedPlayers.delete(this.id);if(room.members.size===0)rooms.delete(room.code);}return listener.apply(this,args);});
    if (event==='start-game') return originalOn.call(this,event,async(...args)=>{
      const room=roomFor(this); if(!room)return listener.apply(this,args); const member=room.members.get(this.id); if(!member?.host)return listener.apply(this,args);
      if(!validStake(room.stake))return this.emit('start-error',`Agree a stake between ${MIN_STAKE} and ${MAX_STAKE} coins before starting.`);
      const activeMembers=[...room.members.values()].filter(m=>this.nsp.sockets.sockets.has(m.socketId));
      if(activeMembers.length!==room.roomSize||!activeMembers.every(m=>m.ready))return listener.apply(this,args);
      if(room.stakedPlayers.size!==room.roomSize)return this.emit('start-error',`Every player must stake ${room.stake} coins before the game can start.`);
      room.members=new Map(activeMembers.map(m=>[m.socketId,m])); const result=await lockBet(room);
      if(!result.ok)return this.emit('start-error',result.error||'Unable to lock the bet.');
      broadcastState(this.nsp,room); return listener.apply(this,args);
    });
    return originalOn.call(this,event,listener);
  };

  const originalTo=Server.prototype.to;
  Server.prototype.to=function(...args) {
    const server=this; const op=originalTo.apply(server,args); const originalBroadcastEmit=op.emit;
    op.emit=function(event,...payload) {
      const code=String(args[0]||'').toUpperCase(); const room=rooms.get(code);
      if(event==='roster'&&Array.isArray(payload[0])&&room) {
        const next=new Map();
        for(const m of payload[0]) { const socketId=String(m.id||m.socketId||''); const playerId=String(m.playerId||m.id||''); if(socketId)next.set(socketId,{socketId,playerId,name:String(m.name||'Player'),host:!!m.host,ready:!!m.ready}); }
        room.members=next; for(const id of [...room.stakedPlayers])if(!next.has(id))room.stakedPlayers.delete(id);
      }
      if(event==='game-state'&&room&&room.betStatus==='locked') {
        const game=payload[0]||{}; const winnerId=String(game.winnerId||'').trim();
        if(game.status==='finished'&&winnerId) void settleBet(room,winnerId).then(settled=>{ if(settled.ok&&!settled.duplicate) op.emit('bet-settled',{winnerId,pot:settled.pot,stake:room.stake,roomSize:room.roomSize}); broadcastState(server,room); });
      }
      return originalBroadcastEmit.apply(op,[event,...payload]);
    };
    return op;
  };
  ensureSchema().catch(e=>console.error('[bet] schema initialization failed',e));
}

installBetSystem();
module.exports={MIN_STAKE,MAX_STAKE,rooms,state,validStake,broadcastState};
