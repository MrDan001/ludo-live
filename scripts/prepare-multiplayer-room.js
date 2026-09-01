const fs = require('fs');
const path = require('path');

const serverPath = path.join(process.cwd(), 'server.js');
let source = fs.readFileSync(serverPath, 'utf8');

// IMPORTANT: count Socket.IO disconnect HANDLERS, not every occurrence of the
// word "disconnect". The server also legitimately contains socket.disconnect()
// calls, which are not room lifecycle handlers.
const handlerPositions = () => {
  const out = [];
  const re = /socket\.on\s*\(\s*["']disconnect["']\s*,/g;
  let match;
  while ((match = re.exec(source)) !== null) out.push(match.index);
  return out;
};

const hasCanonicalLifecycle =
  source.includes('member.connected=false') &&
  source.includes('host-transferred') &&
  source.includes('30000');
let positions = handlerPositions();
if (hasCanonicalLifecycle && positions.length === 1) {
  console.log('Multiplayer room lifecycle already prepared successfully.');
  process.exit(0);
}
if (positions.length === 0) throw new Error('No Socket.IO disconnect handler found in server.js');

// Replace the first room disconnect handler with the canonical lifecycle. The
// following Socket.IO handler is used as the deterministic boundary because the
// legacy server is intentionally minified.
const firstStart = positions[0];
const nextSocketHandler = source.indexOf('socket.on', positions[0] + 10);
if (nextSocketHandler < 0) throw new Error('Could not locate the handler after disconnect');

const lifecycle = `socket.on("leave-room",()=>{const code=socket.data.roomCode,room=rooms.get(code);if(!room)return socket.emit("room-left",{roomCode:code});const member=room.members.get(socket.id);if(!member)return socket.emit("room-left",{roomCode:code});const wasHost=room.hostId===socket.id||room.hostPlayerId===member.playerId;room.members.delete(socket.id);socket.leave(code);socket.data.roomCode=null;clearTimeout(member.reconnectTimer);if(wasHost){const candidates=[...room.members.values()].filter(m=>m.socketId&&m.connected!==false);if(candidates.length===0){clearTimeout(room.hostTimer);rooms.delete(code)}else{const next=candidates[0];for(const m of room.members.values())m.host=false;next.host=true;next.ready=true;room.hostId=next.id;room.hostPlayerId=next.playerId||next.id;room.hostPending=false;room.hostEligible=false;clearTimeout(room.hostTimer)}}if(rooms.has(code))io.to(code).emit("roster",publicMembers(room));broadcastRooms();socket.emit("room-left",{roomCode:code})});
 socket.on("disconnect",()=>{const code=socket.data.roomCode,room=rooms.get(code);if(room){const member=room.members.get(socket.id);if(member){const pid=member.playerId||member.id;const wasHost=room.hostId===socket.id||room.hostPlayerId===pid;member.connected=false;member.socketId=null;member.disconnectedAt=Date.now();if(wasHost){room.hostId=null;room.hostPlayerId=pid;room.hostPending=true;room.hostEligible=false;clearTimeout(room.hostTimer);room.hostTimer=setTimeout(()=>{const current=rooms.get(code);if(current!==room||!current.hostPending)return;const replacement=[...current.members.values()].find(m=>m.connected!==false&&m.socketId);if(replacement){for(const m of current.members.values())m.host=false;replacement.host=true;replacement.ready=true;current.hostId=replacement.id;current.hostPlayerId=replacement.playerId||replacement.id;current.hostPending=false;current.hostEligible=false;io.to(code).emit("host-transferred",{playerId:current.hostPlayerId});io.to(code).emit("roster",publicMembers(current));broadcastRooms()}else{rooms.delete(code);kickRoomMembers(room,"The room closed because no player reconnected.");broadcastRooms()}},30000)}else{clearTimeout(member.reconnectTimer);member.reconnectTimer=setTimeout(()=>{const current=rooms.get(code);if(current===room&&current.members.get(socket.id)===member&&member.connected===false){room.members.delete(socket.id);if(room.members.size===0){clearTimeout(room.hostTimer);rooms.delete(code)}if(rooms.has(code))io.to(code).emit("roster",publicMembers(room));broadcastRooms()}},30000)}io.to(code).emit("roster",publicMembers(room));broadcastRooms()}}const pid=String(socket.data.playerId||'').trim();if(playerSockets.get(pid)===socket)playerSockets.delete(pid);const cc=socket.data.chatRoomCode,cr=chatRooms.get(cc||'');if(cr){const chatMember=cr.members.get(pid);if(chatMember&&chatMember.socketId===socket.id)chatMember.socketId=null;io.to(\`chat:\${cc}\`).emit('chat-room-members',publicChatMembers(cr));broadcastChatRooms()}});`;

source = source.slice(0, firstStart) + lifecycle + source.slice(nextSocketHandler);

// Remove any remaining legacy room disconnect handler. Use the actual handler
// signature, never a generic "disconnect" substring.
positions = handlerPositions();
if (positions.length > 1) {
  const legacyStart = positions[positions.length - 1];
  const legacyEnd = source.indexOf('\n });httpServer.listen', legacyStart);
  if (legacyEnd < 0) throw new Error('Could not remove legacy disconnect handler');
  source = source.slice(0, legacyStart) + source.slice(legacyEnd);
}

positions = handlerPositions();
if (positions.length !== 1) throw new Error(`Expected one Socket.IO disconnect handler after repair; found ${positions.length}`);
if (!source.includes('socket.on("leave-room"')) throw new Error('Expected explicit leave-room handler after repair');

fs.writeFileSync(serverPath, source);
console.log('Multiplayer room lifecycle prepared successfully.');
