const { Server } = require("socket.io");
const originalServerOn = Server.prototype.on;
const games = new Map();
const COLORS = ["red", "yellow", "green", "blue"];
// These are the canonical Tournament start indices on the 52-cell shared path.
const START_INDEX = { green: 0, yellow: 13, blue: 26, red: 39 };
const TRACK_LENGTH = 51;
const HOME_START = 52;
const FINISH = 57;
const RECONNECT_MS = 30000;
const MAIN_PATH = [
  ...Array.from({length:5},(_,i)=>[6,i+1]), ...Array.from({length:6},(_,i)=>[5-i,6]), [0,7],[0,8],
  ...Array.from({length:5},(_,i)=>[i+1,8]), ...Array.from({length:6},(_,i)=>[6,i+9]), [7,14],[8,14],
  ...Array.from({length:5},(_,i)=>[8,13-i]), ...Array.from({length:6},(_,i)=>[9+i,8]), [14,7],[14,6],
  ...Array.from({length:5},(_,i)=>[13-i,6]), ...Array.from({length:6},(_,i)=>[8,5-i]), [7,0],[6,0]
];
const SAFE_CELLS = [[6,1],[1,8],[13,6],[8,13]];
const same=(a,b)=>!!a&&!!b&&a[0]===b[0]&&a[1]===b[1];
const pid=s=>String(s.data.playerId||"").trim();
const code=s=>String(s.data.roomCode||"").trim().toUpperCase();
const colors=seat=>seat===0?["red","yellow"]:["green","blue"];
function tokenCell(c,p){if(p<1||p>TRACK_LENGTH)return null;return MAIN_PATH[(START_INDEX[c]+p-1)%52]||null}
function homeCell(c,p){const lanes={green:[[7,1],[7,2],[7,3],[7,4],[7,5]],yellow:[[1,7],[2,7],[3,7],[4,7],[5,7]],red:[[13,7],[12,7],[11,7],[10,7],[9,7]],blue:[[7,13],[7,12],[7,11],[7,10],[7,9]]};const i=p-HOME_START;return i>=0&&i<5?lanes[c][i]:null}
function cell(c,p){return p>=1&&p<=TRACK_LENGTH?tokenCell(c,p):p>=HOME_START&&p<FINISH?homeCell(c,p):null}
function safe(c,p){const x=cell(c,p);return SAFE_CELLS.some(s=>same(s,x))}
// Position 0 is yard. A roll of 6 places the token directly on its colour's
// canonical starting square. The first normal die after that advances from it.
function nextProgress(position,dice){if(position===0)return dice===6?1:null;const n=position+dice;return n<=FINISH?n:null}
function tokens(){return Object.fromEntries(COLORS.map(c=>[c,Object.fromEntries([0,1,2,3].map(id=>[String(id),{position:0}]))]))}
function player(g,c){return g.players.find(p=>p.colors.includes(c))}
function pos(g,c,id){return Number(g.tokens[c]?.[String(id)]?.position||0)}
function own(g,p,c,id){const x=player(g,c);return !!x&&x.playerId===p&&!!g.tokens[c]?.[String(id)]}
function occupants(g,c,target){const tc=cell(c,target);if(!tc)return [];const out=[];for(const oc of COLORS){if(oc===c)continue;for(let id=0;id<4;id++){const p=pos(g,oc,id);if(p>0&&p<FINISH&&same(cell(oc,p),tc))out.push({color:oc,id})}}return out}
function legal(g,c,id,dice){const from=pos(g,c,id);if(from>=FINISH)return false;const target=nextProgress(from,dice);if(target===null)return false;if(target===FINISH)return true;const hits=occupants(g,c,target);return hits.length<2}
function hasMove(g,p,dice){const x=g.players.find(v=>v.playerId===p);return !!x&&x.colors.some(c=>[0,1,2,3].some(id=>legal(g,c,id,dice)))}
function snapshot(g){return {status:g.status,stateRevision:g.stateRevision,dice:g.dice,pendingMove:g.pendingMove,sixStreak:g.sixStreak,currentPlayerId:g.currentPlayerId,players:g.players.map(p=>({playerId:p.playerId,name:p.name,seat:p.seat,connected:!!p.socket,colors:p.colors,ready:p.ready})),tokens:g.tokens,winnerId:g.winnerId||null,reconnectDeadline:g.reconnectDeadline||null}}
function emit(g,e,p){for(const x of g.players)if(x.socket?.connected)x.socket.emit(e,p)}
function state(g){g.stateRevision=(g.stateRevision||0)+1;emit(g,"game-state",snapshot(g))}
function next(g){const i=g.players.findIndex(p=>p.playerId===g.currentPlayerId);if(i<0)return null;for(let n=1;n<=g.players.length;n++){const p=g.players[(i+n)%g.players.length];if(p.socket?.connected)return p}return null}
function init(g){g.status="playing";g.currentPlayerId=g.players[0]?.playerId||null;g.dice=null;g.pendingMove=null;g.sixStreak=0;g.winnerId=null;g.reconnectDeadline=null;g.tokens=tokens();g.stateRevision=0}
function attach(s,payload){const room=String(payload?.roomCode||"").trim().toUpperCase(),pId=String(payload?.playerId||"").trim();if(!room||!pId||Number(payload?.roomSize)!==2)return;s.data.ludoV2=true;s.data.roomCode=room;s.data.playerId=pId;let g=games.get(room);if(!g)g={code:room,players:[],status:"waiting",currentPlayerId:null,dice:null,pendingMove:null,sixStreak:0,tokens:tokens(),winnerId:null,reconnectDeadline:null,stateRevision:0};let p=g.players.find(x=>x.playerId===pId);if(!p){if(g.players.length>=2)return;const seat=g.players.length;p={playerId:pId,name:String(payload?.name||"Player").slice(0,24),seat,colors:colors(seat),socket:s,ready:seat===0};g.players.push(p)}else{p.socket=s;p.name=String(payload?.name||p.name||"Player").slice(0,24);if(g.status==="paused"&&g.currentPlayerId===pId){g.status="playing";g.reconnectDeadline=null}}games.set(room,g);s.emit("game-state",snapshot(g));if(g.status==="playing")state(g)}
function ready(s,p){if(!s.data.ludoV2)return;const g=games.get(code(s));const x=g?.players.find(v=>v.playerId===pid(s));if(x)x.ready=!!p?.ready}
function start(s){if(!s.data.ludoV2)return;const g=games.get(code(s));if(!g||g.status==="playing")return;if(g.players[0]?.playerId!==pid(s)||g.players.length!==2||!g.players.every(p=>p.ready&&p.socket?.connected))return;init(g);for(const p of g.players){p.socket.data.ludoV2Started=true;p.socket.emit("start-game",{roomCode:g.code})}state(g)}
function roll(s){if(!s.data.ludoV2)return;const g=games.get(code(s));if(!g||g.status!=="playing")return;const id=pid(s);if(g.currentPlayerId!==id||g.pendingMove!==null)return;const value=1+Math.floor(Math.random()*6);g.dice=value;g.sixStreak=value===6?g.sixStreak+1:0;emit(g,"game-dice",{playerId:id,value,stateRevision:(g.stateRevision||0)+1});if(value===6&&g.sixStreak>=3){g.pendingMove=null;g.sixStreak=0;const n=next(g);g.currentPlayerId=n?.playerId||null;state(g);return}if(!hasMove(g,id,value)){g.pendingMove=null;g.sixStreak=0;const n=next(g);g.currentPlayerId=n?.playerId||null;state(g);return}g.pendingMove=value;state(g)}
function move(s,payload){if(!s.data.ludoV2)return;const g=games.get(code(s));if(!g||g.status!=="playing")return;const id=pid(s);if(g.currentPlayerId!==id||g.pendingMove===null)return;const token=String(payload?.tokenId||"");const [color,raw]=token.split(":");const tokenId=Number(raw),r=g.pendingMove;if(!COLORS.includes(color)||!Number.isInteger(tokenId)||tokenId<0||tokenId>3||!own(g,id,color,tokenId)||!legal(g,color,tokenId,r))return;const from=pos(g,color,tokenId),target=nextProgress(from,r);g.tokens[color][String(tokenId)].position=target;let captured=[];if(target!==FINISH&&!safe(color,target)){const hits=occupants(g,color,target);if(hits.length===1){const v=hits[0];g.tokens[v.color][String(v.id)].position=0;captured=hits}}g.pendingMove=null;emit(g,"game-moved",{playerId:id,tokenId,to:target,captured});const me=g.players.find(p=>p.playerId===id);const won=me&&me.colors.every(c=>[0,1,2,3].every(n=>pos(g,c,n)>=FINISH));if(won){g.status="finished";g.winnerId=id;g.currentPlayerId=null;state(g);return}if(r!==6){g.sixStreak=0;const n=next(g);g.currentPlayerId=n?.playerId||null}state(g)}
function disconnect(s){if(!s.data.ludoV2)return;const g=games.get(code(s));if(!g)return;const p=g.players.find(x=>x.playerId===pid(s));if(p&&p.socket===s)p.socket=null;if(g.status!=="playing"||g.currentPlayerId!==pid(s))return;g.status="paused";g.pendingMove=null;g.reconnectDeadline=Date.now()+RECONNECT_MS;state(g)}
if(!Server.prototype.__ludoV2Patched){Server.prototype.__ludoV2Patched=true;Server.prototype.on=function(event,listener){if(event!=="connection")return originalServerOn.call(this,event,listener);const wrapped=s=>{const original=s.on.bind(s);let boot=true;s.on=(name,...args)=>{if(boot&&["start-game","game-roll","game-move"].includes(name)){const fn=args[0];return original(name,(...a)=>{if(s.data.ludoV2)return;return fn(...a)})}if(boot&&name==="disconnect"){const fn=args[0];return original(name,(...a)=>{if(s.data.ludoV2Started)return;return fn(...a)})}return original(name,...args)};listener(s);boot=false;s.on=original;original("join-room",p=>attach(s,p));original("ready",p=>ready(s,p));original("start-game",()=>start(s));original("game-roll",()=>roll(s));original("game-move",p=>move(s,p||{}));original("disconnect",()=>disconnect(s))};return originalServerOn.call(this,event,wrapped)}}