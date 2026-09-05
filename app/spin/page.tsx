"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppFrame from "../_components/AppFrame";
import type { SpinWheelSlot } from "../../lib/spinWheel";

type ApiResponse = {
  serverTime?: string;
  spins?: number;
  totalSpins?: number;
  wheel?: SpinWheelSlot[];
  prize?: SpinWheelSlot;
  prizeIndex?: number;
  wheelVersion?: string;
  error?: string;
};

const SEGMENT_COLORS = ["#e5a31b", "#2279d5", "#8d43ba", "#2b9c61", "#d9544d", "#296fbd", "#c28719", "#6b4bb5"];
const SPIN_DURATION = 5800;

function segmentLayout(items: SpinWheelSlot[]) {
  const span = 360 / Math.max(1, items.length);
  return items.map((item, index) => ({ ...item, start: index * span, span, center: index * span + span / 2 }));
}

function formatTime(ms: number) {
  const d = new Date(ms + 60 * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;
}

function rewardText(reward: SpinWheelSlot) {
  if (reward.kind === "shop_item") return `You won ${reward.icon} ${reward.label}!`;
  if (reward.kind === "extraSpin") return `You won ${reward.icon} ${reward.label}!`;
  return `You won ${reward.icon} ${reward.label}!`;
}

export default function SpinPage() {
  const [spins, setSpins] = useState(0);
  const [wheel, setWheel] = useState<SpinWheelSlot[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinWheelSlot | null>(null);
  const [serverNow, setServerNow] = useState(Date.now());
  const [error, setError] = useState("");
  const rotationRef = useRef(0);
  const finishTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/spin", { cache: "no-store" });
      const data: ApiResponse = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load Spin Wheel.");
      const nextWheel = Array.isArray(data.wheel) ? data.wheel : [];
      setSpins(Number(data.spins) || 0);
      setWheel(nextWheel);
      if (data.serverTime) setServerNow(new Date(data.serverTime).getTime());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Spin Wheel unavailable.");
    }
  }, []);

  useEffect(() => {
    void load();
    const clock = window.setInterval(() => setServerNow((value) => value + 1000), 1000);
    const poll = window.setInterval(() => void load(), 15000);
    const refresh = () => void load();
    window.addEventListener("ludo-spin-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(poll);
      window.removeEventListener("ludo-spin-updated", refresh);
      window.removeEventListener("focus", refresh);
      if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
    };
  }, [load]);

  const layout = useMemo(() => segmentLayout(wheel), [wheel]);
  const gradient = wheel.length === 8
    ? `conic-gradient(${layout.map((item, index) => `${SEGMENT_COLORS[index % SEGMENT_COLORS.length]} ${item.start}deg ${item.start + item.span}deg`).join(",")})`
    : "#263b58";

  const spin = async () => {
    if (spinning || spins < 1 || wheel.length !== 8) return;
    setSpinning(true);
    setResult(null);
    setError("");
    try {
      const response = await fetch("/api/spin", { method: "POST", cache: "no-store" });
      const data: ApiResponse = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not complete Spin Wheel spin.");
      const snapshot = Array.isArray(data.wheel) ? data.wheel : [];
      const prizeIndex = Number(data.prizeIndex);
      if (snapshot.length !== 8 || !Number.isInteger(prizeIndex) || prizeIndex < 0 || prizeIndex >= snapshot.length || !data.prize) {
        throw new Error("Spin result and wheel configuration are out of sync. Please try again.");
      }

      setWheel(snapshot);
      setSpins(Number(data.spins) || 0);
      const target = segmentLayout(snapshot)[prizeIndex];
      if (!target) throw new Error("Unable to position the Spin reward.");

      const landing = 360 - target.center;
      const nextRotation = rotationRef.current + 360 * 7 + landing;
      rotationRef.current = nextRotation;
      setRotation(nextRotation);

      finishTimer.current = window.setTimeout(() => {
        setSpinning(false);
        setResult(data.prize || null);
        window.dispatchEvent(new Event("ludo-wallet-updated"));
        window.dispatchEvent(new Event("ludo-spin-updated"));
        void load();
      }, SPIN_DURATION);
    } catch (err) {
      setSpinning(false);
      setError(err instanceof Error ? err.message : "Could not complete Spin Wheel spin.");
    }
  };

  return (
    <AppFrame back="/home">
      <main style={page}>
        <header style={header}><b>Spin Wheel</b></header>
        <div style={eyebrow}>8 LIVE REWARD SLOTS</div>
        <h1 style={title}>Spin Wheel</h1>
        <a href="/spin-rewards" style={rewardBtn}>🎁 Spin Rewards</a>

        <section style={wheelWrap} aria-label="Spin Wheel">
          <div style={pointer} />
          <div style={{ ...wheelShell, transform: `rotate(${rotation}deg)`, transition: spinning ? `transform ${SPIN_DURATION}ms cubic-bezier(.08,.72,.12,1)` : "none" }}>
            <div style={{ ...segments, background: gradient }}>
              {layout.map((item) => (
                <div key={item.slot} style={{ position: "absolute", left: "50%", top: "50%", transform: `rotate(${item.center}deg)`, transformOrigin: "0 0" }}>
                  <div style={{ ...label, transform: `rotate(${-item.center}deg)` }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={hub}><b>SPIN</b></div>
          </div>
        </section>

        <div style={balance}>🎟️ <b>{spins}</b> free {spins === 1 ? "spin" : "spins"} available</div>
        <div style={serverTime}>◷ Server time: <b>{formatTime(serverNow)} (GMT +1)</b></div>

        <button onClick={spin} disabled={spinning || spins < 1 || wheel.length !== 8} style={{ ...spinBtn, opacity: spinning ? 0.7 : 1 }}>
          {spinning ? "Spinning…" : spins < 1 ? "Stay active to earn a spin" : wheel.length !== 8 ? "Spin Wheel unavailable" : "Spin Now"}
        </button>

        {error && <div style={errorBox}>{error}</div>}
        {result && <div style={resultBox}>
          <span style={{ fontSize: 28 }}>🎉</span>
          <b>{rewardText(result)}</b>
          <small>{result.kind === "shop_item" ? "Your prize is waiting in Spin Rewards to claim to Inventory." : result.kind === "extraSpin" ? `+${result.amount} spin${result.amount === 1 ? "" : "s"} added to your balance.` : "The reward was added to your account."}</small>
          {result.kind === "shop_item" && <a href="/spin-rewards" style={claimLink}>OPEN SPIN REWARDS</a>}
        </div>}
      </main>
    </AppFrame>
  );
}

const page: React.CSSProperties = { maxWidth: 650, margin: "0 auto", paddingBottom: 45, textAlign: "center" };
const header: React.CSSProperties = { display: "flex", justifyContent: "center", padding: "0 4px 14px", fontSize: 18 };
const eyebrow: React.CSSProperties = { fontSize: 12, letterSpacing: 2, fontWeight: 950, color: "#f5cf43" };
const title: React.CSSProperties = { fontSize: 32, margin: "6px 0 8px", fontWeight: 950 };
const rewardBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", padding: "10px 18px", borderRadius: 10, background: "linear-gradient(135deg,#8b4dff,#d6a126)", color: "#fff", textDecoration: "none", fontWeight: 950, fontSize: 14 };
const wheelWrap: React.CSSProperties = { position: "relative", width: "min(88vw, 455px)", aspectRatio: "1", margin: "10px auto 15px" };
const pointer: React.CSSProperties = { position: "absolute", zIndex: 30, left: "50%", top: -3, transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "23px solid transparent", borderRight: "23px solid transparent", borderTop: "44px solid #ffdf55", filter: "drop-shadow(0 3px 2px #000)" };
const wheelShell: React.CSSProperties = { position: "absolute", inset: 6, borderRadius: "50%", padding: 8, background: "linear-gradient(145deg,#ffea6b,#a76609 35%,#f5bf2d 58%,#7d4705)", boxShadow: "0 0 0 3px #3a2105,0 8px 28px #0008" };
const segments: React.CSSProperties = { position: "relative", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "4px solid #3a2105" };
const label: React.CSSProperties = { position: "absolute", left: -54, top: -144, width: 108, minHeight: 80, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 4, textAlign: "center", color: "#fff", fontSize: 11, fontWeight: 950, textShadow: "0 2px 3px #000" };
const hub: React.CSSProperties = { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 88, height: 88, borderRadius: "50%", display: "grid", placeItems: "center", background: "radial-gradient(circle at 35% 30%,#b7ff73,#43a92b 55%,#14610d)", border: "6px solid #4a2904", color: "#fff", fontSize: 20 };
const balance: React.CSSProperties = { display: "inline-flex", gap: 7, alignItems: "center", padding: "8px 14px", borderRadius: 999, background: "#102d58", border: "1px solid #31588e", color: "#fff", fontSize: 14 };
const serverTime: React.CSSProperties = { marginTop: 10, color: "#8fa5c5", fontSize: 11 };
const spinBtn: React.CSSProperties = { marginTop: 12, width: "100%", maxWidth: 420, border: 0, borderRadius: 7, padding: 13, background: "linear-gradient(180deg,#43d923,#1e9c10)", color: "#fff", fontWeight: 950, fontSize: 17 };
const errorBox: React.CSSProperties = { marginTop: 12, padding: 10, borderRadius: 10, background: "#35131a", border: "1px solid #8e3744", color: "#fecaca" };
const resultBox: React.CSSProperties = { marginTop: 12, padding: 14, borderRadius: 10, background: "#082c18", border: "1px solid #2ab55d", display: "grid", gap: 5 };
const claimLink: React.CSSProperties = { color: "#fff", fontWeight: 900, fontSize: 11 };
