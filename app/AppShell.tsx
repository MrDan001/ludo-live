"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

type Room = { code: string; players: number; roomSize: number; hostName: string };

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState("PlayerOne");
  const [showCreate, setShowCreate] = useState(false);
  const [roomSize, setRoomSize] = useState(4);

  useEffect(() => {
    setPath(window.location.pathname);
    const saved = localStorage.getItem("ludo-player-name");
    if (saved) setName(saved);
  }, []);

  useEffect(() => {
    if (path !== "/") return;
    const s: Socket = io(window.location.origin, { transports: ["websocket", "polling"] });
    s.on("room-list", setRooms);
    s.emit("list-rooms");
    return () => {
      s.disconnect();
    };
  }, [path]);

  if (path && path !== "/") return <>{children}</>;

  const createRoom = () => {
    localStorage.setItem("ludo-player-name", name.trim() || "PlayerOne");
    window.location.href = `/room?action=create&size=${roomSize}`;
  };

  const joinRoom = (code: string, size: number) => {
    localStorage.setItem("ludo-player-name", name.trim() || "PlayerOne");
    window.location.href = `/room?action=join&code=${encodeURIComponent(code)}&size=${size}`;
  };

  return (
    <main className="app-home">
      <header className="home-topbar">
        <div className="player-mini"><div className="avatar">P</div><div><b>{name || "PlayerOne"}</b><span>Level 1 · Online</span></div></div>
        <div className="wallet"><span>🪙 25,680</span><span>💎 320</span></div>
        <a className="icon-btn" href="/profile" aria-label="Profile">⚙️</a>
      </header>
      <section className="hero-card"><div className="hero-copy"><small>LUDO LIVE</small><h1>PLAY. CONNECT. WIN.</h1><p>Real rooms. Real players. One live game.</p></div><div className="hero-dice">🎲</div></section>
      <section className="primary-actions">
        <a href="/rooms" className="action action-green"><strong>🌍 PLAY ONLINE</strong><span>See players waiting for a game</span></a>
        <a href="/friends" className="action action-gold"><strong>👥 PLAY WITH FRIENDS</strong><span>Invite friends into your room</span></a>
        <a href="/missions" className="action action-purple"><strong>🎯 MISSIONS</strong><span>Complete requirements and claim rewards</span></a>
      </section>
      <section className="quick-row"><a href="/missions">🎁<b>Daily Reward</b></a><a href="/shop">🛒<b>Shop</b></a><a href="/events">📅<b>Events</b></a><a href="/spin">🎡<b>Spin Wheel</b></a></section>
      <section className="online-panel"><div className="section-head"><div><b>🟢 PLAYERS WAITING</b><span>{rooms.length ? `${rooms.length} open rooms` : "No open rooms yet"}</span></div><a href="/rooms">VIEW ALL ›</a></div>{rooms.slice(0,3).map(room=><div className="room-line" key={room.code}><div><b>{room.hostName}'s room</b><span>Room {room.code} · {room.players}/{room.roomSize}</span></div><button onClick={()=>joinRoom(room.code,room.roomSize)}>JOIN</button></div>)}{!rooms.length&&<div className="empty-state">Create the first room and other online players will see it here.</div>}</section>
      <section className="create-card"><div><b>CREATE YOUR OWN ROOM</b><span>Choose 2 or 4 players. Your room appears live to everyone.</span></div><button onClick={()=>setShowCreate(true)}>CREATE ROOM</button></section>
      <nav className="bottom-nav"><a className="active" href="/">⌂<span>Home</span></a><a href="/rooms">👥<span>Players</span></a><a href="/chat">💬<span>Chat</span></a><a href="/profile">●<span>Profile</span></a></nav>
      {showCreate&&<div className="modal-backdrop"><div className="modal"><button className="modal-x" onClick={()=>setShowCreate(false)}>×</button><h2>Create Room</h2><label>Your name<input value={name} onChange={e=>setName(e.target.value)} maxLength={24}/></label><div className="size-pick"><button className={roomSize===2?"selected":""} onClick={()=>setRoomSize(2)}>2 Players</button><button className={roomSize===4?"selected":""} onClick={()=>setRoomSize(4)}>4 Players</button></div><button className="modal-primary" onClick={createRoom}>CREATE & WAIT</button></div></div>}
    </main>
  );
}
