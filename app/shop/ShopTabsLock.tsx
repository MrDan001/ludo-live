"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import LudoBoard from "../_components/LudoBoard";

/**
 * Keeps Board and Dice collections on their own tabs and adds the new
 * Midnight Live board without changing the large Shop page implementation.
 * Midnight Live uses the existing night board renderer as its visual base,
 * while its catalog id/price are handled by the customization API.
 */
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
