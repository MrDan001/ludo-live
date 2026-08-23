const { Server } = require("socket.io");

// Clean 2/2 MultiplayerGame authority. This module owns only 2-player online
// matches. Tournament and Friends/Mode use their own engines and are untouched.
const originalServerOn = Server.prototype.on;
const games = new Map();
const COLORS = ["red", "yellow", "green", "blue"];
const START = { red: 0, blue: 13, green: 26, yellow: 39 };
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const FINISH = 56;
const RECONNECT_MS = 30000;

function pid(socket){ return String(socket.data.playerId || "").trim(); }
function code(socket){ return String(socket.data.roomCode || "").trim().toUpperCase(); }
function colors(seat){ return seat === 0 ? ["red", "yellow"] : ["green", "blue"]; }
function globalPos(color,pos){ return pos >= 1 && pos <= 51 ? (START[color] + pos - 1) % 52 : null; }
function tokens(){ return Object.fromEntries(COLORS.map(c => [c,Object.fromEntries([0,1,2,3].map(id => [String(id),{position:0}]))])); }
function player(game,color){ return game.players.find(p => p.colors.includes(color)); }
function pos(game,color,id){ return Number(game.tokens[color]?.[String(id)]?.position || 0); }
function own(game,pidValue,color,id){ const p=player(game,color); return !!p && p.playerId===pidValue && !!game.tokens[color]?.[String(id)]; }
function occupants(game,global,except){ const out=[]; for(const color of COLORS){ if(color===except) continue; for(let id=0;id<4;id++) if(globalPos(color,pos(game,color,id))===global) out.push({color,id}); } return out; }
function block(game,global,owner){ for(const color of COLORS){ const p=player(game,color); if(!p || p.playerId===owner) continue; let n=0; for(let id=0;id<4;id++) if(globalPos(color,pos(game,color,id))===global)n++; if(n>=2)return true; } return false; }
function pathClear(game,color,from,to){ const start=globalPos(color,from); if(start===null)return true; for(let step=1;step<=to-from;step++){const g=(start+step)%52;if(block(game,g,player(game,color)?.playerId||""))return false;} return true; }
function legal(game,color,id,roll){
  if(!Number.isInteger(roll)||roll<1||roll>6)return false;
  const from=pos(game,color,id); if(from===FINISH)return false;
  const target=from===0?(roll===6?1:-1):from+roll;
  if(target<1||target>FINISH)return false;
  if(from===0 && roll!==6)return false;
  if(!pathClear(game,color,from,Math.min(target,51)))return false;
  if(target>=52)return true;
  const g=globalPos(color,target); if(block(game,g,player(game,color)?.playerId||""))return false;
  const hits=occupants(game,g,color); return SAFE.has(g)||hits.length<=1;
}
function hasMove(game,pidValue,roll){ const p=game.players.find(x=>x.playerId===pidValue); return !!p && p.colors.some(c=>[0,1,2,3].some(id=>legal(game,c,id,roll))); }
function snapshot(g){ return {status:g.status,currentPlayerId:g.currentPlayerId,dice:g.dice,pendingMove:g.pendingMove,sixStreak:g.sixStreak,players:g.players.map(p=>({playerId:p.playerId,name:p.name,seat:p.seat,connected:!!p.socket,colors:p.colors})),tokens:g.tokens,winnerId:g.winnerId||null,reconnectDeadline:g.reconnectDeadline||null}; }
function emit(g,event,payload){ for(const p of g.players) if(p.socket?.connected) p.socket.emit(event,payload); }
function state(g){ emit(g,"game-state",snapshot(g)); }
function next(g){ const i=g.players.findIndex(p=>p.playerId===g.currentPlayerId); if(i<0)return null; for(let n=1;n<=g.players.length;n++){const p=g.players[(i+n)%g.players.length];if(p.socket?.connected)return p;} return null; }
function init(g){ g.status="playing";g.currentPlayerId=g.players[0]?.playerId||null;g.dice=null;g.pendingMove=null;g.sixStreak=0;g.winnerId=null;g.reconnectDeadline=null;g.tokens=tokens(); }
function attach(socket,payload){
  const room=String(payload?.roomCode||"").trim().toUpperCase(), playerId=String(payload?.playerId||"").trim();
  if(!room||!playerId||Number(payload?.roomSize)!==2)return;
  socket.data.ludoV2=true; socket.data.roomCode=room; socket.data.playerId=playerId;
  let g=games.get(room); if(!g) g={code:room,players:[],status:"waiting",currentPlayerId:null,dice:null,pendingMove:null,sixStreak:0,tokens:tokens(),winnerId:null,reconnectDeadline:null};
  let p=g.players.find(x=>x.playerId===playerId);
  if(!p){ if(g.players.length>=2)return; const seat=g.players.length; p={playerId,name:String(payload?.name||"Player").slice(0,24),seat,colors:colors(seat),socket,ready:seat===0};g.players.push(p); }
  else { p.socket=socket;p.name=String(payload?.name||p.name||"Player").slice(0,24);if(g.status==="paused"&&g.currentPlayerId===playerId){g.status="playing";g.reconnectDeadline=null;} }
  games.set(room,g); socket.emit("game-state",snapshot(g)); if(g.status==="playing")state(g);
}
function ready(socket,payload){ if(!socket.data.ludoV2)return; const g=games.get(code(socket));const p=g?.players.find(x=>x.playerId===pid(socket));if(p)p.ready=!!payload?.ready; }
function start(socket){
  if(!socket.data.ludoV2)return; const g=games.get(code(socket)); if(!g||g.status==="playing")return;
  if(g.players[0]?.playerId!==pid(socket)||g.players.length!==2||!g.players.every(p=>p.ready&&p.socket?.connected))return;
  init(g); for(const p of g.players){p.socket.data.ludoV2Started=true;p.socket.emit("start-game",{roomCode:g.code,players:g.players.map(x=>({playerId:x.playerId,name:x.name,seat:x.seat,colors:x.colors}))});} state(g);
}
function roll(socket){
  if(!socket.data.ludoV2)return;const g=games.get(code(socket));if(!g||g.status!=="playing")return;const id=pid(socket);if(g.currentPlayerId!==id||g.pendingMove!==null)return;
  const value=1+Math.floor(Math.random()*6);g.dice=value;g.sixStreak=value===6?g.sixStreak+1:0;emit(g,"game-dice",{playerId:id,value});
  if(value===6&&g.sixStreak>=3){g.dice=null;g.pendingMove=null;g.sixStreak=0;const n=next(g);g.currentPlayerId=n?.playerId||null;state(g);return;}
  if(!hasMove(g,id,value)){g.pendingMove=null;g.dice=null;if(value!==6)g.sixStreak=0;else g.sixStreak=0;const n=next(g);g.currentPlayerId=n?.playerId||null;state(g);return;}
  g.pendingMove=value;state(g);
}
function move(socket,payload){
  if(!socket.data.ludoV2)return;const g=games.get(code(socket));if(!g||g.status!=="playing")return;const id=pid(socket);if(g.currentPlayerId!==id||g.pendingMove===null)return;
  const token=String(payload?.tokenId||"");if(token==="__skip__"){g.pendingMove=null;g.dice=null;g.sixStreak=0;const n=next(g);g.currentPlayerId=n?.playerId||null;state(g);return;}
  const [color,raw]=token.split(":");const tokenId=Number(raw),rollValue=g.pendingMove;if(!COLORS.includes(color)||!Number.isInteger(tokenId)||tokenId<0||tokenId>3||!own(g,id,color,tokenId)||!legal(g,color,tokenId,rollValue))return;
  const from=pos(g,color,tokenId),target=from===0?1:from+rollValue;g.tokens[color][String(tokenId)].position=target;
  let captured=[];if(target<=51){const global=globalPos(color,target);if(!SAFE.has(global)){const hits=occupants(g,global,color);if(hits.length===1){const v=hits[0];g.tokens[v.color][String(v.id)].position=0;captured=hits;}}}
  g.pendingMove=null;g.dice=null;emit(g,"game-moved",{playerId:id,tokenId,to:target,captured});
  const me=g.players.find(p=>p.playerId===id);const won=me&&me.colors.every(c=>[0,1,2,3].every(n=>pos(g,c,n)===FINISH));
  if(won){g.status="finished";g.winnerId=id;g.currentPlayerId=null;state(g);return;}
  if(rollValue!==6){g.sixStreak=0;const n=next(g);g.currentPlayerId=n?.playerId||null;} state(g);
}
function disconnect(socket){ if(!socket.data.ludoV2)return;const g=games.get(code(socket));if(!g)return;const p=g.players.find(x=>x.playerId===pid(socket));if(p&&p.socket===socket)p.socket=null;if(g.status!=="playing")return;if(g.currentPlayerId!==pid(socket))return;g.status="paused";g.pendingMove=null;g.dice=null;g.reconnectDeadline=Date.now()+RECONNECT_MS;state(g);setTimeout(()=>{if(g.status!=="paused"||Date.now()<g.reconnectDeadline)return;g.status="abandoned";g.currentPlayerId=null;g.winnerId=g.players.find(x=>x.socket?.connected)?.playerId||null;g.reconnectDeadline=null;state(g);},RECONNECT_MS+50);}

if(!Server.prototype.__ludoV2Patched){
  Server.prototype.__ludoV2Patched=true;
  Server.prototype.on=function(event,listener){
    if(event!=="connection")return originalServerOn.call(this,event,listener);
    const wrapped=(socket)=>{
      const originalSocketOn=socket.on.bind(socket);let booting=true;
      socket.on=(name,...args)=>{
        if(booting && ["start-game","game-roll","game-move"].includes(name)){
          const fn=args[0];if(typeof fn!=="function")return socket;
          return originalSocketOn(name,(...eventArgs)=>{if(socket.data.ludoV2)return;return fn(...eventArgs);});
        }
        if(booting&&name==="disconnect"){
          const fn=args[0];if(typeof fn!=="function")return originalSocketOn(name,...args);
          return originalSocketOn(name,(...eventArgs)=>{if(socket.data.ludoV2Started)return;return fn(...eventArgs);});
        }
        return originalSocketOn(name,...args);
      };
      listener(socket);booting=false;socket.on=originalSocketOn.bind(socket);
      originalSocketOn("join-room",payload=>attach(socket,payload));
      originalSocketOn("ready",payload=>ready(socket,payload));
      originalSocketOn("start-game",()=>start(socket));
      originalSocketOn("game-roll",()=>roll(socket));
      originalSocketOn("game-move",payload=>move(socket,payload||{}));
      originalSocketOn("disconnect",()=>disconnect(socket));
    };
    wrapped.__ludoV2Wrapped=true;return originalServerOn.call(this,event,wrapped);
  };
}
