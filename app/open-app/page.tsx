"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

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
  const [showHelp, setShowHelp] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalonePwa()) {
      window.location.replace("/app");
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setShowHelp(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
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

    if (choice.outcome === "dismissed") {
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
        <h1 id="title">Play Ludo Live.<br /><span>Install the app.</span></h1>
        <p className="lead">
          Ludo Live is now app-first. Install it from Chrome, then open Ludo Live from your Home screen or app launcher. The browser is only for installation.
        </p>

        <div className="actions">
          {installed ? (
            <div className="installedState" role="status">
              <span className="check">✓</span>
              <div><small>INSTALLATION COMPLETE</small><b>Open Ludo Live from your Home screen</b></div>
            </div>
          ) : (
            <button type="button" className="primary" onClick={installApp} disabled={installing}>
              <span className="buttonIcon">↥</span>
              <span className="buttonCopy">
                <small>{installing ? "INSTALLING…" : "CHROME APP"}</small>
                <b>{installing ? "Adding Ludo Live" : "Install Ludo Live"}</b>
              </span>
              <span className="arrow">→</span>
            </button>
          )}

          {!installed && (
            <button type="button" className="help" onClick={() => setShowHelp((value) => !value)}>
              How to install from Chrome <span>{showHelp ? "↑" : "↓"}</span>
            </button>
          )}
        </div>

        <div className={`installNotice ${showHelp ? "visible" : ""}`}>
          <strong>Install from Chrome</strong>
          <span>1. Tap Chrome’s ⋮ menu.</span>
          <span>2. Choose <b>Install app</b> or <b>Add to Home screen</b>.</span>
          <span>3. Confirm the installation.</span>
          <span>4. Open Ludo Live from your Home screen or app launcher.</span>
        </div>

        <div className="footerLine">
          <span>SECURE</span>
          <i />
          <span>FAIR</span>
          <i />
          <span>LIVE PLAY</span>
        </div>
      </section>
    </main>
  );
}
