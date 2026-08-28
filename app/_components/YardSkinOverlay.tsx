"use client";

import { useEffect, useMemo, useState } from "react";

const SKINS: Record<string, { background: string; border: string; pattern: string }> = {
  "yard-inferno": { background: "radial-gradient(circle at 50% 45%, #ffb300 0%, #ef6c00 42%, #8e1b12 100%)", border: "rgba(255,220,120,.9)", pattern: "🔥" },
  "yard-galaxy": { background: "radial-gradient(circle at 30% 25%, #7c4dff 0%, #263b91 42%, #070b24 100%)", border: "rgba(190,180,255,.95)", pattern: "✦" },
  "yard-royal": { background: "radial-gradient(circle at 50% 35%, #fff1a8 0%, #d5a928 42%, #6f4a08 100%)", border: "rgba(255,244,177,.95)", pattern: "♛" },
  "yard-ocean": { background: "radial-gradient(circle at 40% 30%, #9eeaff 0%, #1687c8 45%, #06466f 100%)", border: "rgba(190,245,255,.95)", pattern: "≈" },
  "yard-sakura": { background: "radial-gradient(circle at 50% 30%, #ffd6e8 0%, #e989b5 48%, #7e315d 100%)", border: "rgba(255,230,241,.95)", pattern: "✿" },
  "yard-shadow": { background: "radial-gradient(circle at 45% 35%, #5a5a67 0%, #24242f 48%, #08080d 100%)", border: "rgba(180,180,200,.8)", pattern: "◆" },
  "yard-neon": { background: "radial-gradient(circle at 50% 50%, #2bffdf 0%, #1a6bff 38%, #43106e 100%)", border: "rgba(190,255,245,.95)", pattern: "⚡" },
};

// Sticker-style yards are transparent artwork placed in the middle of the white yard.
// They intentionally do NOT paint a rectangle/background over the yard.
const STICKERS: Record<string, string> = {
  "yard-sticker-crown": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160"><g stroke="#fff" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"><path fill="#ff3131" d="M31 54 57 92h86l26-38-14 62H45z"/><path fill="#ffd84a" d="m31 54 23 18 18-39 18 39 25-45 13 45 27-18-11 62H45z"/><circle fill="#e52b39" cx="72" cy="78" r="8"/><circle fill="#e52b39" cx="128" cy="78" r="8"/></g><path fill="#fff1a8" d="M54 105h92v13H54z"/></svg>`,
  "yard-sticker-neon": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160"><path d="M33 58 58 91l26-36 18 30 27-44 8 45 31-17-18 55H48z" fill="#40ffd2" stroke="#fff" stroke-width="11" stroke-linejoin="round"/><path d="M52 104h99" stroke="#1734ff" stroke-width="12" stroke-linecap="round"/><path d="M54 121h82" stroke="#ff38e8" stroke-width="7" stroke-linecap="round"/></svg>`,
  "yard-sticker-dragon": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180"><path d="M43 145c-7-42 18-78 55-83 29-4 47 15 45 35-2 20-23 28-40 18-12-7-10-24 2-29 8-3 15 1 17 7-15-8-25 5-17 15 10 12 34 5 42-11 10-20-7-47-35-50-38-4-77 30-70 77 2 14 9 23 1 21z" fill="#168cff" stroke="#fff" stroke-width="11"/><path d="M73 74 43 46l8 37-30 10 39 5" fill="#00e7ff" stroke="#fff" stroke-width="9" stroke-linejoin="round"/><circle cx="126" cy="66" r="5" fill="#ffd83d"/><path d="M103 108c15 12 29 14 43 7" fill="none" stroke="#ffd83d" stroke-width="7" stroke-linecap="round"/></svg>`,
  "yard-sticker-panda": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180"><g stroke="#fff" stroke-width="10" stroke-linejoin="round"><circle fill="#161616" cx="54" cy="55" r="25"/><circle fill="#161616" cx="146" cy="55" r="25"/><circle fill="#fff" cx="100" cy="94" r="61"/><ellipse fill="#171717" cx="76" cy="91" rx="13" ry="19"/><ellipse fill="#171717" cx="124" cy="91" rx="13" ry="19"/><circle fill="#fff" cx="78" cy="86" r="4"/><circle fill="#fff" cx="122" cy="86" r="4"/><path fill="#171717" d="M92 111q8-7 16 0-2 12-8 12t-8-12z"/><path fill="#ffd83d" d="M68 37 79 18l21 15 21-15 11 19-32 8z"/></g><text x="100" y="151" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="900" fill="#28d17c" stroke="#fff" stroke-width="5" paint-order="stroke">$$</text></svg>`,
  "yard-sticker-sakura": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180"><g fill="#ff79b8" stroke="#fff" stroke-width="9"><path d="M100 90c-29-17-54-5-52-30 2-20 27-25 47-7 0-27 17-42 33-30 17 12 7 37-10 50 25-5 43 6 39 24-4 18-30 20-57 5 5 26-7 44-24 39-18-5-21-30-13-51z"/><circle cx="100" cy="90" r="17" fill="#ffd84a"/></g></svg>`,
  "yard-sticker-bolt": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 190"><path d="M103 9 35 101h42l-13 80 71-105H91z" fill="#ffe13b" stroke="#fff" stroke-width="12" stroke-linejoin="round"/><path d="M103 9 35 101h42" fill="#fff36a" opacity=".7"/></svg>`,
};

function skinFor(id: string | null) { return (id && SKINS[id]) || null; }
function stickerFor(id: string | null) { return (id && STICKERS[id]) || null; }

export default function YardSkinOverlay() {
  const [yardId, setYardId] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch("/api/customization", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const equipped = Array.isArray(data?.equippedItems) ? data.equippedItems.map(String) : [];
        const next = equipped.find((id: string) => id.startsWith("yard-")) || "yard-classic";
        if (alive) setYardId(next);
      } catch {}
    };
    load();
    const onRefresh = () => load();
    window.addEventListener("shop-inventory-updated", onRefresh);
    window.addEventListener("ludo-customization-updated", onRefresh);
    return () => { alive = false; window.removeEventListener("shop-inventory-updated", onRefresh); window.removeEventListener("ludo-customization-updated", onRefresh); };
  }, []);

  const skin = useMemo(() => skinFor(yardId), [yardId]);
  const sticker = useMemo(() => stickerFor(yardId), [yardId]);

  // Full-yard skins cover only the existing white inner yard.
  if (skin) {
    const yards = [
      { left: "5.75%", top: "5.75%" },
      { left: "65.75%", top: "5.75%" },
      { left: "5.75%", top: "65.75%" },
      { left: "65.75%", top: "65.75%" },
    ];
    return <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2, overflow: "hidden" }}>{yards.map((yard,index)=><div key={index} style={{position:"absolute",left:yard.left,top:yard.top,width:"28.5%",height:"28.5%",boxSizing:"border-box",borderRadius:"5.5%",background:skin.background,border:`2px solid ${skin.border}`,boxShadow:"inset 0 0 18px rgba(0,0,0,.25), 0 2px 8px rgba(0,0,0,.16)"}}><div style={{width:"100%",height:"100%",borderRadius:"4.5%",border:`1px solid ${skin.border}`,display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:"4%",boxSizing:"border-box",color:"rgba(255,255,255,.82)",fontSize:"clamp(10px,2.2vw,22px)",fontWeight:900,textShadow:"0 1px 4px rgba(0,0,0,.65)"}}>{skin.pattern}</div></div>)}</div>;
  }

  // Sticker yards are intentionally much smaller than the white yard: transparent artwork only.
  if (sticker) {
    const centers = [
      { left: "20%", top: "20%" }, { left: "80%", top: "20%" },
      { left: "20%", top: "80%" }, { left: "80%", top: "80%" },
    ];
    const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sticker)}`;
    return <div aria-hidden="true" style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:3,overflow:"hidden"}}>{centers.map((center,index)=><img key={index} src={src} alt="" style={{position:"absolute",left:center.left,top:center.top,width:"16%",height:"16%",objectFit:"contain",transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:3,filter:"drop-shadow(0 2px 2px rgba(0,0,0,.22))"}} />)}</div>;
  }

  return null;
}
