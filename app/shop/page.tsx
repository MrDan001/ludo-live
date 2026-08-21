"use client";

import { useEffect, useMemo, useState } from "react";
import AppFrame from "../_components/AppFrame";
import LudoBoard, { BoardThemeId } from "../_components/LudoBoard";
import LudoDice, { DiceSkinId } from "../_components/LudoDice";

type MainTab = "Coins" | "Gems" | "Items" | "Avatars" | "Boards" | "Dice";
type Wallet = { coins: number; gems: number; spins: number; mystery: number };
type Purchase = { id: string; name: string; price: number; kind: "coins" | "item" | "avatar"; quantity?: number };
type Custom = { id: string; name: string; currency: "coins" | "gems"; price: number; rarity: string };

const tabs: MainTab[] = ["Coins", "Gems", "Items", "Avatars", "Boards", "Dice"];
const defaults: Wallet = { coins: 25680, gems: 320, spins: 0, mystery: 0 };

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

const boards: Custom[] = [
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

const dice: Custom[] = [
  { id: "classic", name: "Classic White", currency: "coins", price: 0, rarity: "COMMON" },
  { id: "golden", name: "Golden Dice", currency: "coins", price: 1500, rarity: "RARE" },
  { id: "crystal", name: "Crystal Blue", currency: "gems", price: 40, rarity: "EPIC" },
  { id: "fire", name: "Fire Dice", currency: "gems", price: 90, rarity: "LEGENDARY" },
  { id: "rainbow", name: "Rainbow Dice", currency: "gems", price: 70, rarity: "EPIC" },
  { id: "diamond", name: "Diamond Dice", currency: "gems", price: 120, rarity: "LEGENDARY" },
  { id: "skull", name: "Skull Dice", currency: "coins", price: 2000, rarity: "RARE" },
  { id: "sports", name: "Sports Dice", currency: "coins", price: 1000, rarity: "COMMON" },
];

function naira(v: number) { return `₦${v.toLocaleString("en-NG")}`; }

export default function ShopPage() {
  const [tab, setTab] = useState<MainTab>("Boards");
  const [wallet, setWallet] = useState(defaults);
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [pending, setPending] = useState<(typeof gemPackages)[number] | null>(null);
  const [confirm, setConfirm] = useState<Purchase | null>(null);
  const [busy, setBusy] = useState(false);
  const [owned, setOwned] = useState<string[]>([]);
  const [ownedBoards, setOwnedBoards] = useState<string[]>(["classic"]);
  const [ownedDice, setOwnedDice] = useState<string[]>(["classic"]);
  const [equippedBoard, setEquippedBoard] = useState("classic");
  const [equippedDice, setEquippedDice] = useState("classic");
  const [customBusy, setCustomBusy] = useState("");

  const loadWallet = async () => {
    try {
      const r = await fetch("/api/wallet", { cache: "no-store" });
      const d = await r.json();
      if (r.ok && d.wallet) setWallet((w) => ({ ...w, coins: Number(d.wallet.coins) || 0, gems: Number(d.wallet.gems) || 0 }));
    } catch {}
  };

  const loadCustom = async () => {
    try {
      const r = await fetch("/api/customization", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) { setNotice(d.error || "Sign in to use boards and dice."); return; }
      setOwnedBoards(d.ownedBoards || ["classic"]);
      setOwnedDice(d.ownedDice || ["classic"]);
      setEquippedBoard(d.equippedBoard || "classic");
      setEquippedDice(d.equippedDice || "classic");
    } catch { setNotice("Unable to load customization right now."); }
  };

  useEffect(() => {
    loadWallet();
    const sync = () => loadWallet();
    window.addEventListener("focus", sync);
    window.addEventListener("ludo-wallet-updated", sync);
    try {
      setEmail(localStorage.getItem("ludo-paystack-email") || "");
      setOwned(JSON.parse(localStorage.getItem("ludo-inventory") || "[]"));
    } catch {}
    loadCustom();
    return () => { window.removeEventListener("focus", sync); window.removeEventListener("ludo-wallet-updated", sync); };
  }, []);

  const buyGem = async () => {
    if (!pending || !email.trim()) return;
    setBusy(true);
    try {
      localStorage.setItem("ludo-paystack-email", email.trim());
      const r = await fetch("/api/paystack/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId: pending.id, email: email.trim() }) });
      const d = await r.json();
      if (!r.ok || !d.authorization_url) throw new Error(d.error || "Unable to start payment.");
      location.href = d.authorization_url;
    } catch (e) { setNotice(e instanceof Error ? e.message : "Unable to start payment."); setBusy(false); }
  };

  const confirmPurchase = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const r = await fetch("/api/shop/purchase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: confirm.id, type: confirm.kind === "coins" ? "coin_package" : confirm.kind, costGems: confirm.kind === "coins" ? confirm.price : undefined, quantity: confirm.quantity || 0 }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Purchase failed");
      setWallet((w) => ({ ...w, coins: Number(d.coins) || 0, gems: Number(d.gems) || 0 }));
      window.dispatchEvent(new Event("ludo-wallet-updated"));
      setConfirm(null);
      setNotice(`${confirm.name} purchased successfully.`);
    } catch (e) { setNotice(e instanceof Error ? e.message : "Unable to complete purchase"); }
    finally { setBusy(false); }
  };

  const customAction = async (type: "board" | "dice", id: string, action: "purchase" | "equip") => {
    setCustomBusy(id + action); setNotice("");
    try {
      const r = await fetch("/api/customization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id, action }) });
      const d = await r.json();
      if (!r.ok) { setNotice(d.error || "Action failed."); return; }
      setNotice(action === "purchase" ? `${d.item?.name || "Customization"} added to your collection.` : `${type === "board" ? "Board" : "Dice"} equipped.`);
      await loadCustom(); await loadWallet();
    } finally { setCustomBusy(""); }
  };

  const balanceText = useMemo(() => `${wallet.coins.toLocaleString()} 🪙   ${wallet.gems.toLocaleString()} 💎`, [wallet]);

  const renderBoardCard = (item: Custom) => {
    const ownedItem = ownedBoards.includes(item.id);
    const equipped = equippedBoard === item.id;
    return <article className={`shop-card ${equipped ? "is-equipped" : ""}`} key={item.id}>
      <div className="card-art board-art"><LudoBoard theme={item.id as BoardThemeId} preview /></div>
      <div className="rarity">{item.rarity}</div>
      <h3>{item.name}</h3>
      <div className="price">{item.price === 0 ? "FREE" : `${item.currency === "coins" ? "🪙" : "💎"} ${item.price.toLocaleString()}`}</div>
      {equipped ? <button className="action equipped" disabled>✓ EQUIPPED</button> : ownedItem ? <button className="action" disabled={!!customBusy} onClick={() => customAction("board", item.id, "equip")}>{customBusy ? "…" : "EQUIP"}</button> : <button className="action" disabled={!!customBusy} onClick={() => customAction("board", item.id, "purchase")}>{customBusy ? "…" : "BUY"}</button>}
    </article>;
  };

  const renderDiceCard = (item: Custom) => {
    const ownedItem = ownedDice.includes(item.id);
    const equipped = equippedDice === item.id;
    return <article className={`shop-card dice-card ${equipped ? "is-equipped" : ""}`} key={item.id}>
      <div className="card-art dice-art"><LudoDice skin={item.id as DiceSkinId} value={6} size={78} /></div>
      <h3>{item.name}</h3>
      <div className="price">{item.price === 0 ? "FREE" : `${item.currency === "coins" ? "🪙" : "💎"} ${item.price.toLocaleString()}`}</div>
      {equipped ? <button className="action equipped" disabled>✓ EQUIPPED</button> : ownedItem ? <button className="action" disabled={!!customBusy} onClick={() => customAction("dice", item.id, "equip")}>{customBusy ? "…" : "EQUIP"}</button> : <button className="action" disabled={!!customBusy} onClick={() => customAction("dice", item.id, "purchase")}>{customBusy ? "…" : "BUY"}</button>}
    </article>;
  };

  return <AppFrame back="/home">
    <style>{styles}</style>
    <main className="shop-page">
      <header className="shop-header">
        <div className="brand-block"><div className="brand-mark">🎲</div><div><div className="brand-name">LUDO LIVE <span>♛</span></div><div className="brand-tag">PLAY. CONNECT. WIN.</div></div></div>
        <div className="wallet-strip"><span>🪙 {wallet.coins.toLocaleString()}</span><span>💎 {wallet.gems.toLocaleString()}</span></div>
        <div className="header-actions"><button aria-label="Shop">🛒<small>Shop</small></button><button aria-label="Profile">👤<small>Profile</small></button><button aria-label="Settings">⚙️<small>Settings</small></button></div>
      </header>

      <nav className="category-tabs" aria-label="Shop categories">
        {tabs.map((t) => <button key={t} onClick={() => setTab(t)} className={tab === t ? "active" : ""}>{t === "Boards" ? "🎨" : t === "Dice" ? "🎲" : t === "Avatars" ? "👤" : t === "Items" ? "🎒" : t === "Coins" ? "🪙" : "💎"}<span>{t}</span></button>)}
      </nav>

      {notice && <div className="notice">{notice}</div>}

      {(tab === "Boards" || tab === "Dice") && <>
        <section className="collection-section">
          <div className="section-heading"><div><div className="section-icon">🎨</div><div><h2>Game Boards</h2><p>Choose a board that matches your style.</p></div></div><strong>Different boards, same locked play pattern.</strong></div>
          <div className="lock-note">🔒 Every skin above uses the same locked Ludo board geometry, path, safe squares and movement rules. The skin changes visuals only.</div>
          <div className="board-grid">{boards.map(renderBoardCard)}</div>
        </section>

        <section className="collection-section dice-section">
          <div className="section-heading"><div><div className="section-icon">🎲</div><div><h2>Dice Skins</h2><p>Roll in style.</p></div></div><strong>Small change, big style.</strong></div>
          <div className="dice-grid">{dice.map(renderDiceCard)}</div>
        </section>

        <div className="style-banner"><span>♛</span><div><b>EXPRESS YOUR STYLE</b><small>BOARDS • DICE • TOKENS • THEMES</small></div><span>🎲 🎨</span></div>
      </>}

      {tab === "Coins" && <PackageSection title="🪙 Coins" subtitle="Use gems to stock up on coins." items={coinPackages.map((p) => ({ id: p.id, label: `${p.coins.toLocaleString()} Coins`, price: `💎 ${p.gems}`, onClick: () => setConfirm({ id: p.id, name: `${p.coins.toLocaleString()} Coins`, price: p.gems, quantity: p.coins, kind: "coins" }) }))} />}
      {tab === "Gems" && <PackageSection title="💎 Gems" subtitle="Buy gems securely through Paystack." items={gemPackages.map((p) => ({ id: p.id, label: `${p.gems.toLocaleString()} Gems`, price: naira(p.naira), onClick: () => { setPending(p); setEmailOpen(true); } }))} />}
      {tab === "Items" && <section className="simple-grid">{items.map((item) => { const o = owned.includes(item.id); return <article className="simple-card" key={item.id}><div className="simple-icon">{item.icon}</div><h3>{item.name}</h3><p>{item.description}</p><button className="action" disabled={o || busy} onClick={() => setConfirm({ id: item.id, name: item.name, price: 500, kind: "item" })}>{o ? "OWNED" : "💎 500"}</button></article>; })}</section>}
      {tab === "Avatars" && <section className="simple-grid avatar-grid">{avatars.map((avatar) => { const o = owned.includes(avatar.id); return <article className="simple-card" key={avatar.id}><div className="simple-icon avatar-icon">{avatar.icon}</div><h3>{avatar.name}</h3><button className="action" disabled={o || busy} onClick={() => setConfirm({ id: avatar.id, name: avatar.name, price: avatar.price, kind: "avatar" })}>{o ? "OWNED" : `💎 ${avatar.price}`}</button></article>; })}</section>}

      {emailOpen && pending && <div className="overlay"><div className="modal"><h2>Buy {pending.gems} Gems</h2><p>Pay {naira(pending.naira)} securely through Paystack.</p><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" /><div className="modal-actions"><button className="cancel" onClick={() => setEmailOpen(false)}>CANCEL</button><button className="action" onClick={buyGem} disabled={busy || !email.trim()}>{busy ? "OPENING…" : "PAY WITH PAYSTACK"}</button></div></div></div>}
      {confirm && <div className="overlay"><div className="modal"><h2>Confirm purchase</h2><p>Buy <b>{confirm.name}</b> for <b>{confirm.price} gems</b>?</p><div className="modal-balance">Current balance: {wallet.gems.toLocaleString()} gems</div><div className="modal-actions"><button className="cancel" onClick={() => setConfirm(null)}>CANCEL</button><button className="action" onClick={confirmPurchase} disabled={busy}>{busy ? "PROCESSING…" : "CONFIRM PURCHASE"}</button></div></div></div>}
    </main>
  </AppFrame>;
}

function PackageSection({ title, subtitle, items }: { title: string; subtitle: string; items: { id: string; label: string; price: string; onClick: () => void }[] }) {
  return <section className="package-section"><div className="package-heading"><h2>{title}</h2><p>{subtitle}</p></div><div className="package-grid">{items.map((item) => <article className="package-card" key={item.id}><strong>{item.label}</strong><button className="action" onClick={item.onClick}>{item.price}</button></article>)}</div></section>;
}

const styles = `
.shop-page{width:100%;max-width:1180px;margin:0 auto;padding:8px 14px 70px;box-sizing:border-box;color:#f8fbff}.shop-header{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:18px;padding:8px 4px 14px}.brand-block{display:flex;align-items:center;gap:10px}.brand-mark{font-size:42px;line-height:1}.brand-name{font-size:28px;font-weight:950;font-style:italic;letter-spacing:.5px}.brand-name span{color:#f5c84b}.brand-tag{font-size:10px;letter-spacing:2px;color:#b9c9e4}.wallet-strip{display:flex;gap:10px}.wallet-strip span{min-width:110px;padding:10px 14px;border:1px solid #72551a;border-radius:22px;background:#071b39;color:#fff;font-weight:900;text-align:center;box-shadow:0 0 18px rgba(30,100,255,.12)}.wallet-strip span:first-child{border-color:#6d5520;color:#ffd85a}.wallet-strip span:last-child{border-color:#2c6fc5;color:#8ed1ff}.header-actions{display:flex;gap:4px}.header-actions button{border:0;background:transparent;color:#dce8fb;display:grid;place-items:center;gap:2px;font-size:22px;min-width:58px}.header-actions small{font-size:10px;font-weight:800}.category-tabs{display:flex;gap:8px;padding:5px;margin:2px 0 16px;border:1px solid #173e70;border-radius:18px;background:#061735;overflow-x:auto;scrollbar-width:none}.category-tabs::-webkit-scrollbar{display:none}.category-tabs button{flex:1 0 108px;border:0;border-radius:14px;padding:12px 10px;background:#082044;color:#e9f2ff;font-weight:900;display:flex;justify-content:center;align-items:center;gap:7px;cursor:pointer;white-space:nowrap}.category-tabs button.active{background:linear-gradient(135deg,#0e79ff,#7037ee);box-shadow:0 0 18px rgba(40,112,255,.35)}.notice,.lock-note{padding:12px 14px;border-radius:12px;margin:0 0 14px;background:#09234b;border:1px solid #24548f;color:#c9dcf7;font-size:13px}.collection-section,.package-section{border:1px solid #1c477e;border-radius:20px;background:linear-gradient(180deg,#071d3d,#061731);padding:16px;margin-bottom:16px;box-shadow:0 10px 30px rgba(0,0,0,.12)}.section-heading{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-bottom:12px}.section-heading>div{display:flex;gap:12px;align-items:center}.section-icon{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#0d6eea,#1b4fff);font-size:24px}.section-heading h2,.package-heading h2{margin:0;font-size:24px}.section-heading p,.package-heading p{margin:3px 0 0;color:#9fb5d8;font-size:13px}.section-heading>strong{color:#f6ce52;font-style:italic;font-size:16px}.lock-note{margin-top:0;border-color:#2b5d91;background:#061a35}.board-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.dice-grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px}.shop-card{min-width:0;padding:8px;border-radius:15px;border:1px solid #24466e;background:#071b38;box-sizing:border-box;transition:transform .15s,border-color .15s}.shop-card.is-equipped{border:2px solid #16d36d;box-shadow:0 0 16px rgba(22,211,109,.12)}.shop-card h3{margin:7px 2px 3px;font-size:14px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card-art{border-radius:11px;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle,#174f96,#06142d);height:130px}.board-art>div{width:100%;height:100%;display:grid;place-items:center}.board-art svg,.board-art canvas{max-width:100%;max-height:100%}.dice-art{height:100px}.rarity{font-size:8px;letter-spacing:1px;color:#f4cf34;font-weight:950;margin-top:7px}.price{font-size:13px;color:#ffd55a;font-weight:950;margin:3px 2px 8px}.action{width:100%;border:0;border-radius:10px;padding:9px 8px;background:linear-gradient(135deg,#1769e8,#7538ed);color:#fff;font-weight:950;cursor:pointer}.action:disabled{cursor:default;opacity:.72}.action.equipped{background:#16a34a}.dice-card h3{text-align:center}.dice-card .price{text-align:center}.style-banner{display:flex;justify-content:center;align-items:center;gap:18px;border:1px solid #7b5b20;border-radius:18px;padding:12px 18px;margin:4px 0 18px;background:linear-gradient(90deg,#0a1d3b,#18233d,#0a1d3b);box-shadow:0 0 20px rgba(245,190,60,.08);color:#f7cc4e}.style-banner>span{font-size:25px}.style-banner b{display:block;text-align:center;letter-spacing:2px}.style-banner small{display:block;color:#dbe6f8;text-align:center;letter-spacing:1.5px;margin-top:3px}.package-heading{margin-bottom:12px}.package-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.package-card,.simple-card{padding:15px;border-radius:16px;background:#071b38;border:1px solid #24466e}.package-card{display:flex;justify-content:space-between;align-items:center;gap:12px}.package-card .action{width:auto;min-width:100px}.simple-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.simple-card{text-align:center}.simple-icon{font-size:48px;margin-bottom:7px}.avatar-icon{font-size:52px}.simple-card h3{margin:5px 0 10px}.simple-card p{color:#9fb5d8;font-size:12px;min-height:30px}.overlay{position:fixed;inset:0;background:rgba(0,4,14,.78);display:grid;place-items:center;padding:18px;z-index:100}.modal{width:min(460px,100%);padding:22px;border-radius:20px;background:#081b38;border:1px solid #315789;box-shadow:0 20px 70px rgba(0,0,0,.5)}.modal h2{margin:0 0 8px}.modal p{color:#b8c9e3}.modal input{width:100%;box-sizing:border-box;padding:13px;border-radius:10px;border:1px solid #315789;background:#06142d;color:#fff;margin:10px 0 15px}.modal-actions{display:flex;justify-content:flex-end;gap:10px}.modal-actions .action,.cancel{width:auto}.cancel{border:0;border-radius:10px;padding:10px 14px;background:#334155;color:#fff;font-weight:900}.modal-balance{color:#ffd55a;font-weight:900;margin-bottom:14px}
@media(max-width:1050px){.board-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.dice-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:760px){.shop-page{padding:4px 10px 58px}.shop-header{grid-template-columns:1fr auto;gap:8px}.brand-mark{font-size:34px}.brand-name{font-size:21px}.brand-tag{font-size:8px;letter-spacing:1.4px}.wallet-strip{grid-column:1/-1;grid-row:2;justify-content:stretch}.wallet-strip span{flex:1;min-width:0;font-size:13px;padding:8px 6px}.header-actions{display:none}.category-tabs{margin-bottom:12px}.category-tabs button{flex:0 0 auto;min-width:82px;padding:10px 9px;font-size:11px}.category-tabs button span{display:inline}.collection-section{padding:10px;border-radius:16px}.section-heading{align-items:flex-start}.section-heading>strong{font-size:10px;text-align:right;max-width:130px}.section-icon{width:38px;height:38px;font-size:20px}.section-heading h2,.package-heading h2{font-size:20px}.section-heading p,.package-heading p{font-size:11px}.lock-note{font-size:11px}.board-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.dice-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.shop-card{padding:7px;border-radius:13px}.card-art{height:132px}.dice-art{height:120px}.shop-card h3{font-size:13px}.price{font-size:12px}.action{padding:9px 6px;font-size:11px}.style-banner{gap:8px;padding:10px 7px}.style-banner>span{font-size:19px}.style-banner b{font-size:11px}.style-banner small{font-size:7px}.package-grid,.simple-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.package-card{display:grid;gap:10px;text-align:center}.package-card .action{width:100%}.simple-card{padding:10px}.simple-icon{font-size:38px}.avatar-icon{font-size:42px}}
@media(max-width:390px){.brand-name{font-size:18px}.brand-mark{font-size:29px}.category-tabs button{min-width:76px;padding:9px 7px;font-size:10px}.card-art{height:118px}.dice-art{height:108px}.shop-card h3{font-size:12px}.rarity{font-size:7px}.price{font-size:11px}.action{font-size:10px;padding:8px 5px}}
`;
