const {Pool}=require("pg");

const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.NODE_ENV==="production"?{rejectUnauthorized:false}:false});
const KINDS=new Set(["play_games","win_games","roll_dice","move_tokens","send_messages","join_rooms","create_rooms","roll_sixes","move_home","complete_games"]);
let readyPromise=null;
function setup(){
  if(!readyPromise) readyPromise=(async()=>{await pool.query(`CREATE TABLE IF NOT EXISTS ludo_mission_definitions(
    id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',target INTEGER NOT NULL DEFAULT 1,
    reward_coins INTEGER NOT NULL DEFAULT 0,reward_gems INTEGER NOT NULL DEFAULT 0,kind TEXT NOT NULL DEFAULT 'play_games',
    admin_created BOOLEAN NOT NULL DEFAULT FALSE,active BOOLEAN NOT NULL DEFAULT TRUE,scheduled_date DATE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS ludo_daily_missions(
    user_id TEXT NOT NULL,mission_day DATE NOT NULL,slot INTEGER NOT NULL,mission_id TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,claimed BOOLEAN NOT NULL DEFAULT FALSE,claimed_at TIMESTAMPTZ,
    PRIMARY KEY(user_id,mission_day,slot),UNIQUE(user_id,mission_day,mission_id)
  );
  CREATE TABLE IF NOT EXISTS ludo_daily_mission_bonus(
    user_id TEXT NOT NULL,mission_day DATE NOT NULL,unlocked BOOLEAN NOT NULL DEFAULT FALSE,claimed BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_at TIMESTAMPTZ,PRIMARY KEY(user_id,mission_day)
  );
  CREATE TABLE IF NOT EXISTS ludo_daily_mission_progress(
    user_id TEXT NOT NULL,mission_day DATE NOT NULL,kind TEXT NOT NULL,progress INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,mission_day,kind)
  );
  CREATE TABLE IF NOT EXISTS ludo_mission_events(
    user_id TEXT NOT NULL,event_day DATE NOT NULL,event_id TEXT NOT NULL,kind TEXT NOT NULL,amount INTEGER NOT NULL DEFAULT 1,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id,event_id)
  );`);})();
  return readyPromise;
}
function day(){return new Date().toISOString().slice(0,10)}
async function record(pid,kind,amount=1,eventId){
  pid=String(pid||"").trim();if(!pid||!KINDS.has(kind))return;
  const n=Math.max(1,Math.min(50,Math.trunc(Number(amount)||1))),id=String(eventId||`${kind}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try{await setup();const d=day();const r=await pool.query(`INSERT INTO ludo_mission_events(user_id,event_day,event_id,kind,amount)
    VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,event_id) DO NOTHING RETURNING event_id`,[pid,d,id,kind,n]);
    if(r.rowCount)await pool.query(`INSERT INTO ludo_daily_mission_progress(user_id,mission_day,kind,progress)
      VALUES($1,$2,$3,$4) ON CONFLICT(user_id,mission_day,kind) DO UPDATE SET progress=ludo_daily_mission_progress.progress+EXCLUDED.progress`,[pid,d,kind,n]);
    if(r.rowCount){
      const assigned=await pool.query(`SELECT dm.mission_id,md.kind,md.target,dm.completed FROM ludo_daily_missions dm
        JOIN ludo_mission_definitions md ON md.id=dm.mission_id WHERE dm.user_id=$1 AND dm.mission_day=$2`,[pid,d]);
      const values=await pool.query(`SELECT kind,progress FROM ludo_daily_mission_progress WHERE user_id=$1 AND mission_day=$2`,[pid,d]);
      const progress=Object.fromEntries(values.rows.map(x=>[x.kind,Number(x.progress)]));
      for(const m of assigned.rows)if(!m.completed&&Number(progress[m.kind]||0)>=Number(m.target))await pool.query(`UPDATE ludo_daily_missions SET completed=TRUE WHERE user_id=$1 AND mission_day=$2 AND mission_id=$3`,[pid,d,m.mission_id]);
      const done=await pool.query(`SELECT COUNT(*)::int n FROM ludo_daily_missions WHERE user_id=$1 AND mission_day=$2 AND completed=TRUE`,[pid,d]);
      if(Number(done.rows[0]?.n)>=6)await pool.query(`INSERT INTO ludo_daily_mission_bonus(user_id,mission_day,unlocked) VALUES($1,$2,TRUE) ON CONFLICT(user_id,mission_day) DO UPDATE SET unlocked=TRUE`,[pid,d]);
    }
  }catch(e){console.error("[missions]",e.message)}
}
const {Server}=require("socket.io");const originalOn=Server.prototype.on;
if(!Server.prototype.__ludoMissionPatched){Server.prototype.__ludoMissionPatched=true;Server.prototype.on=function(event,listener){if(event!=="connection")return originalOn.call(this,event,listener);const wrapped=(socket)=>{listener(socket);install(socket)};return originalOn.call(this,event,wrapped)}}
function install(socket){
  const pid=()=>String(socket.data.playerId||socket.data.__ludoPid||"").trim();
  socket.on("join-room",payload=>{const kind=payload?.host?"create_rooms":"join_rooms";record(String(payload?.playerId||pid()),kind,1,`${kind}-${day()}-${String(payload?.roomCode||"")}-${String(payload?.playerId||pid())}`)});
  socket.on("start-game",()=>record(pid(),"play_games",1,`start-${String(socket.data.roomCode||"")}-${pid()}-${Date.now()}`));
  socket.on("game-roll",()=>{const p=pid();if(p)record(p,"roll_dice",1,`roll-${String(socket.data.roomCode||"")}-${p}-${Date.now()}`)});
  socket.on("game-move",payload=>{const p=pid();if(p&&String(payload?.tokenId||"")!=="__skip__")record(p,"move_tokens",1,`move-${String(socket.data.roomCode||"")}-${p}-${Date.now()}`)});
  socket.on("chat",()=>{const p=pid();if(p)record(p,"send_messages",1,`chat-${String(socket.data.roomCode||"")}-${p}-${Date.now()}`)});
  const originalEmit=socket.emit.bind(socket);
  socket.emit=function(event,...args){try{
    if(event==="game-dice"){const value=Number(args[0]?.value||0),p=String(args[0]?.playerId||"");if(p&&p===pid()&&value===6)record(p,"roll_sixes",1,`six-${String(socket.data.roomCode||"")}-${p}-${Date.now()}`)}
    if(event==="game-moved"){const p=String(args[0]?.playerId||""),to=Number(args[0]?.to||0);if(p&&p===pid()&&to===56)record(p,"move_home",1,`home-${String(socket.data.roomCode||"")}-${p}-${Date.now()}`)}
    if(event==="game-state"){const state=args[0]||{};if(state.status==="finished"&&state.winnerId&&String(state.winnerId)===pid()){const p=String(state.winnerId);record(p,"win_games",1,`win-${String(socket.data.roomCode||"")}-${p}-${Date.now()}`);record(p,"complete_games",1,`finish-${String(socket.data.roomCode||"")}-${p}-${Date.now()}`)}}
  }catch{}return originalEmit(event,...args)};
}
