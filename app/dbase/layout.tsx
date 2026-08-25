"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import TournamentAdminV2 from "./TournamentAdminV2";
import MissionAdmin from "./MissionAdmin";
import AdminFinance from "./AdminFinance";
import AdminShop from "./AdminShop";
import EventAdmin from "./EventAdmin";

type Tab = "overview" | "players" | "economy" | "visitors" | "disputes" | "audit";
const tabs: Tab[] = ["overview", "players", "economy", "visitors", "disputes", "audit"];
const tools = [
  { label: "🛍️ Shop", match: "shop" },
  { label: "🎯 Missions", match: "missions" },
  { label: "🎉 Events", match: "events" },
  { label: "🏆 Tournament Control", match: "tournament" },
  { label: "🏦 Finance", match: "finance" },
];

export default function DbaseLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/dbase/login";
  const [checking, setChecking] = useState(!isLogin);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (isLogin) { setChecking(false); return; }
    let alive = true;
    fetch("/api/admin", { cache: "no-store" }).then((r) => {
      if (!alive) return;
      if (r.status === 401 || r.status === 403) { router.replace(`/dbase/login?next=${encodeURIComponent(pathname || "/dbase")}`); return; }
      setChecking(false);
    }).catch(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, [isLogin, pathname, router]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const selectTab = (label: string) => {
    const button = Array.from(document.querySelectorAll(".dbase-mobile-shell main nav button")).find((x) => x.textContent?.toLowerCase().includes(label.toLowerCase()));
    if (button) { (button as HTMLButtonElement).click(); setMenuOpen(false); }
  };

  const openTool = (match: string) => {
    const slot = document.querySelector<HTMLElement>(`.dbase-tool-slot[data-tool="${match}"]`);
    const button = slot?.querySelector<HTMLButtonElement>("button");
    if (button) { button.click(); setMenuOpen(false); }
  };

  if (isLogin || checking) return <div className="dbase-mobile-shell">{children}</div>;

  return (
    <div className={`dbase-mobile-shell${menuOpen ? " dbase-menu-open" : ""}`}>
      <button className="dbase-hamburger" aria-label="Open admin navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}><span>☰</span><b>Admin Menu</b></button>
      {menuOpen && <div className="dbase-menu-backdrop" onClick={() => setMenuOpen(false)} />}
      <aside className="dbase-mobile-drawer" aria-hidden={!menuOpen}>
        <div className="dbase-drawer-head"><strong>🛡️ DBASE</strong><button aria-label="Close admin navigation" onClick={() => setMenuOpen(false)}>×</button></div>
        <div className="dbase-drawer-group"><small>ADMIN DASHBOARD</small><div className="dbase-drawer-tabs">{tabs.map((tab) => <button key={tab} onClick={() => selectTab(tab)}>{({ overview: "⌂", players: "👥", economy: "💰", visitors: "📊", disputes: "🚨", audit: "🔐" } as any)[tab]} {tab}</button>)}</div></div>
        <div className="dbase-drawer-group"><small>MANAGEMENT</small><div className="dbase-drawer-tabs">{tools.map((tool) => <button key={tool.match} onClick={() => openTool(tool.match)}>{tool.label}</button>)}</div></div>
      </aside>
      {children}
      <div className="dbase-tool-slot" data-tool="tournament"><TournamentAdminV2 /></div>
      <div className="dbase-tool-slot" data-tool="missions"><MissionAdmin /></div>
      <div className="dbase-tool-slot" data-tool="events"><EventAdmin /></div>
      <div className="dbase-tool-slot" data-tool="finance"><AdminFinance /></div>
      <div className="dbase-tool-slot" data-tool="shop"><AdminShop /></div>
      <style dangerouslySetInnerHTML={{ __html: `
        *{box-sizing:border-box}.dbase-mobile-shell{min-height:100vh;width:100%;overflow-x:hidden}.dbase-tool-slot>button{display:none!important}
        .dbase-hamburger{display:flex;position:fixed;right:18px;top:18px;z-index:1002;align-items:center;gap:8px;border:1px solid #3967a0;background:#0a1731;color:#e8f0ff;border-radius:12px;padding:10px 13px;box-shadow:0 10px 28px rgba(0,0,0,.35);font-size:13px;font-weight:900;cursor:pointer}.dbase-hamburger span{font-size:20px}
        .dbase-mobile-drawer{position:fixed;top:0;right:0;bottom:0;width:min(86vw,340px);z-index:1004;background:#061127;border-left:1px solid #29476f;box-shadow:-20px 0 60px rgba(0,0,0,.55);transform:translateX(105%);transition:transform .2s ease;padding:14px;overflow:auto}.dbase-menu-open .dbase-mobile-drawer{transform:translateX(0)}.dbase-menu-backdrop{position:fixed;inset:0;z-index:1003;background:rgba(0,0,0,.58);backdrop-filter:blur(2px)}
        .dbase-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:4px 2px 16px;border-bottom:1px solid #1c3153;color:#eaf2ff;font-size:18px}.dbase-drawer-head button{border:1px solid #314d76;background:#0b1935;color:#dce9ff;width:38px;height:38px;border-radius:10px;font-size:24px}.dbase-drawer-group{padding-top:16px}.dbase-drawer-group>small{display:block;color:#6f8db8;font-size:10px;font-weight:950;letter-spacing:1.4px;padding:0 3px 8px}.dbase-drawer-tabs{display:grid;gap:8px}.dbase-drawer-tabs button{width:100%;text-align:left;border:1px solid #263f66;background:#0b1935;color:#bcd0ee;border-radius:11px;padding:13px 14px;text-transform:capitalize;font-weight:850;font-size:14px;cursor:pointer}.dbase-drawer-tabs button:hover{background:#12325d;border-color:#4678b8;color:#fff}
        @media(min-width:701px){.dbase-mobile-drawer{width:360px}.dbase-mobile-shell main{padding-right:78px!important}}
        @media(max-width:700px){.dbase-mobile-shell main{width:100%!important;max-width:100%!important;min-width:0!important;overflow-x:hidden!important;padding:14px 12px 120px!important;margin:0!important}.dbase-mobile-shell main>header{flex-direction:column!important;align-items:flex-start!important;gap:10px!important;padding:0 54px 4px 0!important;width:100%!important}.dbase-mobile-shell main>header h1{font-size:28px!important;line-height:1.05!important;margin:5px 0!important}.dbase-mobile-shell main>header p{font-size:12px!important;line-height:1.45!important;margin:0!important}.dbase-mobile-shell main nav{display:none!important}.dbase-mobile-shell main>section{width:100%!important;min-width:0!important}.dbase-mobile-shell main [style*="grid-template-columns"]{grid-template-columns:1fr!important}.dbase-mobile-shell main>section[style*="repeat(auto-fit"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}.dbase-mobile-shell input,.dbase-mobile-shell select,.dbase-mobile-shell textarea{max-width:100%!important;min-width:0!important;width:100%;font-size:16px!important}.dbase-mobile-shell h1{font-size:28px!important}.dbase-mobile-shell h2{font-size:20px!important}.dbase-mobile-shell h3{font-size:17px!important}.dbase-mobile-shell p{overflow-wrap:anywhere}.dbase-mobile-shell button{min-height:42px}.dbase-mobile-shell [style*="overflow-x:auto"]{max-width:100%!important}.dbase-mobile-shell [style*="max-height:92vh"]{width:calc(100vw - 20px)!important;max-width:none!important;max-height:92vh!important;padding:14px!important;border-radius:16px!important}}
      ` }}
    />
    </div>
  );
}
