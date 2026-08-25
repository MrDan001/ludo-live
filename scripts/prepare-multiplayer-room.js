const fs = require('fs');
const path = require('path');

const serverPath = path.join(process.cwd(), 'server.js');
let source = fs.readFileSync(serverPath, 'utf8');

// Deployment guard: the server has historically had duplicate room disconnect
// handlers and no authoritative leave-room event. This patch is idempotent.
const disconnectPattern = /socket\.on\(["']disconnect["']/g;
const leaveMarker = /socket\.on\(["']leave-room["']/;
if (leaveMarker.test(source) && (source.match(disconnectPattern) || []).length === 1) process.exit(0);

const startMatch = /\s*socket\.on\(["']disconnect["']\(\)=>\{/m.exec(source);
if (!startMatch) throw new Error('Multiplayer disconnect handler not found in server.js');
const start = startMatch.index;
const endMatch = /\s*socket\.on\(["']set-peer-id["']/m.exec(source.slice(start));
if (!endMatch) throw new Error('Multiplayer set-peer-id anchor not found in server.js');
const end = start + endMatch.index;

const lifecycle = `\n socket.on("leave-room",()=>{const code=socket.data.roomCode,room=rooms.get(code);if(!room)return socket.emit("room-left",{roomCode:code});const member=room.members.get(socket.id);if(!member)return socket.emit("room-left",{roomCode:code});const wasHost=room.hostId===socket.id||room.hostPlayerId===member.playerId;room.members.delete(socket.id);socket.leave(code);socket.data.roomCode=null;clearTimeout(member.reconnectTimer);if(wasHost){const candidates=[...room.members.values()].filter(m=>m.socketId&&m.connected!==false);if(candidates.length===0){clearTimeout(room.hostTimer);rooms.delete(code)}else{const next=candidates[0];for(const m of room.members.values())m.host=false;next.host=true;next.ready=true;room.hostId=next.id;room.hostPlayerId=next.playerId||next.id;room.hostPending=false;room.hostEligible=false;clearTimeout(room.hostTimer)}}if(rooms.has(code))io.to(code).emit("roster",publicMembers(room));broadcastRooms();socket.emit("room-left",{roomCode:code})});
 socket.on("disconnect",()=>{const code=socket.data.roomCode,room=rooms.get(code);if(room){const member=room.members.get(socket.id);if(member){const pid=member.playerId||member.id;const wasHost=room.hostId===socket.id||room.hostPlayerId===pid;member.connected=false;member.socketId=null;member.disconnectedAt=Date.now();if(wasHost){room.hostId=null;room.hostPlayerId=pid;room.hostPending=true;room.hostEligible=false;clearTimeout(room.hostTimer);room.hostTimer=setTimeout(()=>{const current=rooms.get(code);if(current!==room||!current.hostPending)return;const replacement=[...current.members.values()].find(m=>m.connected!==false&&m.socketId);if(replacement){for(const m of current.members.values())m.host=false;replacement.host=true;replacement.ready=true;current.hostId=replacement.id;current.hostPlayerId=replacement.playerId||replacement.id;current.hostPending=false;current.hostEligible=false;io.to(code).emit("host-transferred",{playerId:current.hostPlayerId});io.to(code).emit("roster",publicMembers(current));broadcastRooms()}else{rooms.delete(code);kickRoomMembers(room,"The room closed because no player reconnected.");broadcastRooms()}},30000)}else{clearTimeout(member.reconnectTimer);member.reconnectTimer=setTimeout(()=>{const current=rooms.get(code);if(current===room&&current.members.get(socket.id)===member&&member.connected===false){room.members.delete(socket.id);if(room.members.size===0){clearTimeout(room.hostTimer);rooms.delete(code)}if(rooms.has(code))io.to(code).emit("roster",publicMembers(room));broadcastRooms()}},30000)}io.to(code).emit("roster",publicMembers(room));broadcastRooms()}}const pid=String(socket.data.playerId||'').trim();if(playerSockets.get(pid)===socket)playerSockets.delete(pid);const cc=socket.data.chatRoomCode,cr=chatRooms.get(cc||'');if(cr){const chatMember=cr.members.get(pid);if(chatMember&&chatMember.socketId===socket.id)chatMember.socketId=null;io.to(\`chat:\${cc}\`).emit('chat-room-members',publicChatMembers(cr));broadcastChatRooms()}});
`;

source = source.slice(0, start) + lifecycle + source.slice(end);

// Remove the legacy second room disconnect handler. Its profile/chat cleanup is
// already included above. The server's final connection close remains intact.
const legacyRegex = /\n\s*socket\.on\(["']disconnect["']\(\)=>\{const code=socket\.data\.roomCode,r=rooms\.get\(code\);[\s\S]*?\n \}\);\n \}\);httpServer\.listen/;
const legacyMatch = legacyRegex.exec(source);
if (legacyMatch) source = source.slice(0, legacyMatch.index) + '\n });httpServer.listen' + source.slice(legacyMatch.index + legacyMatch[0].length);

const disconnectCount = (source.match(disconnectPattern) || []).length;
if (disconnectCount !== 1) throw new Error(`Expected exactly one room disconnect handler; found ${disconnectCount}`);

fs.writeFileSync(serverPath, source);
console.log('Multiplayer room lifecycle prepared: explicit leave + reconnect grace + single disconnect handler.');
