"use client";

import { useCallback, useEffect } from "react";

async function readState() {
  const r = await fetch("/api/customization", { cache: "no-store" });
  if (!r.ok) return null;
  return r.json();
}

function findCard(root: HTMLElement, name: string) {
  return [...root.querySelectorAll<HTMLElement>(".shop-card,.simple-card")].find((card) => card.querySelector("h3")?.textContent?.trim() === name) || null;
}

function money(currency: string, price: number) {
  if (currency === "naira") return `₦${Number(price).toLocaleString("en-NG")}`;
  return `${currency === "coins" ? "🪙" : "💎"} ${Number(price).toLocaleString()}`;
}

export default function ShopInventorySync() {
  const sync = useCallback(async () => {
    const root = document.querySelector<HTMLElement>(".shop-page");
    if (!root) return;
    const state = await readState().catch(() => null);
    if (!state) return;

    const all = [
      ...(state.boards || []).map((x:any) => ({ ...x, type: "board" })),
      ...(state.dice || []).map((x:any) => ({ ...x, type: "dice" })),
      ...(state.avatars || []).map((x:any) => ({ ...x, type: "avatar" })),
      ...(state.items || []).map((x:any) => ({ ...x, type: "item" })),
    ];

    all.forEach((item:any) => {
      const card = findCard(root, item.name);
      if (!card) return;
      const price = card.querySelector<HTMLElement>(".price");
      if (price) price.textContent = Number(item.price) === 0 ? "FREE" : money(item.currency, Number(item.price));

      const owned = (item.type === "board" ? state.ownedBoards : item.type === "dice" ? state.ownedDice : item.type === "avatar" ? state.ownedAvatars : state.ownedItems) || [];
      const equipped = item.type === "board" ? state.equippedBoard === item.id : item.type === "dice" ? state.equippedDice === item.id : item.type === "avatar" ? state.equippedAvatar === item.id : (state.equippedItems || []).includes(item.id);
      const old = card.querySelector<HTMLButtonElement>("button.action");
      if (!old) return;

      if (equipped) {
        old.disabled = true;
        old.textContent = "✓ EQUIPPED";
        return;
      }

      if (owned.includes(item.id)) {
        if (old.dataset.inventorySync !== `equip:${item.type}:${item.id}`) {
          const button = old.cloneNode(true) as HTMLButtonElement;
          button.dataset.inventorySync = `equip:${item.type}:${item.id}`;
          button.disabled = false;
          button.textContent = "EQUIP";
          button.onclick = async () => {
            button.disabled = true;
            button.textContent = "…";
            try {
              const r = await fetch("/api/customization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: item.type, id: item.id, action: "equip" }) });
              const d = await r.json();
              if (!r.ok) throw new Error(d.error || "Unable to equip.");
              window.dispatchEvent(new Event("ludo-wallet-updated"));
              await sync();
            } catch { button.disabled = false; button.textContent = "EQUIP"; }
          };
          old.replaceWith(button);
        }
        return;
      }

      if (item.currency === "naira" && old.dataset.inventorySync !== `naira:${item.type}:${item.id}:${item.price}`) {
        const button = old.cloneNode(true) as HTMLButtonElement;
        button.dataset.inventorySync = `naira:${item.type}:${item.id}:${item.price}`;
        button.disabled = false;
        button.textContent = `BUY • ₦${Number(item.price).toLocaleString("en-NG")}`;
        button.onclick = async () => {
          button.disabled = true;
          button.textContent = "Opening payment…";
          try {
            const r = await fetch("/api/paystack/shop-item", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: item.type, id: item.id }) });
            const d = await r.json();
            if (!r.ok || !d.authorization_url) throw new Error(d.error || "Unable to start payment.");
            window.location.href = d.authorization_url;
          } catch (e) {
            button.disabled = false;
            button.textContent = `BUY • ₦${Number(item.price).toLocaleString("en-NG")}`;
            alert(e instanceof Error ? e.message : "Unable to start payment.");
          }
        };
        old.replaceWith(button);
      }
    });
  }, []);

  useEffect(() => {
    let alive = true;
    const run = () => { if (alive) void sync(); };
    run();
    window.addEventListener("focus", run);
    window.addEventListener("ludo-wallet-updated", run);
    const observer = new MutationObserver(() => run());
    const root = document.querySelector(".shop-page");
    if (root) observer.observe(root, { subtree: true, childList: true });
    return () => { alive = false; window.removeEventListener("focus", run); window.removeEventListener("ludo-wallet-updated", run); observer.disconnect(); };
  }, [sync]);

  return null;
}
