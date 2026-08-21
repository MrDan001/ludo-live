"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";

type CR = { code: string; title: string; hostName: string; members: number; maxMembers: number; locked: boolean; ownerId: string };
type Member = { id: string; name: string; role: "owner" | "member"; owner: boolean; online: boolean };
type Msg = { id?: string; name: string; text: string; at: number };
type MyRoom = { code: string; title: string; members: Member[]; messages: Msg[] };

function getPlayerId() {
  let id = localStorage.getItem("ludo-player-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ludo-player-id", id);
  }
  return id;
}

export default function Chat() {
  const [rooms, setRooms] = useState<CR[]>([]);
  const [myRoom, setMyRoom] = useState<MyRoom | null>(null);
  const [name, setName] = useState("PlayerOne");
  const [title, setTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [room, setRoom] = useState<MyRoom | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [text, setText] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [error, setError] = useState("");

  const playerId = useMemo(() => (typeof window !== "undefined" ? getPlayerId() : ""), []);

  useEffect(() => {
    const savedName = localStorage.getItem("ludo-player-name");
    if (savedName) setName(savedName);

    const nextSocket = io(window.location.origin, {
      transports: ["websocket", "polling"],
    });

    nextSocket.on("chat-room-list", setRooms);
    nextSocket.on("chat-my-room", (nextRoom: MyRoom | null) => setMyRoom(nextRoom));
    nextSocket.on("chat-room-joined", (data) => {
      const joined: MyRoom = {
        code: data.code,
        title: data.title,
        members: data.members || [],
        messages: data.messages || [],
      };
      setRoom(joined);
      setMyRoom(joined);
      setMembers(joined.members);
      setMessages(joined.messages);
      setError("");
    });
    nextSocket.on("chat-room-members", (nextMembers: Member[]) => {
      setMembers(nextMembers);
      setMyRoom((previous) => (previous ? { ...previous, members: nextMembers } : previous));
      setRoom((previous) => (previous ? { ...previous, members: nextMembers } : previous));
    });
    nextSocket.on("chat-room-message", (message: Msg) => {
      setMessages((previous) => [...previous, message]);
    });
    nextSocket.on("chat-kicked", (data) => {
      window.alert(data.reason || "The room owner removed you.");
      setRoom(null);
      setMessages([]);
      setMembers([]);
      nextSocket.emit("list-chat-rooms", { playerId });
    });
    nextSocket.on("chat-room-error", (message) => setError(String(message || "Something went wrong.")));

    nextSocket.emit("list-chat-rooms", { playerId });
    setSocket(nextSocket);

    return () => nextSocket.disconnect();
  }, [playerId]);

  const create = () => {
    if (!socket) return;
    setError("");
    socket.emit("create-chat-room", {
      title: title || `${name}'s Chat`,
      name,
      playerId,
    });
    setShowCreate(false);
  };

  const join = (code: string) => {
    if (!socket) return;
    setError("");
    socket.emit("join-chat-room", { roomCode: code, name, playerId });
  };

  const openMyRoom = () => {
    if (myRoom) join(myRoom.code);
  };

  const send = () => {
    if (!text.trim() || !socket || !room) return;
    socket.emit("chat-room-message", { text });
    setText("");
  };

  const kick = (memberId: string) => {
    const currentMember = members.find((member) => member.id === playerId);
    if (socket && room && currentMember?.role === "owner") {
      socket.emit("kick-chat-member", memberId);
    }
  };

  const leaveRoomView = () => {
    setRoom(null);
    setMessages([]);
    setMembers([]);
  };

  if (room) {
    const currentMember = members.find((member) => member.id === playerId);
    return (
      <main className="subpage">
        <header className="sub-head">
          <button onClick={leaveRoomView} aria-label="Back">‹</button>
          <div>
            <small>{currentMember?.role === "owner" ? "OWNER / ADMIN" : "MEMBER"}</small>
            <h1>{room.title}</h1>
          </div>
          <span>{members.length}/20</span>
        </header>
        <section className="chat-room-live">
          <div className="member-strip">
            {members.map((member) => (
              <span key={member.id}>
                {member.name} {member.role === "owner" ? "👑" : ""}
                {member.id !== playerId && currentMember?.role === "owner" ? (
                  <button onClick={() => kick(member.id)} style={{ marginLeft: 6 }}>
                    Remove
                  </button>
                ) : null}
              </span>
            ))}
          </div>
          <div className="chat-history">
            {messages.map((message, index) => (
              <div className="bubble" key={message.id || index}>
                <b>{message.name}</b>
                <p>{message.text}</p>
                <small>
                  {new Date(message.at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </div>
            ))}
          </div>
          <div className="chat-compose">
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") send();
              }}
              placeholder="Type a message…"
            />
            <button onClick={() => setText((value) => `${value} ❤️`)}>❤️</button>
            <button onClick={send}>➤</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="subpage">
      <header className="sub-head">
        <button onClick={() => window.history.back()} aria-label="Back">‹</button>
        <div>
          <small>WORLD CHAT</small>
          <h1>Chat Rooms</h1>
        </div>
        <span>💬</span>
      </header>

      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <button className={tab === "all" ? "big-primary" : ""} onClick={() => setTab("all")}>
          ALL ROOMS
        </button>
        <button className={tab === "mine" ? "big-primary" : ""} onClick={() => setTab("mine")}>
          MY ROOM
        </button>
      </div>

      {error ? (
        <div className="empty-big">
          <b>{error}</b>
        </div>
      ) : null}

      {tab === "mine" ? (
        <section className="room-browser chat-browser">
          {myRoom ? (
            <article className="browser-room">
              <div className="room-avatar">👑</div>
              <div className="room-info">
                <b>{myRoom.title}</b>
                <span>
                  Owner: {myRoom.members.find((member) => member.role === "owner")?.name || name} · {myRoom.members.length}/20 · {myRoom.code}
                </span>
              </div>
              <button onClick={openMyRoom}>OPEN MY ROOM</button>
            </article>
          ) : (
            <div className="empty-big">
              <div>👑</div>
              <h2>You don't have a room</h2>
              <p>Create a room to get your private My Room tab.</p>
              <button className="big-primary" onClick={() => setShowCreate(true)}>
                ＋ CREATE CHAT ROOM
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          <p className="sub-intro">All live rooms created by you and other players. You can belong to only one room at a time.</p>
          <button className="big-primary" onClick={() => setShowCreate(true)}>
            ＋ CREATE CHAT ROOM
          </button>
          <section className="room-browser chat-browser">
            {rooms.map((chatRoom) => {
              const isMember = myRoom?.code === chatRoom.code;
              return (
                <article className="browser-room" key={chatRoom.code}>
                  <div className="room-avatar">{isMember ? "👑" : "💬"}</div>
                  <div className="room-info">
                    <b>{chatRoom.title}</b>
                    <span>
                      {chatRoom.hostName} · {chatRoom.members}/20 · {chatRoom.code}
                      {isMember ? " · YOU ARE A MEMBER" : ""}
                    </span>
                  </div>
                  <button disabled={chatRoom.members >= 20 && !isMember} onClick={() => join(chatRoom.code)}>
                    {isMember ? "ENTER" : "JOIN"}
                  </button>
                </article>
              );
            })}
            {!rooms.length ? (
              <div className="empty-big">
                <div>💬</div>
                <h2>No chat rooms yet</h2>
                <p>Create the first room and it will appear here for everyone.</p>
              </div>
            ) : null}
          </section>
        </>
      )}

      {showCreate ? (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-x" onClick={() => setShowCreate(false)}>×</button>
            <h2>Create Chat Room</h2>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Room name" />
            <button className="modal-primary" onClick={create}>CREATE ROOM</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
