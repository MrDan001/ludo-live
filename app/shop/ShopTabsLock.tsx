"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import LudoBoard from "../_components/LudoBoard";

/** Theme-specific shop headers for every board, including the separately injected Midnight Live board. */
const BOARD_HEADERS: Record<string, { icon: string; kicker: string; title: string; subtitle: string; accent: string }> = {
  classic: { icon: "♟️", kicker: "TIMELESS", title: "Classic Ludo", subtitle: "Pure • Original • Classic", accent: "#f5c84b" },
  golden: { icon: "👑", kicker: "ROYAL COLLECTION", title: "Golden Royal", subtitle: "Gold • Prestige • Royal", accent: "#f4c542" },
  neon: { icon: "⚡", kicker: "AFTER DARK", title: "Neon Glow", subtitle: "Electric • Neon • Futuristic", accent: "#35eaff" },
  beach: { icon: "🌴", kicker: "TROPICAL ESCAPE", title: "Beach Vibes", subtitle: "Sun • Sand • Ocean", accent: "#63d7e8" },
  galaxy: { icon: "🌌", kicker: "DEEP SPACE", title: "Galaxy Space", subtitle: "Stars • Cosmos • Infinity", accent: "#a9c9ff" },
  wood: { icon: "🪵", kicker: "NATURAL CLASSIC", title: "Wooden Classic", subtitle: "Timber • Warmth • Heritage", accent: "#d49a5b" },
  dragon: { icon: "🐉", kicker: "LEGENDARY REALM", title: "Dragon Theme", subtitle: "Fire • Power • Legend", accent: "#e7b94d" },
  christmas: { icon: "🎄", kicker: "HOLIDAY EDITION", title: "Christmas Edition", subtitle: "Festive • Snow • Cheer", accent: "#e8d15d" },
  football: { icon: "⚽", kicker: "MATCH DAY", title: "Football Arena", subtitle: "Pitch • Goals • Glory", accent: "#72dc8d" },
  candy: { icon: "🍭", kicker: "SWEET WORLD", title: "Candy Land", subtitle: "Sweet • Colorful • Playful", accent: "#ff9fd0" },
  marble: { icon: "💎", kicker: "LUXE COLLECTION", title: "Marble Luxe", subtitle: "Polished • Elegant • Premium", accent: "#e8c875" },
  nature: { icon: "🌿", kicker: "WILD & NATURAL", title: "Nature Wood", subtitle: "Forest • Earth • Calm", accent: "#a8d36a" },
  space: { icon: "🚀", kicker: "COSMIC FLIGHT", title: "Space Galaxy", subtitle: "Orbit • Stars • Adventure", accent: "#6bdcff" },
  crystal: { icon: "❄️", kicker: "FROZEN COLLECTION", title: "Crystal Ice", subtitle: "Ice • Crystal • Frost", accent: "#a7e8ff" },
  fireice: { icon: "🔥❄️", kicker: "ELEMENTAL", title: "Fire & Ice", subtitle: "Flame • Frost • Contrast", accent: "#f2b94b" },
  jungle: { icon: "🌿", kicker: "WILD ADVENTURE", title: "Jungle Quest", subtitle: "Jungle • Quest • Discovery", accent: "#91bd52" },
  love: { icon: "💗", kicker: "HEART COLLECTION", title: "Love Edition", subtitle: "Hearts • Romance • Pink", accent: "#ff78ae" },
  night: { icon: "🌙", kicker: "CITY AFTER DARK", title: "Night City", subtitle: "Midnight • Lights • Mystery", accent: "#7fb4ff" },
  arabian: { icon: "🏜️", kicker: "ROYAL DESERT", title: "Arabian Palace", subtitle: "Desert • Gold • Palace", accent: "#e0b557" },
  "midnight-live": { icon: "🌃", kicker: "LUDO LIVE EXCLUSIVE", title: "Midnight Live", subtitle: "Midnight • Live • Electric", accent: "#66b8ff" },
};

const HEADER_STYLE_ID = "ludo-board-shop-theme-headers";

function installThemeHeaders(root: HTMLElement) {
  const grid = root.querySelector<HTMLElement>(".board-grid");
  if (!grid) return;

  grid.querySelectorAll<HTMLElement>(".shop-card").forEach((card) => {
    if (card.dataset.themeHeaderReady === "true") return;
    const board = card.querySelector<HTMLElement>(".shared-ludo-board");
    if (!board) return;
    const themeClass = Array.from(board.classList).find((name) => name.startsWith("theme-"));
    const theme = themeClass?.replace("theme-", "") || "";
    const meta = BOARD_HEADERS[theme];
    if (!meta) return;

    const header = document.createElement("div");
    header.className = "board-theme-header";
    header.style.setProperty("--theme-accent", meta.accent);
    header.innerHTML = `<span class="board-theme-icon">${meta.icon}</span><span class="board-theme-copy"><b>${meta.kicker}</b><strong>${meta.title}</strong><small>${meta.subtitle}</small></span>`;
    card.prepend(header);
    card.dataset.themeHeaderReady = "true";
  });
}

function installHeaderStyles() {
  if (document.getElementById(HEADER_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HEADER_STYLE_ID;
  style.textContent = `
    .board-theme-header{display:flex;align-items:center;gap:7px;min-height:48px;padding:6px 6px 7px;margin:-1px -1px 7px;border-radius:10px;background:linear-gradient(135deg,rgba(12,35,70,.98),rgba(5,18,39,.98));border:1px solid color-mix(in srgb,var(--theme-accent) 45%,#24466e);box-shadow:inset 0 0 14px color-mix(in srgb,var(--theme-accent) 8%,transparent)}
    .board-theme-icon{width:28px;height:28px;flex:0 0 28px;display:grid;place-items:center;border-radius:8px;background:color-mix(in srgb,var(--theme-accent) 16%,#071b38);border:1px solid color-mix(in srgb,var(--theme-accent) 42%,#24466e);font-size:16px}
    .board-theme-copy{min-width:0;display:grid;line-height:1.05}
    .board-theme-copy b{font-size:6.5px;letter-spacing:1px;color:var(--theme-accent);font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .board-theme-copy strong{font-size:10px;color:#fff;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
    .board-theme-copy small{font-size:6.5px;color:#9fb5d8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}
    .midnight-live-card .board-theme-header{margin-bottom:7px}
    @media(max-width:760px){.board-theme-header{min-height:46px;padding:5px}.board-theme-copy b{font-size:6px}.board-theme-copy strong{font-size:9px}.board-theme-copy small{font-size:6px}}
  `;
  document.head.appendChild(style);
}

export default function ShopTabsLock() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [owned, setOwned] = useState(false);
  const [equipped, setEquipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [active, setActive] = useState("Boards");

  const load = async () => {
    try {
      const r = await fetch("/api/customization", { cache: "no-store" });
      const d = await r.json();
      if (r.ok) {
        setOwned((d.ownedBoards || []).includes("midnight-live"));
        setEquipped(d.equippedBoard === "midnight-live");
      }
    } catch {}
  };

  useEffect(() => {
    installHeaderStyles();
    const sync = () => {
      const root = document.querySelector<HTMLElement>(".shop-page");
      if (!root) return;
      const activeButton = root.querySelector<HTMLElement>(".category-tabs button.active");
      const label = activeButton?.querySelector("span")?.textContent?.trim() || "";
      setActive(label);
      const sections = Array.from(root.querySelectorAll<HTMLElement>(".collection-section"));
      sections.forEach((section) => {
        const isDiceSection = section.classList.contains("dice-section");
        const visible = label === "Boards" ? !isDiceSection : label === "Dice" ? isDiceSection : false;
        section.style.display = visible ? "block" : "none";
      });
      installThemeHeaders(root);
      setTarget(root.querySelector<HTMLElement>(".board-grid"));
    };
    sync();
    load();
    const observer = new MutationObserver(sync);
    const root = document.querySelector(".shop-page");
    if (root) observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const action = async (kind: "purchase" | "equip") => {
    setBusy(true); setNotice("");
    try {
      const r = await fetch("/api/customization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "board", id: "midnight-live", action: kind }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Unable to update skin.");
      await load();
      setNotice(kind === "purchase" ? "Midnight Live purchased." : "Midnight Live equipped.");
      window.dispatchEvent(new Event("ludo-wallet-updated"));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to update skin.");
    } finally { setBusy(false); }
  };

  if (!target || active !== "Boards") return null;
  return createPortal(
    <article className="shop-card midnight-live-card" style={{ marginTop: 0, border: "1px solid #2b7cff", background: "linear-gradient(145deg,#06122a,#0b2550)", boxShadow: "0 0 26px rgba(35,126,255,.28)" }}>
      <div className="card-art board-art"><LudoBoard theme="night" preview /></div>
      <div className="rarity" style={{ color: "#66b8ff" }}>LEGENDARY</div>
      <h3 style={{ color: "#fff" }}>Midnight Live</h3>
      <div className="price" style={{ color: "#8bc5ff" }}>💎 130</div>
      {equipped ? <button className="action equipped" disabled>✓ EQUIPPED</button> : owned ? <button className="action" disabled={busy} onClick={() => action("equip")}>{busy ? "…" : "EQUIP"}</button> : <button className="action" disabled={busy} onClick={() => action("purchase")}>{busy ? "…" : "BUY · 130 GEMS"}</button>}
      {notice && <p style={{ margin: "8px 0 0", color: "#b9d8ff", fontSize: 12 }}>{notice}</p>}
    </article>,
    target
  );
}
