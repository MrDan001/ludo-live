const { Pool } = require('pg');

let pool = null;
let ready = null;
function db(){
  if(!pool){
    const raw=process.env.DATABASE_URL;
    if(!raw)throw new Error('DATABASE_URL is not configured');
    let connectionString=raw;
    try{const u=new URL(connectionString);u.searchParams.delete('sslmode');u.searchParams.delete('sslcert');u.searchParams.delete('sslkey');u.searchParams.delete('sslrootcert');connectionString=u.toString();}catch{}
    pool=new Pool({connectionString,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:false,max:2,connectionTimeoutMillis:5000,idleTimeoutMillis:5000});
  }
  return pool;
}
async function ensure(){
  if(!ready)ready=(async()=>{await db().query(`CREATE TABLE IF NOT EXISTS ludo_player_notifications(id BIGSERIAL PRIMARY KEY,user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,admin_user_id TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,title TEXT NOT NULL,message TEXT NOT NULL,kind TEXT NOT NULL DEFAULT 'admin',read_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());CREATE INDEX IF NOT EXISTS ludo_player_notifications_user_idx ON ludo_player_notifications(user_id,created_at DESC);`);})().catch(e=>{ready=null;throw e;});
  return ready;
}
async function createWinnerNotification(roomCode,winnerId,winnerName){
  const code=String(roomCode||'').trim().toUpperCase(),uid=String(winnerId||'').trim();
  if(!code||!uid)return;
  await ensure();
  const client=await db().connect();
  try{
    await client.query('BEGIN');
    const bet=await client.query('SELECT pot FROM ludo_multiplayer_match_bets WHERE room_code=$1 LIMIT 1',[code]);
    if(!bet.rowCount){await client.query('COMMIT');return;}
    const title='🏆 Multiplayer Victory!';
    const message=`Congratulations ${String(winnerName||'Player')}! You were declared the winner because the opponent left the game. ${Number(bet.rows[0].pot)||0} coins have been awarded to your profile.`;
    await client.query('INSERT INTO ludo_player_notifications(user_id,title,message,kind) VALUES($1,$2,$3,$4)',[uid,title,message,'multiplayer_stake']);
    await client.query('COMMIT');
  }catch(e){try{await client.query('ROLLBACK');}catch{}throw e;}finally{client.release();}
}
module.exports={ensure,createWinnerNotification};
