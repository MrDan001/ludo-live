"use client";

import { useEffect, useRef, useState } from "react";

type Member = { id: string; playerId?: string; name: string; role?: string; online?: boolean };

declare global { interface Window { Peer?: any } }

const loadPeer = () => new Promise<any>((resolve, reject) => {
  if (window.Peer) return resolve(window.Peer);
  const script = document.createElement("script");
  script.src = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
  script.onload = () => resolve(window.Peer);
  script.onerror = reject;
  document.head.appendChild(script);
});

const safe = (value: string) => String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);

export default function ChatVoice({ roomCode, playerId, members }: { roomCode: string; playerId: string; members: Member[] }) {
  const peerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const connections = useRef<Record<string, any>>({});
  const peerPlayers = useRef<Record<string, string>>({});
  const peerNames = useRef<Record<string, string>>({});
  const pendingCalls = useRef<Record<string, any>>({});
  const activityTimer = useRef<number | null>(null);
  const selfPeer = useRef("");

  const [ready, setReady] = useState(false);
  const [mic, setMic] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [mutedPlayers, setMutedPlayers] = useState<Record<string, boolean>>({});
  const [volumes, setVolumes] = useState<Record<string, number>>({});

  const selfPeerId = `ludo-chat-${safe(roomCode)}-${safe(playerId)}`;

  const setAvatarSpeaking = (pid: string, on: boolean) => {
    const name = peerNames.current[pid] || members.find((m) => String(m.playerId) === String(pid))?.name;
    if (!name) return;
    document.querySelectorAll<HTMLElement>(".ig-avatar").forEach((el) => {
      if (el.getAttribute("aria-label") === name) el.classList.toggle("voice-speaking", on);
    });
  };

  const broadcastSpeaking = (on: boolean) => {
    Object.values(connections.current).forEach((connection: any) => {
      const data = connection?.data;
      if (data?.open) {
        try { data.send({ type: "speaking", playerId: String(playerId), speaking: on }); } catch {}
      }
    });
  };

  const applyAudioSettings = (peerId: string) => {
    const audio = document.getElementById(`chat-remote-${peerId}`) as HTMLAudioElement | null;
    if (!audio) return;
    audio.muted = !!mutedPlayers[peerId];
    audio.volume = Math.max(0, Math.min(1, (volumes[peerId] ?? 100) / 100));
  };

  const playRemote = (peerId: string, stream: MediaStream) => {
    let audio = document.getElementById(`chat-remote-${peerId}`) as HTMLAudioElement | null;
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = `chat-remote-${peerId}`;
      audio.autoplay = true;
      audio.setAttribute("playsinline", "true");
      audio.setAttribute("aria-label", `Voice from ${peerNames.current[peerId] || "player"}`);
      audio.style.display = "none";
      document.body.appendChild(audio);
    }
    audio.srcObject = stream;
    applyAudioSettings(peerId);
    void audio.play().catch(() => setNotice("Tap Voice once to enable voice audio on this device."));
  };

  const removePeer = (id: string) => {
    document.getElementById(`chat-remote-${id}`)?.remove();
    setAvatarSpeaking(peerPlayers.current[id] || id, false);
    delete connections.current[id];
    delete peerNames.current[id];
    delete peerPlayers.current[id];
  };

  const callPeer = (id: string) => {
    if (!streamRef.current || !peerRef.current || id === selfPeer.current || connections.current[id]?.voiceCall) return;
    try {
      const call = peerRef.current.call(id, streamRef.current);
      if (!call) return;
      connections.current[id] = { ...(connections.current[id] || {}), voiceCall: call };
      call.on("stream", (stream: MediaStream) => playRemote(id, stream));
      call.on("close", () => document.getElementById(`chat-remote-${id}`)?.remove());
      call.on("error", () => {});
    } catch {}
  };

  const connectPeer = (id: string, name: string, pid: string) => {
    if (!id || id === selfPeer.current || !peerRef.current) return;
    peerNames.current[id] = name || "Player";
    peerPlayers.current[id] = pid || "";
    if (connections.current[id]?.data?.open || connections.current[id]?.connecting) return;
    try {
      const connection = peerRef.current.connect(id, { reliable: true });
      connections.current[id] = { ...(connections.current[id] || {}), data: connection, connecting: true };
      connection.on("open", () => {
        connections.current[id] = { ...(connections.current[id] || {}), data: connection, connecting: false };
        if (streamRef.current) callPeer(id);
      });
      connection.on("data", (message: any) => {
        if (message?.type === "speaking") setAvatarSpeaking(String(message.playerId), !!message.speaking);
      });
      connection.on("close", () => removePeer(id));
      connection.on("error", () => {});
    } catch {}
  };

  useEffect(() => {
    members.forEach((member) => {
      const pid = String(member.playerId || "");
      if (pid && pid !== String(playerId)) {
        connectPeer(`ludo-chat-${safe(roomCode)}-${safe(pid)}`, member.name || "Player", pid);
      }
    });
  }, [members, ready, roomCode, playerId]);

  useEffect(() => {
    let dead = false;
    const start = async () => {
      try {
        const PeerClass = await loadPeer();
        if (dead) return;
        const peer = new PeerClass(selfPeerId);
        peerRef.current = peer;
        selfPeer.current = selfPeerId;
        peer.on("open", () => {
          if (dead) return;
          setReady(true);
          setNotice("");
        });
        peer.on("call", (call: any) => {
          const prefix = `ludo-chat-${safe(roomCode)}-`;
          const pid = call.peer.startsWith(prefix) ? call.peer.slice(prefix.length) : call.peer;
          const member = members.find((m) => safe(String(m.playerId)) === safe(pid));
          if (member) {
            peerNames.current[call.peer] = member.name || "Player";
            peerPlayers.current[call.peer] = String(member.playerId || "");
          }
          pendingCalls.current[call.peer] = call;
          try { call.answer(streamRef.current || undefined); } catch {}
          call.on("stream", (stream: MediaStream) => {
            delete pendingCalls.current[call.peer];
            playRemote(call.peer, stream);
          });
          call.on("close", () => {
            delete pendingCalls.current[call.peer];
            removePeer(call.peer);
          });
          call.on("error", () => {});
        });
        peer.on("error", (error: any) => {
          console.warn("ludo voice peer", error);
          if (!dead) setNotice(error?.type === "unavailable-id" ? "Voice is reconnecting…" : "Voice connection is unavailable. Try Voice again.");
        });
        peer.on("disconnected", () => {
          if (dead) return;
          setNotice("Voice reconnecting…");
          try { peer.reconnect(); } catch {}
        });
      } catch (error) {
        console.warn("voice init", error);
        if (!dead) setNotice("Voice chat could not start.");
      }
    };
    void start();
    return () => {
      dead = true;
      setReady(false);
      if (activityTimer.current !== null) window.clearInterval(activityTimer.current);
      activityTimer.current = null;
      broadcastSpeaking(false);
      Object.values(connections.current).forEach((connection: any) => {
        try { connection.data?.close?.(); connection.voiceCall?.close?.(); } catch {}
      });
      connections.current = {};
      pendingCalls.current = {};
      if (peerRef.current) { try { peerRef.current.destroy(); } catch {} }
      peerRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      document.querySelectorAll("audio[id^='chat-remote-']").forEach((audio) => audio.remove());
      document.querySelectorAll(".ig-avatar.voice-speaking").forEach((el) => el.classList.remove("voice-speaking"));
    };
  }, [roomCode, playerId, selfPeerId]);

  useEffect(() => {
    Object.keys({ ...mutedPlayers, ...volumes }).forEach(applyAudioSettings);
  }, [mutedPlayers, volumes]);

  const toggleMic = async () => {
    if (mic) {
      if (activityTimer.current !== null) window.clearInterval(activityTimer.current);
      activityTimer.current = null;
      setSpeaking(false);
      setAvatarSpeaking(String(playerId), false);
      broadcastSpeaking(false);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setMic(false);
      return;
    }
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setNotice("Microphone requires a secure HTTPS connection.");
        return;
      }
      if (!peerRef.current || !ready) {
        setNotice("Voice is still connecting. Try again in a moment.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      setMic(true);
      setNotice("");
      members.forEach((member) => {
        const pid = String(member.playerId || "");
        if (pid && pid !== String(playerId)) callPeer(`ludo-chat-${safe(roomCode)}-${safe(pid)}`);
      });
      Object.keys(pendingCalls.current).forEach((id) => { try { pendingCalls.current[id].answer(stream); } catch {} });

      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let lastSpeaking = false;
      activityTimer.current = window.setInterval(() => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
          const value = (data[i] - 128) / 128;
          sum += value * value;
        }
        const active = Math.sqrt(sum / data.length) > 0.055;
        if (active !== lastSpeaking) {
          lastSpeaking = active;
          setSpeaking(active);
          setAvatarSpeaking(String(playerId), active);
          broadcastSpeaking(active);
        }
      }, 80);
    } catch (error) {
      console.warn("microphone", error);
      setNotice("Microphone permission was not granted. Allow microphone access in browser settings.");
    }
  };

  const voiceMembers = members.filter((member) => member.playerId && String(member.playerId) !== String(playerId));

  return (
    <div className="voice-control">
      <button type="button" onClick={() => setPanelOpen((value) => !value)} aria-expanded={panelOpen} disabled={!ready} className={`voice-button ${mic ? "active" : ""} ${!ready ? "connecting" : ""}`} title="Voice controls">
        <span className="voice-icon">{mic ? "🎙️" : "🎤"}</span>
        <span className="voice-label">{!ready ? "Connecting" : mic ? "Mic On" : "Voice"}</span>
        <span className={`voice-meter ${speaking ? "live" : ""}`} aria-hidden="true"><i /><i /><i /></span>
      </button>
      {notice && <span className="voice-notice" role="status">{notice}</span>}
      {panelOpen && (
        <div className="voice-popover" onClick={(event) => event.stopPropagation()}>
          <div className="voice-pop-head"><div><strong>🎙️ Voice</strong><small>{mic ? "Your microphone is live" : "Tap below to speak"}</small></div><button type="button" onClick={() => setPanelOpen(false)} aria-label="Close voice controls">✕</button></div>
          <button type="button" className={`voice-main-toggle ${mic ? "live" : ""}`} onClick={toggleMic} disabled={!ready}><span>{mic ? "🎙️" : "🎤"}</span><div><b>{mic ? "Mic On" : "Mic Off"}</b><small>{mic ? "Players can hear you" : "Your microphone is muted"}</small></div><span className={`voice-meter large ${speaking ? "live" : ""}`}><i /><i /><i /></span></button>
          <div className="voice-list">
            {voiceMembers.length === 0 ? <span className="voice-empty">No other players in voice yet.</span> : voiceMembers.map((member) => {
              const id = `ludo-chat-${safe(roomCode)}-${safe(String(member.playerId))}`;
              const muted = !!mutedPlayers[id];
              const volume = volumes[id] ?? 100;
              return <div className="voice-player" key={member.id}><div className="voice-player-avatar">{member.name.slice(0, 1).toUpperCase()}</div><div className="voice-player-info"><b>{member.name}</b><small>{muted ? "Muted" : "Voice available"}</small><input aria-label={`Volume for ${member.name}`} type="range" min="0" max="100" value={volume} onChange={(event) => setVolumes((current) => ({ ...current, [id]: Number(event.target.value) }))} /></div><button type="button" className={`voice-mute ${muted ? "muted" : ""}`} onClick={() => setMutedPlayers((current) => ({ ...current, [id]: !current[id] }))}>{muted ? "🔇" : "🔊"}</button></div>;
            })}
          </div>
          <div className="voice-tip">Speak to activate the gold meter and avatar pulse.</div>
        </div>
      )}
      <style jsx global>{`
.voice-control{width:100%;height:100%;position:relative;display:flex;align-items:center;justify-content:center}.voice-button{width:100%!important;height:100%!important;border:1px solid rgba(221,187,81,.48)!important;border-radius:16px!important;background:linear-gradient(145deg,#211706,#090806)!important;color:#f1d878!important;padding:3px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:1px!important;cursor:pointer!important;position:relative!important}.voice-button.active{box-shadow:inset 0 0 18px rgba(245,190,45,.09),0 0 16px rgba(245,190,45,.16)!important}.voice-button.connecting{opacity:.55!important;cursor:wait!important}.voice-icon{font-size:18px;line-height:18px}.voice-label{font-size:7px;font-weight:900;letter-spacing:.3px}.voice-meter{display:flex;align-items:flex-end;justify-content:center;gap:2px;height:8px;width:22px}.voice-meter i{display:block;width:3px;height:3px;border-radius:3px;background:#6d5d3a}.voice-meter i:nth-child(2){height:5px}.voice-meter.live i{background:#f2cf62;box-shadow:0 0 5px rgba(242,207,98,.8);animation:ludoVoiceBar .55s ease-in-out infinite alternate}.voice-meter.live i:nth-child(1){animation-delay:-.35s}.voice-meter.live i:nth-child(2){animation-delay:-.15s}.voice-meter.live i:nth-child(3){animation-delay:-.45s}.voice-meter.large{margin-left:auto;width:30px;height:15px}.voice-meter.large i{width:4px}.voice-meter.large i:nth-child(2){height:8px}@keyframes ludoVoiceBar{from{height:3px}to{height:10px}}.voice-popover{position:absolute;right:0;bottom:calc(100% + 10px);width:min(320px,calc(100vw - 24px));max-height:70dvh;overflow:auto;padding:12px;border:1px solid rgba(215,185,74,.62);border-radius:20px;background:linear-gradient(155deg,#1d1305,#080604 75%);box-shadow:0 18px 48px rgba(0,0,0,.62);z-index:120;color:#fff}.voice-pop-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.voice-pop-head strong{display:block;color:#f5df91;font-size:15px}.voice-pop-head small{display:block;color:#96855d;font-size:9px;margin-top:2px}.voice-pop-head button{width:30px;height:30px;border-radius:50%;border:1px solid rgba(215,185,74,.3);background:#130c03;color:#f5df91}.voice-main-toggle{width:100%;display:flex;align-items:center;gap:10px;border:1px solid rgba(215,185,74,.25);border-radius:14px;padding:10px;background:#120c04;color:#f5df91;text-align:left}.voice-main-toggle>span:first-child{font-size:21px}.voice-main-toggle>div{display:flex;flex-direction:column;flex:1}.voice-main-toggle b{font-size:12px}.voice-main-toggle small{font-size:9px;color:#96855d;margin-top:2px}.voice-main-toggle.live{border-color:rgba(74,225,132,.5)}.voice-list{display:flex;flex-direction:column;gap:6px;margin-top:9px}.voice-empty{padding:16px 8px;text-align:center;color:#8e805f;font-size:10px}.voice-player{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid rgba(215,185,74,.12);border-radius:14px;background:rgba(18,12,4,.75)}.voice-player-avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#5a420f,#211504);border:1px solid rgba(245,215,110,.55);color:#f7df91;font-weight:900}.voice-player-info{min-width:0;flex:1}.voice-player-info b{display:block;font-size:11px;color:#f3df9c}.voice-player-info small{display:block;color:#857754;font-size:8px;margin-top:1px}.voice-player-info input{width:100%;accent-color:#d7b94a;height:15px}.voice-mute{width:34px;height:34px;border-radius:11px;border:1px solid rgba(215,185,74,.2);background:#1a1004;color:#f4df9a}.voice-mute.muted{border-color:rgba(224,74,74,.5)}.voice-tip{text-align:center;margin-top:9px;color:#817453;font-size:8px}.voice-notice{position:absolute;bottom:calc(100% + 10px);right:0;max-width:240px;padding:9px 11px;border-radius:12px;background:#180d03;border:1px solid rgba(215,185,74,.48);color:#f3df9a;font-size:10px;line-height:1.35;z-index:130}.ig-avatar.voice-speaking{border-radius:50%;box-shadow:0 0 0 2px rgba(245,215,110,.72),0 0 16px rgba(245,190,45,.95),0 0 30px rgba(245,190,45,.55)!important;animation:ludoGoldVoicePulse .9s ease-in-out infinite}.ig-avatar.voice-speaking:after{content:"";position:absolute;inset:-5px;border:2px solid rgba(245,210,90,.5);border-radius:50%;animation:ludoGoldVoiceRing .9s ease-out infinite;pointer-events:none}@keyframes ludoGoldVoicePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}@keyframes ludoGoldVoiceRing{0%{transform:scale(.92);opacity:.85}100%{transform:scale(1.25);opacity:0}}
      `}</style>
    </div>
  );
}
