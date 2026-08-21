"use client";
import { useEffect, useState } from "react";
import AppFrame from "../_components/AppFrame";

type Item = { id: string; name: string; currency: "coins" | "gems"; price: number; rarity: string };

const boards: Item[] = [
  { id: "classic", name: "Classic Ludo", currency: "coins", price: 0, rarity: "COMMON" },
  { id: "golden", name: "Golden Royal", currency: "gems", price: 50, rarity: "EPIC" },
  { id: "neon", name: "Neon Glow", currency: "gems", price: 100, rarity: "LEGENDARY" },
  { id: "beach", name: "Beach Vibes", currency: "coins", price: 3000, rarity: "RARE" },
  { id: "galaxy", name: "Galaxy Space", currency: "gems", price: 75, rarity: "EPIC" },
  { id: "wood", name: "Wooden Classic", currency: "coins", price: 1000, rarity: "COMMON" },
  { id: "dragon", name: "Dragon Theme", currency: "gems", price: 80, rarity: "EPIC" },
  { id: "christmas", name: "Christmas Edition", currency: "coins", price: 3500, rarity: "RARE" },
  { id: "football", name: "Football Arena", currency: "gems", price: 70, rarity: "EPIC" },
  { id: "candy", name: "Candy Land", currency: "gems", price: 120, rarity: "LEGENDARY" },
];
const dice: Item[] = [
  { id: "classic", name: "Classic White", currency: "coins", price: 0, rarity: "COMMON" },
  { id: "golden", name: "Golden Dice", currency: "coins", price: 1500, rarity: "RARE" },
  { id: "crystal", name: "Crystal Blue", currency: "gems", price: 40, rarity: "EPIC" },
  { id: "fire", name: "Fire Dice", currency: "gems", price: 90, rarity: "LEGENDARY" },
  { id: "rainbow", name: "Rainbow Dice", currency: "gems", price: 70, rarity: "EPIC" },
  { id: "diamond", name: "Diamond Dice", currency: "gems", price: 120, rarity: "LEGENDARY" },
  { id: "skull", name: "Skull Dice", currency: "coins", price: 2000, rarity: "RARE" },
  { id: "sports", name: "Sports Dice", currency: "coins", price: 1000, rarity: "COMMON" },
];
const art: Record<string, string> = { classic: "🎲", golden: "👑", neon: "💡", beach: "🏖️", galaxy: "🌌", wood: "🪵", dragon: "🐉", christmas: "🎄", football: "⚽", candy: "🍬", crystal: "🔷", fire: "🔥", rainbow: "🌈", diamond: "💎", skull: "💀", sports: "🏀" };

export default function ShopPage() {
  const [tab, setTab] = useState<"boards" | "dice">("boards");
  const [ownedBoards, setOwnedBoards] = useState<string[]>(["classic"]);
  const [ownedDice, setOwnedDice] = useState<string[]>(["classic"]);
  const [equippedBoard, setEquippedBoard] = useState("classic");
  const [equippedDice, setEquippedDice] = useState("classic");
  const [coins, setCoins] = useState(0);
  const [gems, setGems] = useState(0);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  const load = async () => {
    try {
      const r = await fetch("/api/customization", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) { setNotice(d.error || "Sign in to use the customization shop."); return; }
      setCoins(d.coins); setGems(d.gems);
      setOwnedBoards(d.ownedBoards || ["classic"]); setOwnedDice(d.ownedDice || ["classic"]);
      setEquippedBoard(d.equippedBoard || "classic"); setEquippedDice(d.equippedDice || "classic");
    } catch { setNotice("Unable to load the shop right now."); }
  };
  useEffect(() => { load(); }, []);

  const action = async (type: "board" | "dice", id: string, actionName: "purchase" | "equip") => {
    setBusy(id + actionName); setNotice("");
    try {
      const r = await fetch("/api/customization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id, action: actionName }) });
      const d = await r.json();
      if (!r.ok) { setNotice(d.error || "Action failed."); return; }
      setNotice(actionName === "purchase" ? `${d.item?.name || "Item"} added to your collection.` : `${type === "board" ? "Board" : "Dice"} equipped.`);
      await load();
    } finally { setBusy(""); }
  };

  const items = tab === "boards" ? boards : dice;
  const owned = tab === "boards" ? ownedBoards : ownedDice;
  const equipped = tab === "boards" ? equippedBoard : equippedDice;

  return <AppFrame back="/dashboard">
    <main style={page}>
      <header style={header}><div><div style={eyebrow}>LUDO LIVE CUSTOMIZATION</div><h1 style={title}>Make every match yours.</h1><p style={sub}>Buy, equip and use your cosmetics in live rooms and bot games.</p></div><div style={wallet}>🪙 {coins.toLocaleString()} &nbsp; 💎 {gems.toLocaleString()}</div></header>
      <nav style={tabs}><button onClick={() => setTab("boards")} style={{ ...tabStyle, ...(tab === "boards" ? active : {}) }}>🎨 BOARDS</button><button onClick={() => setTab("dice")} style={{ ...tabStyle, ...(tab === "dice" ? active : {}) }}>🎲 DICE</button></nav>
      {notice && <div style={noticeBox}>{notice}</div>}
      <section style={hero}><div><h2 style={{ margin: 0 }}>{tab === "boards" ? "Game Boards" : "Dice Collection"}</h2><p style={sub}>{tab === "boards" ? "Your equipped board is shown to opponents when you host." : "Your equipped dice skin follows you into matches and bot games."}</p></div><div style={heroArt}>{art[equipped]}</div></section>
      <section style={grid}>{items.map((item) => { const isOwned = owned.includes(item.id); const isEquipped = equipped === item.id; return <article key={item.id} style={{ ...card, ...(isEquipped ? selected : {}) }}><div style={artBox}>{art[item.id]}</div><div style={rarity}>{item.rarity}</div><h3 style={name}>{item.name}</h3><div style={price}>{item.price === 0 ? "FREE" : `${item.currency === "coins" ? "🪙" : "💎"} ${item.price.toLocaleString()}`}</div>{isEquipped ? <button disabled style={{ ...button, background: "#16a34a" }}>✓ EQUIPPED</button> : isOwned ? <button disabled={!!busy} onClick={() => action(tab === "boards" ? "board" : "dice", item.id, "equip")} style={button}>{busy ? "…" : "EQUIP"}</button> : <button disabled={!!busy} onClick={() => action(tab === "boards" ? "board" : "dice", item.id, "purchase")} style={button}>{busy ? "…" : "BUY"}</button>}</article>; })}</section>
      <div style={banner}><b>YOUR STYLE, THEIR VIEW.</b><span>Host a room and your equipped board becomes the match board for everyone.</span></div>
    </main>
  </AppFrame>;
}

const page: React.CSSProperties = { maxWidth: 1100, width: "100%", margin: "0 auto", paddingBottom: 55 };
const header: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, marginBottom: 18, flexWrap: "wrap" };
const eyebrow: React.CSSProperties = { fontSize: 12, letterSpacing: 2, color: "#60a5fa", fontWeight: 900 };
const title: React.CSSProperties = { fontSize: "clamp(30px,6vw,50px)", margin: "5px 0", fontWeight: 950 };
const sub: React.CSSProperties = { color: "#9fb5d8", margin: "5px 0 0", fontSize: 15 };
const wallet: React.CSSProperties = { fontWeight: 900, color: "#f8d35a", fontSize: 17 };
const tabs: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 6, borderRadius: 16, background: "#06152f", border: "1px solid #193765", marginBottom: 16 };
const tabStyle: React.CSSProperties = { border: 0, borderRadius: 12, padding: "15px 10px", background: "transparent", color: "#cbd5e1", fontWeight: 900, cursor: "pointer" };
const active: React.CSSProperties = { background: "linear-gradient(135deg,#1769e8,#7c3aed)", color: "white" };
const noticeBox: React.CSSProperties = { padding: 13, borderRadius: 12, background: "#0b2348", border: "1px solid #27548d", color: "#bfdbfe", fontWeight: 700, marginBottom: 14 };
const hero: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: 20, borderRadius: 20, background: "linear-gradient(135deg,#071a3b,#0a2753)", border: "1px solid rgba(96,165,250,.28)", marginBottom: 16 };
const heroArt: React.CSSProperties = { fontSize: 64 };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 };
const card: React.CSSProperties = { minWidth: 0, borderRadius: 18, padding: 14, background: "linear-gradient(160deg,#0a2147,#06142d)", border: "1px solid rgba(75,115,178,.28)", display: "flex", flexDirection: "column", gap: 8 };
const selected: React.CSSProperties = { border: "2px solid #22c55e" };
const artBox: React.CSSProperties = { height: 140, borderRadius: 13, display: "grid", placeItems: "center", fontSize: 70, background: "radial-gradient(circle at 50% 35%,rgba(37,99,235,.45),rgba(4,15,35,.95) 70%)", border: "1px solid #244875" };
const rarity: React.CSSProperties = { fontSize: 9, fontWeight: 900, letterSpacing: 1.2, color: "#facc15" };
const name: React.CSSProperties = { margin: 0, fontSize: 17 };
const price: React.CSSProperties = { fontWeight: 900, color: "#f8d35a", minHeight: 22 };
const button: React.CSSProperties = { border: 0, borderRadius: 10, padding: "12px 10px", background: "linear-gradient(135deg,#1769e8,#7c3aed)", color: "white", fontWeight: 900, cursor: "pointer" };
const banner: React.CSSProperties = { marginTop: 18, padding: 18, borderRadius: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", background: "linear-gradient(90deg,#21114b,#082b50)", border: "1px solid rgba(168,85,247,.35)" };
