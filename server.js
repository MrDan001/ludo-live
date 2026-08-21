const next = require('next');
const { createServer } = require('http');
const { Server } = require('socket.io');
const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const rooms = new Map();
const chatRooms = new Map();

function publicMembers(room){return [...room.members.values()]}
function publicRooms(){return [...rooms.entries()].map(([code,room])=>({code,players:room.members.size,roomSize:room.roomSize,hostName:room.members.get(room.hostId)?.name||'Host'})).filter(r=>r.players<r.roomSize)}
function publicChatRooms(){return [...chatRooms.entries()].map(([code,room])=>({code,title:room.title,hostName:room.members.get(room.hostId)?.name||'Host',members:room.members.size,maxMembers:20,locked:room.members.size>=20})).filter(r=>r.members<20)}
function broadcastRooms(){io?.emit('room-list',publicRooms())}
function broadcastChatRooms(){io?.emit('chat-room-list',publicChatRooms())}
function chatMember(room,id){return room?.members.get(id)}
let io;

app.prepare().then(()=>{
 const httpServer=createServer((req,res)=>{
  if(req.url==='/health'){res.statusCode=200;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:'ok',rooms:rooms.size,openRooms:publicRooms().length,chatRooms:chatRooms.size,openChatRooms:publicChatRooms().length,connections:io?io.engine.clientsCount:0}));return}
  return handle(req,res);
 });
 io=new Server(httpServer,{cors:{origin:process.env.FRONTEND_URL||'*',methods:['GET','POST']},transports:['polling','websocket']});
 io.on('connection',socket=>{
  socket.on('list-rooms',()=>socket.emit('room-list',publicRooms()));
  socket.on('list-chat-rooms',()=>socket.emit('chat-room-list',publicChatRooms()));

  socket.on('join-room',({roomCode,name,roomSize})=>{
   if(!roomCode||!name)return;
   const code=String(roomCode).trim().toUpperCase();
   let room=rooms.get(code);
   if(!room)room={hostId:socket.id,roomSize:Number(roomSize)||4,members:new Map()};
   if(room.members.size>=room.roomSize&&!room.members.has(socket.id))return socket.emit('room-error','Room is full');
   rooms.set(code,room);socket.join(code);
   room.members.set(socket.id,{id:socket.id,name:String(name).slice(0,24),host:socket.id===room.hostId,ready:socket.id===room.hostId,peerId:null});
   socket.data.roomCode=code;io.to(code).emit('roster',publicMembers(room));broadcastRooms();
  });
  socket.on('set-peer-id',peerId=>{const room=rooms.get(socket.data.roomCode),member=room?.members.get(socket.id);if(!member)return;member.peerId=String(peerId);io.to(socket.data.roomCode).emit('roster',publicMembers(room))});
  socket.on('chat',({text})=>{const code=socket.data.roomCode,room=rooms.get(code),member=room?.members.get(socket.id);if(!member||!text)return;io.to(code).emit('chat',{type:'chat',id:member.id,name:member.name,text:String(text).slice(0,240),at:Date.now()})});
  socket.on('ready',({ready})=>{const room=rooms.get(socket.data.roomCode),member=room?.members.get(socket.id);if(!member)return;member.ready=!!ready;io.to(socket.data.roomCode).emit('roster',publicMembers(room))});
  socket.on('start-game',()=>{const code=socket.data.roomCode,room=rooms.get(code);if(!room||room.hostId!==socket.id)return;const members=publicMembers(room);if(members.length===room.roomSize&&members.every(m=>m.ready))io.to(code).emit('start-game')});
  socket.on('kick-player',targetId=>{const code=socket.data.roomCode,room=rooms.get(code);if(!room||room.hostId!==socket.id||!targetId||targetId===socket.id)return;const target=room.members.get(String(targetId));if(!target)return;room.members.delete(String(targetId));const targetSocket=io.sockets.sockets.get(String(targetId));if(targetSocket){targetSocket.emit('kicked',{roomCode:code,reason:'Removed by the room host'});targetSocket.leave(code);targetSocket.data.roomCode=null}io.to(code).emit('roster',publicMembers(room));broadcastRooms()});

  socket.on('create-chat-room',({title,name})=>{
   const cleanName=String(name||'Player').trim().slice(0,24)||'Player';
   const cleanTitle=String(title||`${cleanName}'s Chat`).trim().slice(0,40)||'Ludo Chat';
   let code;
   do{code=Math.random().toString(36).slice(2,8).toUpperCase()}while(chatRooms.has(code));
   const room={hostId:socket.id,title:cleanTitle,members:new Map(),messages:[]};
   room.members.set(socket.id,{id:socket.id,name:cleanName,host:true});chatRooms.set(code,room);socket.join(`chat:${code}`);socket.data.chatRoomCode=code;
   socket.emit('chat-room-joined',{code,title:cleanTitle,host:true,members:publicMembers(room),messages:room.messages});broadcastChatRooms();
  });
  socket.on('join-chat-room',({roomCode,name})=>{
   const code=String(roomCode||'').trim().toUpperCase(),room=chatRooms.get(code);if(!room)return socket.emit('chat-room-error','Chat room not found');
   if(room.members.size>=20&&!room.members.has(socket.id))return socket.emit('chat-room-error','This chat room is full (20 people).');
   const cleanName=String(name||'Player').trim().slice(0,24)||'Player';room.members.set(socket.id,{id:socket.id,name:cleanName,host:socket.id===room.hostId});socket.join(`chat:${code}`);socket.data.chatRoomCode=code;
   socket.emit('chat-room-joined',{code,title:room.title,host:socket.id===room.hostId,members:publicMembers(room),messages:room.messages});io.to(`chat:${code}`).emit('chat-room-members',publicMembers(room));broadcastChatRooms();
  });
  socket.on('leave-chat-room',()=>{const code=socket.data.chatRoomCode,room=chatRooms.get(code);if(!room)return;room.members.delete(socket.id);socket.leave(`chat:${code}`);socket.data.chatRoomCode=null;if(room.members.size===0)chatRooms.delete(code);else io.to(`chat:${code}`).emit('chat-room-members',publicMembers(room));broadcastChatRooms()});
  socket.on('chat-room-message',({text})=>{const code=socket.data.chatRoomCode,room=chatRooms.get(code),member=chatMember(room,socket.id);if(!member||!text)return;const message={id:socket.id,name:member.name,text:String(text).slice(0,240),at:Date.now()};room.messages.push(message);if(room.messages.length>100)room.messages.shift();io.to(`chat:${code}`).emit('chat-room-message',message)});
  socket.on('kick-chat-member',targetId=>{const code=socket.data.chatRoomCode,room=chatRooms.get(code),member=chatMember(room,socket.id);if(!room||!member?.host||!targetId||targetId===socket.id)return;const target=room.members.get(String(targetId));if(!target)return;room.members.delete(String(targetId));const targetSocket=io.sockets.sockets.get(String(targetId));if(targetSocket){targetSocket.emit('chat-kicked',{roomCode:code,reason:'Removed by the chat room host'});targetSocket.leave(`chat:${code}`);targetSocket.data.chatRoomCode=null}io.to(`chat:${code}`).emit('chat-room-members',publicMembers(room));broadcastChatRooms()});

  socket.on('disconnect',()=>{
   const code=socket.data.roomCode,room=rooms.get(code);if(room){room.members.delete(socket.id);if(room.hostId===socket.id){const nextHost=room.members.values().next().value;if(nextHost){room.hostId=nextHost.id;nextHost.host=true;nextHost.ready=true}}if(room.members.size===0)rooms.delete(code);else io.to(code).emit('roster',publicMembers(room));broadcastRooms()}
   const chatCode=socket.data.chatRoomCode,chatRoom=chatRooms.get(chatCode);if(chatRoom){chatRoom.members.delete(socket.id);if(chatRoom.hostId===socket.id){const nextHost=chatRoom.members.values().next().value;if(nextHost){chatRoom.hostId=nextHost.id;nextHost.host=true}}if(chatRoom.members.size===0)chatRooms.delete(chatCode);else io.to(`chat:${chatCode}`).emit('chat-room-members',publicMembers(chatRoom));broadcastChatRooms()}
  });
 });
 httpServer.listen(port,hostname,()=>console.log(`Ludo Live realtime server listening on ${hostname}:${port}`));
});
