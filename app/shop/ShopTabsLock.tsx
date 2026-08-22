"use client";

import { useEffect } from "react";

/**
 * Keeps Board and Dice collections on their own tabs.
 * The Shop page owns the real tab state; this component only synchronizes
 * visibility for the existing collection sections and never touches the game
 * board geometry or movement engine.
 */
export default function ShopTabsLock() {
  useEffect(() => {
    const sync = () => {
      const root = document.querySelector<HTMLElement>(".shop-page");
      if (!root) return;

      const active = root.querySelector<HTMLElement>(".category-tabs button.active");
      const activeLabel = active?.querySelector("span")?.textContent?.trim() || "";
      const sections = Array.from(root.querySelectorAll<HTMLElement>(".collection-section"));

      sections.forEach((section) => {
        const isDiceSection = section.classList.contains("dice-section");
        const visible = activeLabel === "Boards"
          ? !isDiceSection
          : activeLabel === "Dice"
            ? isDiceSection
            : false;
        section.style.display = visible ? "block" : "none";
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    const root = document.querySelector(".shop-page");
    if (root) observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
