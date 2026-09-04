"use client";

import { useEffect } from "react";
import { Socket } from "socket.io-client";

type GameSocket = Socket & {
  __ludoReliabilityRoom?: string;
  __ludoReliabilityPlayer?: string;
  __ludoReliabilityAction?: { kind: "roll" | "move"; timer: number; seq: number };
  __ludoReliabilitySeq?: number;
};

const PATCH = Symbol.for("ludo.game-online.reliability-runtime-v1");
const proto = Socket.prototype as any;
const ACTION_TIMEOUT = 6000;
const CONNECT_RECOVER_DELAY = 250;

function dispatchStatus(status: "connected" | "reconnecting" | "disconnected", reason?: string) {
  try { window.dispatchEvent(new CustomEvent("ludo-multiplayer-connection", { detail: { status, reason: reason || "" } })); } catch {}
}

function localEvent(socket: GameSocket, event: string, payload?: any) {
  try {
    const callbacks = (socket as any)._callbacks?.[`$${event}`];
    if (Array.isArray(callbacks)) for (const cb of callbacks.slice()) cb(payload);
  } catch {}
}

function recover(socket: GameSocket) {
  if (!socket.connected || !socket.__ludoReliabilityRoom) return;
  socket.emit("game-recover", { roomCode: socket.__ludoReliabilityRoom }, (result: any) => {
    if (result?.ok) dispatchStatus("connected");
  });
}

if (!proto[PATCH]) {
  proto[PATCH] = true;
  const originalOn = Socket.prototype.on;
  const originalEmit = Socket.prototype.emit;

  proto.on = function(this: GameSocket, event: string, listener: (...args: any[]) => void) {
    if (event === "connect") {
      return originalOn.call(this, event, (...args: any[]) => {
        dispatchStatus("connected");
        const result = listener(...args);
        window.setTimeout(() => recover(this), CONNECT_RECOVER_DELAY);
        return result;
      });
    }
    if (event === "disconnect") {
      return originalOn.call(this, event, (...args: any[]) => {
        dispatchStatus("reconnecting", String(args[0] || "connection lost"));
        return listener(...args);
      });
    }
    if (event === "connect_error") {
      return originalOn.call(this, event, (...args: any[]) => {
        dispatchStatus("reconnecting", String(args[0]?.message || "network error"));
        return listener(...args);
      });
    }
    if (event === "game-state") {
      return originalOn.call(this, event, (...args: any[]) => {
        const next = args[0];
        const action = this.__ludoReliabilityAction;
        if (action && Number(next?.stateRevision) >= 0) {
          window.clearTimeout(action.timer);
          this.__ludoReliabilityAction = undefined;
        }
        return listener(...args);
      });
    }
    if (event === "game-moved" || event === "game-move-error" || event === "game-roll-error") {
      return originalOn.call(this, event, (...args: any[]) => {
        const action = this.__ludoReliabilityAction;
        if (action && ((event === "game-moved" && action.kind === "move") || (event === "game-move-error" && action.kind === "move") || (event === "game-roll-error" && action.kind === "roll"))) {
          window.clearTimeout(action.timer);
          this.__ludoReliabilityAction = undefined;
        }
        return listener(...args);
      });
    }
    return originalOn.call(this, event, listener);
  };

  proto.emit = function(this: GameSocket, event: string, ...args: any[]) {
    if (event === "join-room") {
      const payload = { ...(args[0] || {}) };
      this.__ludoReliabilityRoom = String(payload.roomCode || "").trim().toUpperCase();
      this.__ludoReliabilityPlayer = String(payload.playerId || "");
      return originalEmit.call(this, event, payload, ...args.slice(1));
    }

    if (event === "game-roll" || event === "game-move") {
      if (!this.connected) {
        localEvent(this, event === "game-move" ? "game-move-error" : "game-roll-error", { error: "socket_disconnected" });
        return this;
      }
      const kind = event === "game-roll" ? "roll" : "move";
      const seq = (this.__ludoReliabilitySeq || 0) + 1;
      this.__ludoReliabilitySeq = seq;
      if (this.__ludoReliabilityAction) window.clearTimeout(this.__ludoReliabilityAction.timer);

      let settled = false;
      const clearAction = () => {
        if (settled) return;
        settled = true;
        const current = this.__ludoReliabilityAction;
        if (current?.seq === seq) {
          window.clearTimeout(current.timer);
          this.__ludoReliabilityAction = undefined;
        }
      };
      const originalAck = typeof args[args.length - 1] === "function" ? args[args.length - 1] : null;
      const ack = (result: any) => { clearAction(); originalAck?.(result); };
      const outbound = originalAck ? args.slice(0, -1) : args.slice();
      outbound.push(ack);
      const timer = window.setTimeout(() => {
        if (settled || this.__ludoReliabilityAction?.seq !== seq) return;
        this.__ludoReliabilityAction = undefined;
        if (kind === "move") localEvent(this, "game-move-error", { error: "action_timeout" });
        else localEvent(this, "game-roll-error", { error: "action_timeout" });
        recover(this);
      }, ACTION_TIMEOUT);
      this.__ludoReliabilityAction = { kind, timer, seq };
      return originalEmit.call(this, event, ...outbound);
    }

    if (event === "game-recover") return originalEmit.call(this, event, ...args);
    return originalEmit.call(this, event, ...args);
  };
}

export default function MultiplayerReliabilityRuntime() {
  useEffect(() => {
    const onOnline = () => dispatchStatus("reconnecting", "network_online");
    const onOffline = () => dispatchStatus("disconnected", "offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // The active online-game client uses 280ms/220ms waits for each displayed
    // movement step. Narrowly scale only those two delays on this route so
    // movement stays animated without making the game feel frozen.
    const nativeSetTimeout = window.setTimeout;
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...rest: any[]) => {
      let nextTimeout = Number(timeout ?? 0);
      if (window.location.pathname === "/game-online") {
        if (nextTimeout === 280) nextTimeout = 80;
        else if (nextTimeout === 220) nextTimeout = 70;
      }
      return nativeSetTimeout(handler, nextTimeout, ...rest);
    }) as typeof window.setTimeout;

    dispatchStatus(navigator.onLine ? "connected" : "disconnected");
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.setTimeout = nativeSetTimeout;
    };
  }, []);
  return null;
}
