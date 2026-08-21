"use client";

import { useEffect, useMemo, useState } from "react";
import AppFrame from "../_components/AppFrame";
import { addBadge, awardGemPurchaseXP, STARTING_COINS, STARTING_GEMS } from "../../lib/playerProgress";

type Tab = "Coins" | "Gems" | "Items" | "Avatars";
type Wallet = { coins: number; gems: number; spins: number; mystery: number };
type Purchase = { id: string; name: string; price: number; kind: "coins" | "item" | "avatar"; quantity?: number };

const tabs: Tab[] = ["Coins", "Gems", "Items", "Avatars"];
const defaults: Wallet = { coins: STARTING_COINS, gems: STARTING_GEMS, spins: 0, mystery: 0 };
const gemPackages = [
  { id: "gems-50", gems: 50, naira: 1000 }, { id: "gems-100", gems: 100, naira: 1500 },
  { id: "gems-200", gems: 200, naira: 2500 }, { id: "gems-400", gems: 400, naira: 4000 },
  { id: "gems-500", gems: 500, naira: 5000 }, { id: "gems-1000", gems: 1000, naira: 8000 },
  { id: "gems-1500", gems: 1500, naira: 10000 },
];
const coinPackages = [
  { id: "coins-500", coins: 500, gems: 25 }, { id: "coins-1000", coins: 1000, gems: 50 },
  { id: "coins-2000", coins: 2000, gems: 100 }, { id: "coins-4000", coins: 4000, gems: 200 },
  { id: "coins-8000", coins: 8000, gems: 400 }, { id: "coins-15000", coins: 15000, gems: 800 },
  { id: "coins-20000", coins: 20000, gems: 1000 },
];
const avatars = [
  { id: "avatar-1", name: "Avatar 1", icon: "🧑🏽‍🎮", price: 500 }, { id: "avatar-2", name: "Avatar 2", icon: "👩🏽‍🎤", price: 700 },
  { id: "avatar-3", name: "Avatar 3", icon: "🧔🏾‍♂️", price: 1000 }, { id: "avatar-4", name: "Avatar 4", icon: "👨🏽‍🚀", price: 1200 },
  { id: "avatar-5", name: "Avatar 5", icon: "👩🏾‍🚀", price: 1300 }, { id: "avatar-6", name: "Avatar 6", icon: "🧙🏽‍♂️", price: 2000 },
];
const items = [
  { id: "golden-dice", name: "Golden Dice", description: "Lucky dice skin", icon: "🎲" },
  { id: "shield", name: "Shield", description: "Animated profile frame", icon: "🛡️" },
  { id: "trail", name: "Trail", description: "Token movement effect", icon: "🔥" },
  { id: "crown", name: "Crown", description: "Winner celebration", icon: "👑" },
];
function readWallet(): Wallet { try { const stored = JSON.parse(localStorage.getItem("ludo-wallet") || "null"); return { ...defaults, ...(stored || {}) }; } catch { return defaults; } }
function writeWallet(wallet: Wallet) { localStorage.setItem("ludo-wallet", JSON.stringify(wallet)); window.dispatchEvent(new Event("ludo-wallet-updated")); }
function naira(value: number) { return `₦${value.toLocaleString("en-NG")}`; }

export default function ShopPage() {
  const [tab, setTab] = useState<Tab>("Coins"); const [wallet, setWallet] = useState<Wallet>(defaults); const [notice, setNotice] = useState("");
  const [email, setEmail] = useState(""); const [emailOpen, setEmailOpen] = useState(false); const [pendingGemPackage, setPendingGemPackage] = useState<(typeof gemPackages)[number] | null>(null);
  const [confirm, setConfirm] = useState<Purchase | null>(null); const [busy, setBusy] = useState(false); const [owned, setOwned] = useState<string[]>([]);

  useEffect(() => {
    setWallet(readWallet()); const sync = () => setWallet(readWallet()); window.addEventListener("ludo-wallet-updated", sync); window.addEventListener("storage", sync);
    try { setEmail(localStorage.getItem("ludo-paystack-email") || ""); setOwned(JSON.parse(localStorage.getItem("ludo-inventory") || "[]")); } catch {}
    const params = new URLSearchParams(window.location.search); const payment = params.get("payment"); const gems = Number(params.get("gems") || 0); const reference = params.get("reference") || "";
    if (payment === "success" && gems > 0 && reference) {
      const appliedKey = `ludo-payment-applied-${reference}`;
      if (!localStorage.getItem(appliedKey)) {
        const current = readWallet(); const next = { ...current, gems: current.gems + gems }; writeWallet(next); localStorage.setItem(appliedKey, "1"); setWallet(next);
        awardGemPurchaseXP(); setNotice(`Payment confirmed. ${gems.toLocaleString()} gems have been added to your wallet. +5 XP earned.`);
      }
      window.history.replaceState({}, "", "/shop");
    } else if (payment === "failed") { setNotice("Payment was not completed. No gems were added."); window.history.replaceState({}, "", "/shop"); }
    return () => { window.removeEventListener("ludo-wallet-updated", sync); window.removeEventListener("storage", sync); };
  }, []);

  const balanceText = useMemo(() => `${wallet.coins.toLocaleString()} 🪙    ${wallet.gems.toLocaleString()} 💎`, [wallet]);
  const buyGemPackage = async () => {
    if (!pendingGemPackage || !email.trim()) return; setBusy(true); setNotice("");
    try { localStorage.setItem("ludo-paystack-email", email.trim()); const response = await fetch("/api/paystack/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId: pendingGemPackage.id, email: email.trim() }) }); const data = await response.json(); if (!response.ok || !data.authorization_url) throw new Error(data.error || "Unable to start payment."); window.location.href = data.authorization_url; }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to start payment."); setBusy(false); }
  };
  const confirmPurchase = () => {
    if (!confirm) return;
    if (wallet.gems < confirm.price) { setConfirm(null); setNotice(`You need ${confirm.price.toLocaleString()} gems for ${confirm.name}. Buy more gems from the Gems tab.`); setTab("Gems"); return; }
    const next = { ...wallet, gems: wallet.gems - confirm.price, ...(confirm.kind === "coins" ? { coins: wallet.coins + (confirm.quantity || 0) } : {}) }; writeWallet(next); setWallet(next);
    if (confirm.kind !== "coins") { const nextOwned = Array.from(new Set([...owned, confirm.id])); localStorage.setItem("ludo-inventory", JSON.stringify(nextOwned)); setOwned(nextOwned); addBadge({ id: `store-${confirm.id}`, label: confirm.name, icon: confirm.kind === "avatar" ? "🧑" : "🏅", source: "store" }); }
    setConfirm(null); setNotice(`${confirm.name} purchased successfully.`);
  };

  return <AppFrame back="/home"><main className="shop-page" style={page}>
    <header className="shop-header" style={header}><h1 style={title}>Shop</h1><div className="shop-wallet" style={walletBadge}>{balanceText}</div></header>
    <nav className="shop-tabs" style={tabsStyle} aria-label="Shop categories">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className="shop-tab" style={{ ...tabStyle, ...(tab === item ? tabActive : {}) }}>{item}</button>)}</nav>
    {notice && <div style={noticeStyle}>{notice}</div>}
    <section style={list}>
      {tab === "Gems" && gemPackages.map((pack) => <article key={pack.id} className="shop-row" style={row}><strong style={rowTitle}>💎 {pack.gems.toLocaleString()} Gems</strong><button onClick={() => { setPendingGemPackage(pack); setEmailOpen(true); }} style={buyBtn}>{naira(pack.naira)}</button></article>)}
      {tab === "Coins" && coinPackages.map((pack) => <article key={pack.id} className="shop-row" style={row}><strong style={rowTitle}>🪙 {pack.coins.toLocaleString()} Coins</strong><button onClick={() => setConfirm({ id: pack.id, name: `${pack.coins.toLocaleString()} Coins`, price: pack.gems, quantity: pack.coins, kind: "coins" })} style={buyBtn}>💎 {pack.gems.toLocaleString()}</button></article>)}
      {tab === "Items" && items.map((item) => { const isOwned = owned.includes(item.id); return <article key={item.id} className="shop-row" style={row}><div className="shop-row-copy"><strong style={rowTitle}>{item.icon} {item.name}</strong><div style={description}>{item.description}</div></div><button disabled={isOwned} onClick={() => setConfirm({ id: item.id, name: item.name, price: 500, kind: "item" })} style={{ ...buyBtn, opacity: isOwned ? .55 : 1 }}>{isOwned ? "OWNED" : "💎 500"}</button></article>; })}
      {tab === "Avatars" && <div className="shop-avatar-grid" style={avatarGrid}>{avatars.map((avatar) => { const isOwned = owned.includes(avatar.id); return <article key={avatar.id} className="shop-avatar-card" style={avatarCard}><div style={avatarIcon}>{avatar.icon}</div><strong>{avatar.name}</strong><button disabled={isOwned} onClick={() => setConfirm({ id: avatar.id, name: avatar.name, price: avatar.price, kind: "avatar" })} style={{ ...buyBtn, width: "100%", opacity: isOwned ? .55 : 1 }}>{isOwned ? "OWNED" : `💎 ${avatar.price.toLocaleString()}`}</button></article>; })}</div>}
    </section>
    {emailOpen && pendingGemPackage && <div style={overlay}><div className="shop-modal" style={modal}><h2 style={modalTitle}>Buy {pendingGemPackage.gems.toLocaleString()} Gems</h2><p style={modalText}>You will pay <b>{naira(pendingGemPackage.naira)}</b> securely through Paystack.</p><label style={label}>Payment email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={input} autoComplete="email" /></label><div style={modalActions}><button onClick={() => setEmailOpen(false)} style={cancelBtn} disabled={busy}>CANCEL</button><button onClick={buyGemPackage} style={buyBtn} disabled={busy || !email.trim()}>{busy ? "OPENING…" : "PAY WITH PAYSTACK"}</button></div></div></div>}
    {confirm && <div style={overlay}><div className="shop-modal" style={modal}><h2 style={modalTitle}>Confirm purchase</h2><p style={modalText}>Buy <b>{confirm.name}</b> for <b>{confirm.price.toLocaleString()} gems</b>?</p><p style={balanceTextStyle}>Current balance: {wallet.gems.toLocaleString()} gems</p><div style={modalActions}><button onClick={() => setConfirm(null)} style={cancelBtn}>CANCEL</button><button onClick={confirmPurchase} style={buyBtn}>CONFIRM PURCHASE</button></div></div></div>}
  </main></AppFrame>;
}

const page: React.CSSProperties = { width: "100%", maxWidth: 760, minWidth: 0, margin: "0 auto", paddingBottom: 48 };
const header: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 14, marginBottom: 18, minWidth: 0 };
const title: React.CSSProperties = { fontSize: "clamp(34px, 8vw, 42px)", margin: 0, fontWeight: 950 };
const walletBadge: React.CSSProperties = { color: "#f8d35a", fontSize: "clamp(14px, 3.8vw, 16px)", fontWeight: 900, textAlign: "right", overflowWrap: "anywhere" };
const tabsStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5, background: "#061735", padding: 5, borderRadius: 14, width: "100%", minWidth: 0 };
const tabStyle: React.CSSProperties = { border: 0, borderRadius: 11, padding: "15px 8px", color: "#fff", fontWeight: 900, background: "transparent", cursor: "pointer", minWidth: 0 };
const tabActive: React.CSSProperties = { background: "#1769e8" }; const list: React.CSSProperties = { display: "grid", gap: 12, marginTop: 16, minWidth: 0 };
const row: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: 18, borderRadius: 15, background: "linear-gradient(90deg,#071a40,#092354)", border: "1px solid rgba(78,125,211,.22)", minWidth: 0, flexWrap: "wrap" };
const rowTitle: React.CSSProperties = { fontSize: "clamp(18px, 4.5vw, 22px)" }; const description: React.CSSProperties = { color: "#94a3b8", marginTop: 4, fontSize: 16 };
const buyBtn: React.CSSProperties = { border: 0, borderRadius: 11, padding: "13px 18px", background: "#39a51d", color: "#fff", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap", maxWidth: "100%" };
const avatarGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(170px,100%),1fr))", gap: 12, width: "100%", minWidth: 0 };
const avatarCard: React.CSSProperties = { border: "1px solid rgba(78,125,211,.25)", borderRadius: 16, padding: 16, background: "#081b42", color: "#fff", display: "grid", gap: 10, placeItems: "center", textAlign: "center", minWidth: 0, overflow: "hidden" };
const avatarIcon: React.CSSProperties = { fontSize: "clamp(48px, 12vw, 58px)", minHeight: 70, display: "grid", placeItems: "center" };
const noticeStyle: React.CSSProperties = { marginTop: 14, padding: 13, borderRadius: 12, background: "rgba(22,101,52,.5)", border: "1px solid rgba(74,222,128,.25)", color: "#bbf7d0", fontWeight: 700 };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 18, background: "rgba(0,0,0,.72)" };
const modal: React.CSSProperties = { width: "min(440px,100%)", borderRadius: 18, padding: 22, background: "linear-gradient(180deg,#0b234e,#06142f)", border: "1px solid rgba(96,165,250,.35)", boxShadow: "0 20px 60px rgba(0,0,0,.45)", boxSizing: "border-box" };
const modalTitle: React.CSSProperties = { marginTop: 0, fontSize: 25 }; const modalText: React.CSSProperties = { color: "#cbd5e1", lineHeight: 1.5 }; const balanceTextStyle: React.CSSProperties = { color: "#f8d35a", fontWeight: 800 };
const label: React.CSSProperties = { display: "grid", gap: 7, color: "#bfdbfe", fontWeight: 800, marginTop: 16 }; const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: 13, borderRadius: 11, border: "1px solid #315b9f", background: "#041128", color: "#fff", outline: "none" };
const modalActions: React.CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, flexWrap: "wrap" }; const cancelBtn: React.CSSProperties = { border: 0, borderRadius: 11, padding: "13px 16px", background: "#334155", color: "#fff", fontWeight: 900, cursor: "pointer" };
