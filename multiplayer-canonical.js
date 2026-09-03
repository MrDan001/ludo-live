const { Socket } = require("socket.io");
const authority=require("./lib/onlineLudoAuthority"); const { playerColorsForSeats }=require("./lib/ludoRules");
if(!Socket.prototype.__ludoOnlineAuthorityV2){const originalOn=Socket.prototype.on;const games=new Map();const members=new Map();
 const roomCode=s=>String(s?.data?.roomCode||"").trim().toUpperCase(); const playerId=s=>String(s?.data?.playerId||"").trim(); const getRoom=s=>games.get(roomCode(s));
 const ensureRoom=code=>{let room=games.get(code);if(!room){room={code,status:"waiting",members:new Map(),game:null};games.set(code,room);}return room;};
 const stateFor=room=>room?.game?authority.snapshot(room.game):null; const emitState=(socket,room)=>{if(room?.game)socket.nsp.to(room.code).emit("game-state",stateFor(room));};
 const remainingPlayers=(socket,room,pid)=>[...room.members.values()].filter(m=>String(m.playerId)!==String(pid)&&m.socketId&&socket.nsp.sockets.has(m.socketId));
 const forfeitPlayer=async(socket,room,pid)=>{
  if(!room?.game||room.game.status!=="playing")return false;
  const remaining=remainingPlayers(socket,room,pid); if(!remaining.length)return false;
  room.game.players=room.game.players.filter(p=>String(p.playerId)!==String(pid));
  if(String(room.game.currentPlayerId||"")===String(pid))room.game.currentPlayerId=String(remaining[0].playerId);
  room.game.pendingMove=null;room.game.dice=null;room.game.sixStreak=0;room.game.stateRevision++;
  if(remaining.length===1){
   const winner=remaining[0];room.game.status="finished";room.game.winnerId=String(winner.playerId);room.game.currentPlayerId=null;
   emitState(socket,room);
   socket.nsp.to(room.code).emit("game-forfeit-winner",{winnerId:String(winner.playerId),winnerName:String(winner.name||"Player"),reason:"opponent_left",roomCode:room.code});
   try{await globalThis.__ludoMatchFinished?.(room.code,String(winner.playerId));}catch(error){console.error("[multiplayer-forfeit] settlement failed",room.code,error);}
   try{await globalThis.__ludoCreateWinnerNotification?.(room.code,String(winner.playerId),String(winner.name||"Player"));}catch(error){console.error("[multiplayer-forfeit] notification failed",room.code,error);}
  }else{socket.nsp.to(room.code).emit("game-player-left",{playerId:String(pid),remaining:remaining.map(m=>String(m.playerId))});emitState(socket,room);}
  return true;
 };
 globalThis.__ludoForfeitPlayer=forfeitPlayer;
 Socket.prototype.__ludoOnlineAuthorityV2=true;
 Socket.prototype.on=function(event,listener){
  if(event==="join-room")return originalOn.call(this,event,function(payload={}){const code=String(payload.roomCode||"").trim().toUpperCase(),pid=String(payload.playerId||"").trim();if(code&&pid){this.data.roomCode=code;this.data.playerId=pid;this.data.profileName=String(payload.name||"Player");this.data.profileAvatar=String(payload.avatar||"");this.data.profileLevel=Math.max(1,Number(payload.level)||1);this.data.profileCoins=Math.max(0,Number(payload.coins)||0);const room=ensureRoom(code);room.members.set(pid,{playerId:pid,name:this.data.profileName,avatar:this.data.profileAvatar,level:this.data.profileLevel,coins:this.data.profileCoins,socketId:this.id});members.set(pid,{code,socketId:this.id});}const result=listener.apply(this,arguments);const room=games.get(code);if(room?.game)this.emit("game-state",stateFor(room));return result;});
  if(event==="start-game")return originalOn.call(this,event,function(){const result=listener.apply(this,arguments),code=roomCode(this),room=games.get(code);if(!room)return result;const sockets=[...this.nsp.sockets.values()].filter(s=>s.rooms?.has(code));for(const s of sockets){const pid=playerId(s);if(!pid)continue;room.members.set(pid,{playerId:pid,name:String(s.data?.profileName||room.members.get(pid)?.name||"Player"),avatar:String(s.data?.profileAvatar||room.members.get(pid)?.avatar||""),level:Math.max(1,Number(s.data?.profileLevel||room.members.get(pid)?.level)||1),coins:Math.max(0,Number(s.data?.profileCoins??room.members.get(pid)?.coins)||0),socketId:s.id});}const list=[...room.members.values()];if(!list.length)return result;room.game=authority.createGame(list.map((member,seat)=>({...member,seat,colors:playerColorsForSeats(list.length===2?2:4,seat)})));room.status="playing";emitState(this,room);if(typeof globalThis.__ludoMatchStarted==="function")void globalThis.__ludoMatchStarted(room.code,room.roomSize||list.length);return result;});
  if(event==="game-roll")return originalOn.call(this,event,function(){const room=getRoom(this),pid=playerId(this);if(!room?.game)return;const result=authority.roll(room.game,pid);if(!result.ok){this.emit("game-roll-error",{error:result.reason});return;}this.nsp.to(room.code).emit("game-dice",{playerId:pid,value:result.value,stateRevision:result.stateRevision});emitState(this,room);});
  if(event==="game-move")return originalOn.call(this,event,function(payload={}){const room=getRoom(this),pid=playerId(this);if(!room?.game)return;const result=authority.move(room.game,pid,String(payload.tokenId||""));if(!result.ok){this.emit("game-move-error",{error:result.reason});return;}if(result.tokenId)this.nsp.to(room.code).emit("game-moved",{playerId:pid,tokenId:result.tokenId,from:result.from,to:result.target,finalTo:result.finalTo,captureProgress:result.captureProgress,captured:result.captured||null,captureToCenter:Boolean(result.captureToCenter),stateRevision:result.stateRevision});emitState(this,room);if(room.game.status==="finished")void globalThis.__ludoMatchFinished?.(room.code,String(room.game.winnerId||""));});
  if(event==="leave-room")return originalOn.call(this,event,async function(){const code=roomCode(this),pid=playerId(this),room=games.get(code);if(room?.status==="playing"&&pid)await forfeitPlayer(this,room,pid);return listener.apply(this,arguments);});
  if(event==="disconnect")return originalOn.call(this,event,function(){const code=roomCode(this),pid=playerId(this),room=games.get(code);members.delete(pid);if(room&&pid&&room.status==="waiting")room.members.delete(pid);if(room&&room.status==="waiting"&&room.members.size===0)games.delete(code);return listener.apply(this,arguments);});
  return originalOn.call(this,event,listener);
 };
}
module.exports={};
