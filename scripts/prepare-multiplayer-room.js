const fs = require('fs');
const path = require('path');

const serverPath = path.join(process.cwd(), 'server.js');
let source = fs.readFileSync(serverPath, 'utf8');

// This is an idempotent deployment guard for the multiplayer room lifecycle.
// The production server historically contained two room disconnect handlers and
// no explicit leave-room event. Patch the server before npm start launches it.
if (source.includes('socket.on("leave-room",()=>{') && (source.match(/socket\.on\("disconnect"/g) || []).length === 1) {
  process.exit(0);
}

const start = source.indexOf(' socket.on("disconnect",()=>{');
const end = source.indexOf(' socket.on("set-peer-id"', start);
if (start < 0 || end < 0) throw new Error('Multiplayer room lifecycle anchors not found in server.js');

const lifecycle = ` socket.on("leave-room",()=>{const code=socket.data.roomCode,room=rooms.get(code);if(!room)return socket.emit("room-left",{roomCode:code});const member=room.members.get(socket.id);if(!member)return socket.emit("room-left",{roomCode:code});const wasHost=room.hostId===socket.id||room.hostPlayerId===member.playerId;room.members.delete(socket.id);socket.leave(code);socket.data.roomCode=null;clearTimeout(member.reconnectTimer);if(wasHost){const candidates=[...room.members.values()].filter(m=>m.socketId&&m.connected!==false);if(candidates.length===0){clearTimeout(room.hostTimer);rooms.delete(code)}else{const next=candidates[0];for(const m of room.members.values())m.host=false;next.host=true;next.ready=true;room.hostId=next.id;room.hostPlayerId=next.playerId||next.id;room.hostPending=false;room.hostEligible=false;clearTimeout(room.hostTimer)}}if(rooms.has(code))io.to(code).emit("roster",publicMembers(room));broadcastRooms();socket.emit("room-left",{roomCode:code})});
 socket.on("disconnect",()=>{const code=socket.data.roomCode,room=rooms.get(code);if(room){const member=room.members.get(socket.id);if(member){const pid=member.playerId||member.id;const wasHost=room.hostId===socket.id||room.hostPlayerId===pid;member.connected=false;member.socketId=null;member.disconnectedAt=Date.now();if(wasHost){room.hostId=null;room.hostPlayerId=pid;room.hostPending=true;room.hostEligible=false;clearTimeout(room.hostTimer);room.hostTimer=setTimeout(()=>{const current=rooms.get(code);if(current!==room||!current.hostPending)return;const replacement=[...current.members.values()].find(m=>m.connected!==false&&m.socketId);if(replacement){for(const m of current.members.values())m.host=false;replacement.host=true;replacement.ready=true;current.hostId=replacement.id;current.hostPlayerId=replacement.playerId||replacement.id;current.hostPending=false;current.hostEligible=false;io.to(code).emit("host-transferred",{playerId:current.hostPlayerId});io.to(code).emit("roster",publicMembers(current));broadcastRooms()}else{rooms.delete(code);kickRoomMembers(room,"The room closed because no player reconnected.");broadcastRooms()}},30000)}else{clearTimeout(member.reconnectTimer);member.reconnectTimer=setTimeout(()=>{const current=rooms.get(code);if(current===room&&current.members.get(socket.id)===member&&member.connected===false){room.members.delete(socket.id);if(room.members.size===0){clearTimeout(room.hostTimer);rooms.delete(code)}if(rooms.has(code))io.to(code).emit("roster",publicMembers(room));broadcastRooms()}},30000)}io.to(code).emit("roster",publicMembers(room));broadcastRooms()}}const pid=String(socket.data.playerId||'').trim();if(playerSockets.get(pid)===socket)playerSockets.delete(pid);const cc=socket.data.chatRoomCode,cr=chatRooms.get(cc||'');if(cr){const chatMember=cr.members.get(pid);if(chatMember&&chatMember.socketId===socket.id)chatMember.socketId=null;io.to(\`chat:\${cc}\`).emit('chat-room-members',publicChatMembers(cr));broadcastChatRooms()}});
`;

source = source.slice(0, start) + lifecycle + source.slice(end);

// Remove the legacy second room disconnect handler while preserving the closing
// connection/server code. Its chat/profile cleanup is now in the authoritative handler.
const legacyStart = source.lastIndexOf(' socket.on("disconnect",()=>{const code=socket.data.roomCode,r=rooms.get(code);');
if (legacyStart >= end) {
  const legacyEnd = source.indexOf('\n });httpServer.listen', legacyStart);
  if (legacyEnd < 0) throw new Error('Legacy multiplayer disconnect terminator not found');
  source = source.slice(0, legacyStart) + source.slice(legacyEnd);
}

const disconnectCount = (source.match(/socket\.on\("disconnect"/g) || []).length;
if (disconnectCount !== 1) throw new Error(`Expected exactly one room disconnect handler; found ${disconnectCount}`);

fs.writeFileSync(serverPath, source);
console.log('Multiplayer room lifecycle prepared: explicit leave + reconnect grace + single disconnect handler.');
