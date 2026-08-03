"use client";

import { create } from "zustand";
import { getSocket } from "@/lib/socket/client";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
const SPEAKING_THRESHOLD = 10; // avg deviation from silence, 0-128 scale
const POLL_INTERVAL_MS = 150;

interface VoiceChatState {
  roomId: string | null;
  muted: boolean;
  speakingIds: Set<string>;
  peerMuted: Record<string, boolean>;

  connect: (roomId: string, enabled: boolean) => void;
  disconnect: () => void;
  toggleMute: () => void;
}

// Imperative WebRTC/audio internals live as module-level state rather than
// in the zustand store, since they're a single shared connection (one mic,
// one set of peer connections) that multiple components read from - they
// don't need to trigger re-renders themselves, only their effects do.
let localStream: MediaStream | null = null;
const peers = new Map<string, RTCPeerConnection>();
let audioCtx: AudioContext | null = null;
let localAnalyser: AnalyserNode | null = null;
const remoteAnalysers = new Map<string, AnalyserNode>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let connectedRoomId: string | null = null;

function ensureAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function isSpeaking(analyser: AnalyserNode): boolean {
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += Math.abs(data[i] - 128);
  return sum / data.length > SPEAKING_THRESHOLD;
}

function attachRemoteAnalyser(peerId: string, stream: MediaStream) {
  const ctx = ensureAudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  remoteAnalysers.set(peerId, analyser);
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    const active = new Set<string>();
    const mySocketId = getSocket().id;
    const { muted, peerMuted } = useVoiceChat.getState();

    if (localAnalyser && mySocketId && !muted && isSpeaking(localAnalyser)) {
      active.add(mySocketId);
    }
    remoteAnalysers.forEach((analyser, peerId) => {
      if (peerMuted[peerId]) return;
      if (isSpeaking(analyser)) active.add(peerId);
    });

    useVoiceChat.setState({ speakingIds: active });
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export const useVoiceChat = create<VoiceChatState>((set, get) => ({
  roomId: null,
  muted: true,
  speakingIds: new Set(),
  peerMuted: {},

  connect: (roomId, enabled) => {
    if (!enabled) return;
    if (connectedRoomId === roomId) return; // already live for this room - no-op

    get().disconnect();

    const socket = getSocket();
    connectedRoomId = roomId;
    set({ roomId, muted: true, speakingIds: new Set(), peerMuted: {} });

    const createPeerConnection = (peerId: string, isInitiator: boolean) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      if (localStream) {
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream!));
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("voice:ice-candidate", { targetId: peerId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
        audio.dataset.peerId = peerId;
        document.body.appendChild(audio);
        attachRemoteAnalyser(peerId, event.streams[0]);
      };

      peers.set(peerId, pc);

      if (isInitiator) {
        pc.createOffer().then((offer) => {
          pc.setLocalDescription(offer);
          socket.emit("voice:offer", { roomId, targetId: peerId, offer });
        });
      }

      return pc;
    };

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (connectedRoomId !== roomId) return; // disconnected/switched rooms mid-flight
        localStream = stream;
        stream.getAudioTracks().forEach((track) => (track.enabled = false)); // start muted

        const ctx = ensureAudioContext();
        const source = ctx.createMediaStreamSource(stream);
        localAnalyser = ctx.createAnalyser();
        localAnalyser.fftSize = 512;
        source.connect(localAnalyser);

        socket.emit("voice:join", { roomId });
        startPolling();
      })
      .catch((err) => console.error("Mic access denied:", err));

    socket.off("voice:peer-joined");
    socket.off("voice:offer");
    socket.off("voice:answer");
    socket.off("voice:ice-candidate");
    socket.off("voice:peer-left");
    socket.off("voice:mute-changed");

    socket.on("voice:peer-joined", ({ socketId }: { socketId: string }) => {
      createPeerConnection(socketId, true);
    });

    socket.on("voice:offer", async ({ fromId, offer }: { fromId: string; offer: RTCSessionDescriptionInit }) => {
      const pc = createPeerConnection(fromId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("voice:answer", { targetId: fromId, answer });
    });

    socket.on("voice:answer", async ({ fromId, answer }: { fromId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peers.get(fromId);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("voice:ice-candidate", async ({ fromId, candidate }: { fromId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peers.get(fromId);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("voice:peer-left", ({ socketId }: { socketId: string }) => {
      const pc = peers.get(socketId);
      if (pc) {
        pc.close();
        peers.delete(socketId);
      }
      remoteAnalysers.delete(socketId);
      document.querySelectorAll(`audio[data-peer-id="${socketId}"]`).forEach((el) => el.remove());
      set((s) => {
        const next = { ...s.peerMuted };
        delete next[socketId];
        return { peerMuted: next };
      });
    });

    socket.on("voice:mute-changed", ({ socketId, muted }: { socketId: string; muted: boolean }) => {
      set((s) => ({ peerMuted: { ...s.peerMuted, [socketId]: muted } }));
    });
  },

  disconnect: () => {
    if (!connectedRoomId) return;
    const socket = getSocket();
    socket.emit("voice:leave", { roomId: connectedRoomId });
    socket.off("voice:peer-joined");
    socket.off("voice:offer");
    socket.off("voice:answer");
    socket.off("voice:ice-candidate");
    socket.off("voice:peer-left");
    socket.off("voice:mute-changed");

    stopPolling();
    peers.forEach((pc) => pc.close());
    peers.clear();
    remoteAnalysers.clear();
    document.querySelectorAll("audio[data-peer-id]").forEach((el) => el.remove());
    localStream?.getTracks().forEach((t) => t.stop());
    localStream = null;
    localAnalyser = null;
    connectedRoomId = null;

    set({ roomId: null, muted: true, speakingIds: new Set(), peerMuted: {} });
  },

  toggleMute: () => {
    if (!localStream) return;
    const newMuted = !get().muted;
    localStream.getAudioTracks().forEach((track) => (track.enabled = !newMuted));
    set({ muted: newMuted });

    if (connectedRoomId) {
      getSocket().emit("voice:mute-changed", { roomId: connectedRoomId, muted: newMuted });
    }
  },
}));