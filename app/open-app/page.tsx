"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type RelatedApp = { platform?: string; id?: string; url?: string };
type NavigatorWithPwa = Navigator & { getInstalledRelatedApps?: () => Promise<RelatedApp[]> };

function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  const fullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return standalone || fullscreen || iosStandalone;
}

export default function OpenAppPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalonePwa()) {
      window.location.replace("/app");
      return;
    }

    let active = true;

    // Remember an installation completed through this browser. This gives the
    // gateway a reliable local signal even when getInstalledRelatedApps is not
    // exposed by the current Chrome build.
    try {
      if (window.localStorage.getItem("ludo_pwa_installed") === "1") {
        setInstalled(true);
      }
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }

    async function detectInstalledPwa() {
      try {
        const getInstalledRelatedApps = (navigator as NavigatorWithPwa).getInstalledRelatedApps;
        if (getInstalledRelatedApps) {
          const apps = await getInstalledRelatedApps();
          if (active && apps.some((app) => app.platform === "webapp")) {
            try { window.localStorage.setItem("ludo_pwa_installed", "1"); } catch {}
            setInstalled(true);
          }
        }
      } catch {
        // Unsupported browsers use the normal installation flow.
      } finally {
        if (active) setChecking(false);
      }
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      try { window.localStorage.setItem("ludo_pwa_installed", "1"); } catch {}
      setInstalled(true);
      setDeferredPrompt(null);
      setShowHelp(false);
      setChecking(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    detectInstalledPwa();

    return () => {
      active = false;
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!deferredPrompt) {
      setShowHelp(true);
      return;
    }
    setInstalling(true);
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setInstalling(false);
    if (choice.outcome === "accepted") {
      try { window.localStorage.setItem("ludo_pwa_installed", "1"); } catch {}
      setInstalled(true);
    } else {
      setShowHelp(true);
    }
  }

  return (
    <main className="gate">
      <div className="glow glowOne" />
      <div className="glow glowTwo" />
      <div className="grid" aria-hidden="true" />

      <section className="card" aria-labelledby="title">
        <div className="logo" aria-hidden="true">◆</div>
        <div className="eyebrow">LUDO LIVE</div>
        <h1 id="title">Play Ludo Live.<br /><span>{installed ? "Open the app." : "Install the app."}</span></h1>
        <p className="lead">
          {installed
            ? "Ludo Live is already installed on this device. Open the app to continue playing without using the browser."
            : "Ludo Live is now app-first. Install it from Chrome, then open Ludo Live from your Home screen or app launcher. The browser is only for installation."}
        </p>

        <div className="actions">
          {checking ? (
            <div className="installedState" role="status">
              <span className="check">…</span>
              <div><small>CHECKING DEVICE</small><b>Checking for Ludo Live…</b></div>
            </div>
          ) : (
            <>
              <a className="primary" href="/app" target="_blank" rel="noopener noreferrer">
                <span className="buttonIcon">▶</span>
                <span className="buttonCopy"><small>{installed ? "ALREADY INSTALLED" : "OPEN LUDO LIVE"}</small><b>Open Ludo Live</b></span>
                <span className="arrow">→</span>
              </a>
              {!installed && (
                <button type="button" className="secondaryAction" onClick={installApp} disabled={installing}>
                  <span className="buttonIcon">↥</span>
                  <span className="buttonCopy"><small>{installing ? "INSTALLING…" : "CHROME APP"}</small><b>{installing ? "Adding Ludo Live" : "Install Ludo Live"}</b></span>
                  <span className="arrow">→</span>
                </button>
              )}
              {installed && (
                <div className="installedState" role="status">
                  <span className="check">✓</span>
                  <div><small>INSTALLATION COMPLETE</small><b>Opening from this button should transfer into the app</b></div>
                </div>
              )}
              <button type="button" className="help" onClick={() => setShowHelp((value) => !value)}>
                {installed ? "Need installation help?" : "How to install from Chrome"} <span>{showHelp ? "↑" : "↓"}</span>
              </button>
            </>
          )}
        </div>

        {!installed && !checking && (
          <div className={`installNotice ${showHelp ? "visible" : ""}`}>
            <strong>Install from Chrome</strong>
            <span>1. Tap Chrome’s ⋮ menu.</span>
            <span>2. Choose <b>Install app</b> or <b>Add to Home screen</b>.</span>
            <span>3. Confirm the installation.</span>
            <span>4. Open Ludo Live from your Home screen or app launcher.</span>
          </div>
        )}

        <div className="footerLine"><span>SECURE</span><i /><span>FAIR</span><i /><span>LIVE PLAY</span></div>
      </section>

      <style>{`
        *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#020611}
        .gate{min-height:100dvh;position:relative;overflow:hidden;display:grid;place-items:center;padding:18px;background:#020611;color:#f7f9ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .grid{position:absolute;inset:0;opacity:.5;background-image:linear-gradient(rgba(104,146,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(104,146,255,.05) 1px,transparent 1px);background-size:58px 58px;mask-image:radial-gradient(circle at center,#000 0%,transparent 80%)}
        .glow{position:absolute;border-radius:50%;filter:blur(100px);pointer-events:none}.glowOne{width:420px;height:420px;left:-220px;top:-120px;background:#087eff;opacity:.22}.glowTwo{width:440px;height:440px;right:-250px;bottom:-130px;background:#8426ff;opacity:.2}
        .card{width:min(520px,100%);position:relative;z-index:2;padding:42px 28px 26px;border:1px solid rgba(104,143,220,.25);border-radius:26px;background:linear-gradient(160deg,rgba(9,19,43,.97),rgba(3,9,23,.99));box-shadow:0 30px 100px rgba(0,0,0,.55),inset 0 1px rgba(255,255,255,.05);text-align:center}
        .logo{width:62px;height:62px;margin:0 auto 17px;display:grid;place-items:center;border-radius:18px;color:#6dc6ff;font-size:27px;background:linear-gradient(145deg,#102c62,#22104b);box-shadow:0 0 40px rgba(47,143,255,.22)}
        .eyebrow{font-size:9px;letter-spacing:3px;font-weight:950;color:#68baff}.card h1{font-size:clamp(38px,9vw,58px);line-height:.94;letter-spacing:-3px;margin:15px 0 18px;font-weight:950}.card h1 span{background:linear-gradient(90deg,#21a7ff,#8d3dff);-webkit-background-clip:text;color:transparent}.lead{max-width:420px;margin:0 auto;color:#91a0b8;font-size:13px;line-height:1.8}
        .actions{display:grid;gap:11px;margin-top:29px}.primary,.installedState{width:100%;display:flex;align-items:center;gap:12px;border-radius:15px;padding:12px 14px}.primary,.secondaryAction{border:1px solid rgba(119,169,255,.35);color:#fff;background:linear-gradient(100deg,#087fff,#7a20ff);box-shadow:0 18px 42px rgba(46,74,255,.25);cursor:pointer;text-align:left;text-decoration:none}.primary:disabled,.secondaryAction:disabled{opacity:.8;cursor:wait}.secondaryAction{display:flex;align-items:center;width:100%;padding:12px 14px;border-radius:15px;background:rgba(8,22,47,.9);box-shadow:0 10px 28px rgba(0,0,0,.2);cursor:pointer;text-align:left;color:#fff}.buttonIcon{width:43px;height:43px;display:grid;place-items:center;border-radius:11px;background:rgba(255,255,255,.13);font-size:21px}.buttonCopy{display:grid;gap:3px}.buttonCopy small,.installedState small{font-size:8px;letter-spacing:1.5px;color:#cde8ff}.buttonCopy b,.installedState b{font-size:13px}.arrow{margin-left:auto;font-size:22px;color:#d8dfff}.installedState{border:1px solid rgba(41,211,157,.32);background:rgba(7,31,30,.8);text-align:left}.check{width:43px;height:43px;display:grid;place-items:center;border-radius:11px;background:rgba(41,211,157,.13);color:#35e99b;font-size:23px}.installedState div{display:grid;gap:3px}.installedState small{color:#6ee8bc}.help{border:1px solid #26395b;border-radius:13px;padding:13px 15px;background:rgba(4,11,26,.7);color:#dbe4f3;font-size:11px;font-weight:850;cursor:pointer}.help span{color:#68baff;margin-left:7px}
        .installNotice{display:grid;gap:5px;max-height:0;opacity:0;overflow:hidden;margin-top:0;padding:0 15px;text-align:left;border:1px solid transparent;border-radius:12px;background:rgba(10,20,42,.8);transition:max-height .3s ease,opacity .3s ease,margin-top .3s ease,padding .3s ease}.installNotice.visible{max-height:180px;opacity:1;margin-top:14px;padding:13px 15px;border-color:#27436c}.installNotice strong{font-size:10px;color:#f4c92f}.installNotice span{font-size:10px;line-height:1.5;color:#8fa0bb}.installNotice b{color:#dbe4f3}
        .footerLine{margin-top:26px;display:flex;align-items:center;justify-content:center;gap:9px;color:#52637f;font-size:7px;font-weight:950;letter-spacing:1.5px}.footerLine i{width:3px;height:3px;border-radius:50%;background:#314561}
        @media(max-width:460px){.gate{padding:12px}.card{padding:35px 18px 22px;border-radius:22px}.card h1{letter-spacing:-2px}.lead{font-size:12px}.primary,.installedState{padding:11px}.help{padding:12px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
      `}</style>
    </main>
  );
}
