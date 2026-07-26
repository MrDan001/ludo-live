"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket/client";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useVoiceChat(roomId: string, enabled: boolean) {
  const [muted, setMuted] = useState(true);
  const [speakingIds, setSpeakingIds] = useState<Set<string>>(new Set());
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const createPeerConnection = useCallback((peerId: string, isInitiator: boolean) => {
    const socket = getSocket();
    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
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
    };

    peersRef.current.set(peerId, pc);

    if (isInitiator) {
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        socket.emit("voice:offer", { roomId, targetId: peerId, offer });
      });
    }

    return pc;
  }, [roomId]);

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) return;
        localStreamRef.current = stream;
        stream.getAudioTracks().forEach((track) => (track.enabled = false)); // start muted
        socket.emit("voice:join", { roomId });
      })
      .catch((err) => console.error("Mic access denied:", err));

    socket.on("voice:peer-joined", ({ socketId }: { socketId: string }) => {
      createPeerConnection(socketId, true);
    });

    socket.on("voice:offer", async ({ fromId, offer }: { fromId: string; offer: RTCSessionDescriptionInit }) => {
      const pc = createPeerConnection(fromId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer as RTCSessionDescriptionInit));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("voice:answer", { targetId: fromId, answer });
    });

    socket.on("voice:answer", async ({ fromId, answer }: { fromId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current.get(fromId);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("voice:ice-candidate", async ({ fromId, candidate }: { fromId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current.get(fromId);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("voice:peer-left", ({ socketId }: { socketId: string }) => {
      const pc = peersRef.current.get(socketId);
      if (pc) {
        pc.close();
        peersRef.current.delete(socketId);
      }
      document.querySelectorAll(`audio[data-peer-id="${socketId}"]`).forEach((el) => el.remove());
    });

    return () => {
      cancelled = true;
      socket.emit("voice:leave", { roomId });
      socket.off("voice:peer-joined");
      socket.off("voice:offer");
      socket.off("voice:answer");
      socket.off("voice:ice-candidate");
      socket.off("voice:peer-left");
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled, roomId, createPeerConnection]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const newMuted = !muted;
    localStreamRef.current.getAudioTracks().forEach((track) => (track.enabled = !newMuted));
    setMuted(newMuted);
  }, [muted]);

  return { muted, toggleMute, speakingIds };
}