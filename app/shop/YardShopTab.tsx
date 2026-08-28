"use client";

import { useEffect } from "react";

const YARD_IDS = new Set([
  "yard-classic",
  "yard-inferno",
  "yard-galaxy",
  "yard-royal",
  "yard-ocean",
  "yard-sakura",
  "yard-shadow",
  "yard-neon",
]);

function isYardCard(card: HTMLElement) {
  const title = card.querySelector("h3")?.textContent?.trim().toLowerCase() || "";
  return ["classic yard", "inferno yard", "galaxy yard", "royal yard", "ocean yard", "sakura yard", "shadow yard", "neon yard"].includes(title);
}

export default function YardShopTab() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".shop-page");
    if (!root) return;
    const tabs = root.querySelector<HTMLElement>(".category-tabs");
    if (!tabs || tabs.querySelector(".yard-shop-tab")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "yard-shop-tab";
    button.innerHTML = "<span aria-hidden=\"true\">🏠</span><span>Yards</span>";
    button.addEventListener("click", () => {
      tabs.querySelector<HTMLButtonElement>('button span')?.closest("button")?.click();
      tabs.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      button.classList.add("active");
      const simpleGrid = root.querySelector<HTMLElement>(".simple-grid");
      if (simpleGrid) {
        simpleGrid.style.display = "grid";
        simpleGrid.querySelectorAll<HTMLElement>(".simple-card").forEach(card => {
          card.style.display = isYardCard(card) ? "" : "none";
        });
      }
      root.querySelectorAll<HTMLElement>(".collection-section, .simple-grid").forEach(section => {
        if (section !== simpleGrid) section.style.display = "none";
      });
    });
    tabs.appendChild(button);

    const style = document.createElement("style");
    style.id = "ludo-yard-shop-tab-style";
    style.textContent = `.yard-shop-tab{position:relative}.yard-shop-tab.active{color:#fff;background:linear-gradient(135deg,#183c70,#0d274d);border-color:#4f9cff;box-shadow:0 0 14px rgba(79,156,255,.28)}.yard-shop-tab span:first-child{font-size:15px}`;
    if (!document.getElementById(style.id)) document.head.appendChild(style);

    const observer = new MutationObserver(() => {
      const simpleGrid = root.querySelector<HTMLElement>(".simple-grid");
      if (!button.classList.contains("active") || !simpleGrid) return;
      simpleGrid.querySelectorAll<HTMLElement>(".simple-card").forEach(card => { card.style.display = isYardCard(card) ? "" : "none"; });
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => { observer.disconnect(); button.remove(); style.remove(); };
  }, []);

  return null;
}
