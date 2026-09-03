"use client";

import { useEffect, useMemo, useState } from "react";

type Message = { id: string; name: string; text: string; at: number };

type Props = { roomCode: string };

export default function MultiplayerChatOverlay({ roomCode }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("Player");

  const room = useMemo(() => roomCode || "W100NB", [roomCode]);

  useEffect(() => {
    let mounted = true;

    const mergeMessages = (current: Message[], incoming: Message[]) => {
      const all = [...current, ...incoming]
        .filter((message) => message?.text)
        .map((message) => ({
          id: String(message.id || `${message.name}-${message.at}`),
          name: String(message.name || "Player"),
          text: String(message.text),
          at: Number(message.at || Date.now()),
        }))
        .sort((a, b) => a.at - b.at);
      const seen = new Set<string>();
      return all.filter((message) => {
        const key = `${message.name}\u0000${message.text}\u0000${Math.floor(message.at / 5000)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(-100);
    };

    const loadHistory = async () => {
      try {
        const response = await fetch(`/api/multiplayer-chat?roomCode=${encodeURIComponent(room)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!mounted || !Array.isArray(data?.messages)) return;
        setMessages((current) => mergeMessages(current, data.messages));
      } catch {}
    };

    const connect = async () => {
      let id = "";
      let name = "Player";
      try {
        const response = await fetch("/api/auth", { cache: "no-store" });
        const data = await response.json();
        id = String(data?.user?.id || "");
        name = String(data?.user?.username || "Player");
      } catch {}
      if (!mounted) return;
      setPlayerId(id);
      setPlayerName(name);
      setMessages([]);
      void loadHistory();
    };

    void connect();
    const poll = window.setInterval(() => { void loadHistory(); }, 1200);

    return () => {
      mounted = false;
      window.clearInterval(poll);
    };
  }, [room]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onQuickChat = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (typeof value !== "string") return;
      setText(value);
      setOpen(true);
    };
    window.addEventListener("ludo-open-chat", onOpen);
    window.addEventListener("ludo-quick-chat", onQuickChat);
    return () => {
      window.removeEventListener("ludo-open-chat", onOpen);
      window.removeEventListener("ludo-quick-chat", onQuickChat);
    };
  }, []);

  const send = async () => {
    const value = text.trim().slice(0, 240);
    if (!value || !playerId) return;
    try {
      const response = await fetch("/api/multiplayer-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: room, text: value }),
      });
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data?.message) setMessages((items) => {
          const next = data.message as Message;
          const exists = items.some((item) => item.id === next.id);
          return exists ? items : [...items, next].slice(-100);
        });
      }
    } catch {}
    setText("");
  };

  return (
    <section className={`multiplayer-chat-overlay ${open ? "is-open" : ""}`} aria-label="Match chat">
      {open && (
        <div className="multiplayer-chat-panel">
          <header>
            <div>
              <strong>Match Chat</strong>
              <small>{playerName}{playerId ? " · LIVE" : ""}</small>
            </div>
            <button type="button" aria-label="Close chat" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="multiplayer-chat-messages">
            {messages.length === 0 ? (
              <p className="multiplayer-chat-empty">No messages yet.<br />Choose a quick message or type below.</p>
            ) : (
              messages.map((message) => (
                <div key={`${message.id}-${message.at}`} className={`multiplayer-chat-message ${message.name === playerName ? "mine" : ""}`}>
                  <b>{message.name}</b>
                  <span>{message.text}</span>
                </div>
              ))
            )}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void send(); }}>
            <input
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, 240))}
              placeholder="Type a message…"
              aria-label="Chat message"
            />
            <button type="submit" disabled={!text.trim() || !playerId}>Send</button>
          </form>
        </div>
      )}

      <style jsx global>{`
        .multiplayer-chat-overlay { position:fixed; inset:0; z-index:2000; pointer-events:none; font-family:system-ui,-apple-system,sans-serif; }
        .multiplayer-chat-panel { position:absolute; right:18px; top:104px; width:min(360px,calc(100vw - 28px)); height:min(430px,58dvh); display:flex; flex-direction:column; overflow:hidden; pointer-events:auto; border:1px solid rgba(212,175,55,.5); border-radius:20px; background:rgba(9,8,7,.97); box-shadow:0 22px 70px rgba(0,0,0,.72); backdrop-filter:blur(18px); color:#fff; }
        .multiplayer-chat-panel header { display:flex; align-items:center; justify-content:space-between; padding:13px 15px; border-bottom:1px solid rgba(255,255,255,.1); }
        .multiplayer-chat-panel header div { display:flex; flex-direction:column; min-width:0; }
        .multiplayer-chat-panel header strong { font-size:13px; }
        .multiplayer-chat-panel header small { margin-top:2px; color:#888; font-size:9px; }
        .multiplayer-chat-panel header button { border:0; background:transparent; color:#aaa; font-size:25px; cursor:pointer; }
        .multiplayer-chat-messages { flex:1; overflow-y:auto; padding:10px; }
        .multiplayer-chat-empty { margin:70px 10px 0; text-align:center; color:#777; font-size:11px; line-height:1.6; }
        .multiplayer-chat-message { display:flex; flex-direction:column; align-items:flex-start; margin:7px 0; }
        .multiplayer-chat-message.mine { align-items:flex-end; }
        .multiplayer-chat-message b { margin-bottom:3px; color:#d4af37; font-size:8px; }
        .multiplayer-chat-message span { max-width:84%; padding:8px 10px; border-radius:12px 12px 12px 4px; background:#191714; font-size:11px; line-height:1.3; word-break:break-word; }
        .multiplayer-chat-message.mine span { border-radius:12px 12px 4px 12px; background:#70551d; }
        .multiplayer-chat-panel form { display:flex; gap:7px; padding:9px; border-top:1px solid rgba(255,255,255,.1); }
        .multiplayer-chat-panel input { flex:1; min-width:0; border:1px solid rgba(255,255,255,.12); border-radius:11px; outline:0; background:#151310; color:#fff; padding:9px 10px; font-size:11px; }
        .multiplayer-chat-panel form button { border:0; border-radius:11px; background:#d4af37; color:#151007; padding:0 13px; font-size:10px; font-weight:900; cursor:pointer; }
        .multiplayer-chat-panel form button:disabled { opacity:.35; cursor:default; }
        @media(max-width:560px){ .multiplayer-chat-panel { right:8px; top:88px; width:calc(100vw - 16px); height:min(430px,56dvh); border-radius:17px; } }
      `}</style>
    </section>
  );
}
