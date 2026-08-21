"use client";

import { useEffect } from "react";

/**
 * Keeps the Board and Dice collections as separate Store tabs without
 * touching the board/game engine. The existing Shop page owns the tab state;
 * this component only presents the two collection sections one at a time.
 */
export default function ShopTabsLock() {
  useEffect(() => {
    const sync = () => {
      const root = document.querySelector<HTMLElement>(".shop-page");
      if (!root) return;

      const active = root.querySelector<HTMLElement>(".category-tabs button.active");
      const activeLabel = active?.textContent?.trim() || "";
      const sections = Array.from(root.querySelectorAll<HTMLElement>(".collection-section"));

      sections.forEach((section, index) => {
        if (activeLabel === "Boards") {
          section.style.display = index === 0 ? "block" : "none";
        } else if (activeLabel === "Dice") {
          section.style.display = index === 1 ? "block" : "none";
        } else {
          section.style.display = "none";
        }
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    const root = document.querySelector(".shop-page");
    if (root) observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return null;
}
