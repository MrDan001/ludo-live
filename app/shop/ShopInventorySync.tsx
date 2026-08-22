"use client";

import { useCallback, useEffect } from "react";

const AVATARS = ["avatar-1","avatar-2","avatar-3","avatar-4","avatar-5","avatar-6"];
const ITEMS = ["golden-dice","shield","trail","crown"];

async function readState() {
  const r = await fetch("/api/customization", { cache: "no-store" });
  if (!r.ok) return null;
  return r.json();
}

function cardFor(root: HTMLElement, name: string) {
  return [...root.querySelectorAll<HTMLElement>(".shop-card")].find((card) => card.textContent?.includes(name)) || null;
}

export default function ShopInventorySync() {
  const sync = useCallback(async () => {
    const root = document.querySelector<HTMLElement>(".shop-page");
    if (!root) return;
    const state = await readState().catch(() => null);
    if (!state) return;

    const avatarNames = ["Avatar 1","Avatar 2","Avatar 3","Avatar 4","Avatar 5","Avatar 6"];
    const itemNames = ["Golden Dice","Shield","Trail","Crown"];
    const apply = (ids: string[], names: string[], owned: string[], equipped: string | string[], type: "avatar" | "item") => {
      ids.forEach((id, index) => {
        const card = cardFor(root, names[index]);
        if (!card || !owned.includes(id)) return;
        const old = card.querySelector<HTMLButtonElement>("button.action");
        if (!old) return;
        const isEquipped = type === "avatar" ? equipped === id : Array.isArray(equipped) && equipped.includes(id);
        if (old.dataset.inventorySync === `${type}:${id}:${isEquipped}`) return;
        const button = old.cloneNode(true) as HTMLButtonElement;
        button.dataset.inventorySync = `${type}:${id}:${isEquipped}`;
        button.disabled = isEquipped;
        button.textContent = isEquipped ? "✓ EQUIPPED" : "EQUIP";
        if (!isEquipped) {
          button.onclick = async () => {
            button.disabled = true;
            button.textContent = "…";
            try {
              const r = await fetch("/api/customization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id, action: "equip" }) });
              const d = await r.json();
              if (!r.ok) throw new Error(d.error || "Unable to equip.");
              window.dispatchEvent(new Event("ludo-wallet-updated"));
              await sync();
            } catch {
              button.disabled = false;
              button.textContent = "EQUIP";
            }
          };
        }
        old.replaceWith(button);
      });
    };

    apply(AVATARS, avatarNames, state.ownedAvatars || [], state.equippedAvatar || "default", "avatar");
    apply(ITEMS, itemNames, state.ownedItems || [], state.equippedItems || [], "item");
  }, []);

  useEffect(() => {
    let alive = true;
    const run = () => { if (alive) void sync(); };
    run();
    window.addEventListener("focus", run);
    window.addEventListener("ludo-wallet-updated", run);
    const observer = new MutationObserver(run);
    const root = document.querySelector(".shop-page");
    if (root) observer.observe(root, { subtree: true, childList: true });
    return () => { alive = false; window.removeEventListener("focus", run); window.removeEventListener("ludo-wallet-updated", run); observer.disconnect(); };
  }, [sync]);

  return null;
}
