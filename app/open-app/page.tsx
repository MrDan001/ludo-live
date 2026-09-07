"use client";

import { useEffect, useState } from "react";

const INSTALL_URL = "https://github.com/MrDan001/ludo-live/releases/latest/download/ludo-live.apk";
const ANDROID_INTENT = "intent://open#Intent;scheme=ludolive;package=live.ludo.app;end";

export default function OpenAppPage() {
  const [showInstall, setShowInstall] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    setIsAndroid(/Android/i.test(navigator.userAgent));
  }, []);

  function openApp() {
    if (!isAndroid) {
      setShowInstall(true);
      return;
    }

    setIsLaunching(true);
    setShowInstall(false);

    let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      setIsLaunching(false);
      setShowInstall(true);
      timer = null;
    }, 1800);

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange, { once: true });
    window.location.href = ANDROID_INTENT;
  }

  return (
    <main className="gate">
      <div className="glow glowOne" />
      <div className="glow glowTwo" />
      <div className="grid" aria-hidden="true" />

      <section className="card" aria-labelledby="title">
        <div className="logo" aria-hidden="true">◆</div>
        <div className="eyebrow">LUDO LIVE</div>
        <h1 id="title">The game lives<br /><span>inside the app.</span></h1>
        <p className="lead">
          Ludo Live is now app-first. Open the installed app to continue, or install it on this device to start playing.
        </p>

        <div className="actions">
          <button type="button" className="primary" onClick={openApp} disabled={isLaunching}>
            <span className="buttonIcon">🎲</span>
            <span className="buttonCopy">
              <small>{isLaunching ? "OPENING APP…" : "CONTINUE"}</small>
              <b>{isLaunching ? "Switching to Ludo Live" : "Open Ludo Live App"}</b>
            </span>
            <span className="arrow">→</span>
          </button>

          <a className="install" href={INSTALL_URL} download>
            <span>Install Ludo Live</span>
            <b>↓</b>
          </a>
        </div>

        <div className={`installNotice ${showInstall ? "visible" : ""}`} role="status" aria-live="polite">
          <strong>App not opened?</strong>
          <span>Install the Android app, then come back here and tap “Open Ludo Live App”.</span>
          <a href={INSTALL_URL}>Download the latest Android app</a>
        </div>

        <div className="footerLine">
          <span>SECURE</span>
          <i />
          <span>FAIR</span>
          <i />
          <span>LIVE PLAY</span>
        </div>
      </section>

      <style>{`
        *{box-sizing:border-box}
        html,body{margin:0;min-height:100%;background:#020611}
        .gate{min-height:100dvh;position:relative;overflow:hidden;display:grid;place-items:center;padding:22px;background:#020611;color:#f7f9ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .grid{position:absolute;inset:0;opacity:.5;background-image:linear-gradient(rgba(104,146,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(104,146,255,.05) 1px,transparent 1px);background-size:58px 58px;mask-image:radial-gradient(circle at center,#000 0%,transparent 80%)}
        .glow{position:absolute;border-radius:50%;filter:blur(100px);pointer-events:none}.glowOne{width:420px;height:420px;left:-220px;top:-120px;background:#087eff;opacity:.22}.glowTwo{width:440px;height:440px;right:-250px;bottom:-130px;background:#8426ff;opacity:.2}
        .card{width:min(520px,100%);position:relative;z-index:2;padding:46px 34px 30px;border:1px solid rgba(104,143,220,.25);border-radius:28px;background:linear-gradient(160deg,rgba(9,19,43,.96),rgba(3,9,23,.98));box-shadow:0 30px 100px rgba(0,0,0,.55),inset 0 1px rgba(255,255,255,.05);text-align:center}
        .logo{width:64px;height:64px;margin:0 auto 18px;display:grid;place-items:center;border-radius:19px;color:#6dc6ff;font-size:28px;background:linear-gradient(145deg,#102c62,#22104b);box-shadow:0 0 40px rgba(47,143,255,.22)}
        .eyebrow{font-size:9px;letter-spacing:3px;font-weight:950;color:#68baff}.card h1{font-size:clamp(39px,9vw,58px);line-height:.94;letter-spacing:-3px;margin:16px 0 18px;font-weight:950}.card h1 span{background:linear-gradient(90deg,#21a7ff,#8d3dff);-webkit-background-clip:text;color:transparent}.lead{max-width:420px;margin:0 auto;color:#91a0b8;font-size:13px;line-height:1.8}
        .actions{display:grid;gap:11px;margin-top:30px}.primary{width:100%;display:flex;align-items:center;gap:12px;border:1px solid rgba(119,169,255,.35);border-radius:15px;padding:12px 14px;color:#fff;background:linear-gradient(100deg,#087fff,#7a20ff);box-shadow:0 18px 42px rgba(46,74,255,.25);cursor:pointer;text-align:left}.primary:disabled{opacity:.8;cursor:wait}.buttonIcon{width:43px;height:43px;display:grid;place-items:center;border-radius:11px;background:rgba(255,255,255,.13);font-size:23px}.buttonCopy{display:grid;gap:3px}.buttonCopy small{font-size:8px;letter-spacing:1.5px;color:#cde8ff}.buttonCopy b{font-size:13px}.arrow{margin-left:auto;font-size:22px;color:#d8dfff}.install{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border:1px solid #26395b;border-radius:13px;background:rgba(4,11,26,.7);color:#dbe4f3;text-decoration:none;font-size:11px;font-weight:850}.install b{color:#68baff;font-size:17px}
        .installNotice{display:grid;gap:5px;max-height:0;opacity:0;overflow:hidden;margin-top:0;padding:0 15px;text-align:left;border:1px solid transparent;border-radius:12px;background:rgba(10,20,42,.8);transition:max-height .3s ease,opacity .3s ease,margin-top .3s ease,padding .3s ease}.installNotice.visible{max-height:140px;opacity:1;margin-top:14px;padding:13px 15px;border-color:#27436c}.installNotice strong{font-size:10px;color:#f4c92f}.installNotice span{font-size:10px;line-height:1.55;color:#8fa0bb}.installNotice a{font-size:10px;color:#65baff;text-decoration:none;font-weight:850;margin-top:2px}
        .footerLine{margin-top:27px;display:flex;align-items:center;justify-content:center;gap:9px;color:#52637f;font-size:7px;font-weight:950;letter-spacing:1.5px}.footerLine i{width:3px;height:3px;border-radius:50%;background:#314561}
        @media(max-width:460px){.gate{padding:14px}.card{padding:38px 21px 25px;border-radius:23px}.card h1{letter-spacing:-2px}.lead{font-size:12px}.primary{padding:11px}.install{padding:13px 14px}}
        @media(prefers-reduced-motion:reduce){*{transition:none!important}}
      `}</style>
    </main>
  );
}
