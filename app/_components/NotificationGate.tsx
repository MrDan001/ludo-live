"use client";

import { useEffect, useState } from "react";

function base64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const normalized = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export default function NotificationGate() {
  const [state, setState] = useState<"checking" | "ready" | "blocked" | "unsupported" | "subscribed" | "error">("checking");
  const [message, setMessage] = useState("");

  async function subscribe() {
    try {
      setState("checking");
      setMessage("");
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }
      if (!window.isSecureContext) {
        setState("unsupported");
        setMessage("Notifications require the secure Ludo Live app connection.");
        return;
      }
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") {
        setState("blocked");
        setMessage("Notifications are required. Enable them in your browser or device settings, then return here.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const keyResponse = await fetch("/api/notifications/public-key", { cache: "no-store", credentials: "include" });
      const keyData = await keyResponse.json();
      if (!keyResponse.ok || !keyData.publicKey) throw new Error(keyData.error || "Push notifications are not configured.");
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8Array(keyData.publicKey) });
      const response = await fetch("/api/notifications/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ subscription: subscription.toJSON() }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not register this device for notifications.");
      setState("subscribed");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Notification setup failed. Please try again.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) { if (!cancelled) setState("unsupported"); return; }
      try {
        const response = await fetch("/api/notifications/subscribe", { cache: "no-store", credentials: "include" });
        if (response.status === 401) { if (!cancelled) setState("subscribed"); return; }
        const data = await response.json();
        if (data.subscribed && Notification.permission === "granted") { if (!cancelled) setState("subscribed"); return; }
        if (!cancelled) setState(Notification.permission === "denied" ? "blocked" : "ready");
      } catch { if (!cancelled) setState("error"); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (state === "checking" || state === "subscribed") return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(2,8,23,.96)", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "min(440px,100%)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 24, padding: 24, background: "#07152d", color: "white", textAlign: "center", boxShadow: "0 20px 80px rgba(0,0,0,.5)" }}>
        <div style={{ fontSize: 46, marginBottom: 8 }}>🔔</div>
        <h2 style={{ margin: "0 0 10px", fontSize: 24 }}>Notifications are required</h2>
        <p style={{ opacity: .82, lineHeight: 1.5, margin: "0 0 18px" }}>Allow Ludo Live notifications so you can receive game, room, friend, tournament and reward updates even when the app is not in the foreground.</p>
        {state === "unsupported" ? <p style={{ color: "#ffd166" }}>{message || "This browser/device does not support web push. Install/open Ludo Live as an app or use a supported secure browser."}</p> : <button onClick={subscribe} style={{ width: "100%", border: 0, borderRadius: 14, padding: "14px 18px", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>Enable Notifications</button>}
        {message && state !== "unsupported" && <p style={{ color: "#ffb4b4", margin: "14px 0 0", lineHeight: 1.45 }}>{message}</p>}
      </div>
    </div>
  );
}
