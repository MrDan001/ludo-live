"use client";
import { useEffect, useState } from "react";
import "./install.css";

type PwaEvt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export default function DbaseInstall() {
  const [prompt, setPrompt] = useState<PwaEvt | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/dbase/sw.js", { scope: "/dbase/" }).catch(() => {});
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as PwaEvt);
    };
    const onInstalled = () => setDone(true);

    addEventListener("beforeinstallprompt", onPrompt);
    addEventListener("appinstalled", onInstalled);

    return () => {
      removeEventListener("beforeinstallprompt", onPrompt);
      removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    setBusy(true);
    try {
      await prompt.prompt();
      await prompt.userChoice;
      setDone(true);
    } finally {
      setPrompt(null);
      setBusy(false);
    }
  }

  return (
    <main className="dbase-install">
      <section className="dbase-install-card">
        <div className="dbase-install-mark">♟</div>
        <div className="dbase-install-eyebrow">LUDO LIVE • ADMINISTRATION</div>
        <h1>DBASE Admin</h1>
        <p>
          Use the Ludo Live administration console as a dedicated app.
          The browser is only for installation.
        </p>

        <button
          className="dbase-install-primary"
          onClick={install}
          disabled={!prompt || busy}
        >
          {busy ? "INSTALLING…" : done ? "INSTALLED" : "INSTALL DBASE APP"}
        </button>

        <a className="dbase-install-secondary" href="/dbase/login">
          OPEN DBASE
        </a>

        <div className="dbase-install-steps">
          <b>Install from Chrome</b>
          <ol>
            <li>Open Chrome's ⋮ menu.</li>
            <li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li>
            <li>Open <b>DBASE</b> from your phone.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}