"use client";

import Link from "next/link";

const features = [
  ["👥", "PLAY ONLINE", "Play with real players"],
  ["🫂", "PLAY WITH FRIENDS", "Invite friends and play"],
  ["🏆", "TOURNAMENTS", "Compete for rewards"],
  ["🎯", "DAILY REWARDS", "Come back and earn"],
];

function MiniBoard(){
  const colors = ["#ef3340", "#16b86a", "#ffbd22", "#3478f6"];
  return <div className="landing-board" aria-hidden="true">
    {colors.map((color) => <div key={color} className="landing-yard" style={{background:`linear-gradient(145deg, ${color}, ${color}99)`}}><div className="landing-yard-inner">{[0,1,2,3].map(n => <span key={n} style={{background:color}} />)}</div></div>)}
    <div className="landing-track" /><div className="landing-center"><span>★</span></div><div className="landing-die">🎲</div>
  </div>;
}

export default function LandingPage(){
  return <main className="landing-page">
    <div className="landing-particles" aria-hidden="true" />
    <header className="landing-header"><div className="landing-logo"><span className="landing-logo-die">🎲</span><span>LUDO <b>LIVE</b></span></div><div className="landing-language">🌐 English⌄</div></header>
    <section className="landing-hero"><div className="landing-kicker">✨ THE LIVE LUDO EXPERIENCE</div><h1>Play Ludo,<br/><strong>Win Big!</strong></h1><p>Play with real players, challenge your friends and become the Ludo champion.</p><MiniBoard /></section>
    <section className="landing-stats"><div><b>4</b><span>Players</span></div><div><b>24/7</b><span>Play</span></div><div><b>100%</b><span>Fair Fun</span></div></section>
    <section className="landing-features">{features.map(([icon,title,text]) => <div className="landing-feature" key={title}><div className="landing-feature-icon">{icon}</div><b>{title}</b><span>{text}</span></div>)}</section>
    <section className="landing-actions"><Link className="landing-login" href="/account?mode=login"><span>👤</span><div><b>LOGIN</b><small>Welcome back! Sign in to play</small></div><strong>›</strong></Link><Link className="landing-create" href="/account?mode=create"><span>👤+</span><div><b>CREATE ACCOUNT</b><small>New here? Get started for free</small></div><strong>›</strong></Link></section>
    <div className="landing-trust"><span>🛡️</span><div><b>Secure • Fair • Fun</b><small>Your Ludo Live journey starts here.</small></div></div>
    <style>{`
      .landing-page{min-height:100dvh;box-sizing:border-box;overflow-x:hidden;padding:22px 18px 30px;background:radial-gradient(circle at 50% 18%,#122e66 0,#061634 30%,#010817 72%);color:#fff;font-family:Arial,Helvetica,sans-serif;position:relative}
      .landing-particles{position:absolute;inset:0;pointer-events:none;opacity:.55;background-image:radial-gradient(circle at 12% 16%,#27a9ff 0 2px,transparent 3px),radial-gradient(circle at 84% 20%,#b72cff 0 2px,transparent 3px),radial-gradient(circle at 22% 45%,#ffd21f 0 2px,transparent 3px),radial-gradient(circle at 90% 48%,#19d7ff 0 2px,transparent 3px),radial-gradient(circle at 14% 72%,#9c39ff 0 2px,transparent 3px)}
      .landing-header,.landing-hero,.landing-stats,.landing-features,.landing-actions,.landing-trust{position:relative;z-index:1;max-width:520px;margin-left:auto;margin-right:auto}
      .landing-header{display:flex;align-items:center;justify-content:space-between;gap:12px}.landing-logo{display:flex;align-items:center;gap:8px;font-size:25px;font-weight:950;letter-spacing:-1px}.landing-logo b{padding:2px 7px;border-radius:7px;background:linear-gradient(90deg,#159bff,#b423ff);font-size:.8em}.landing-logo-die{font-size:31px;filter:drop-shadow(0 5px 10px #0078ff88)}.landing-language{border:1px solid #3b4f91;background:#071331;color:#fff;border-radius:16px;padding:10px 12px;font-weight:800;font-size:12px}
      .landing-hero{text-align:center;padding-top:30px}.landing-kicker{font-size:10px;letter-spacing:2px;font-weight:950;color:#6ab7ff;margin-bottom:12px}.landing-hero h1{font-size:clamp(44px,13vw,68px);line-height:.94;letter-spacing:-3px;margin:0}.landing-hero h1 strong{background:linear-gradient(90deg,#16a8ff,#bd20ff);-webkit-background-clip:text;background-clip:text;color:transparent}.landing-hero p{max-width:390px;margin:17px auto 10px;color:#c4d2e8;font-size:15px;line-height:1.5}
      .landing-board{width:min(92vw,410px);aspect-ratio:1;margin:16px auto 8px;position:relative;display:grid;grid-template-columns:1fr 1fr;border-radius:24px;transform:perspective(900px) rotateX(5deg);box-shadow:0 25px 55px #0009,0 0 35px #663cff44;background:#08132b;border:2px solid #4a69bd;overflow:visible}.landing-yard{position:relative;padding:16px;box-sizing:border-box}.landing-yard:nth-child(1){border-radius:20px 0 0 0}.landing-yard:nth-child(2){border-radius:0 20px 0 0}.landing-yard:nth-child(3){border-radius:0 0 0 20px}.landing-yard:nth-child(4){border-radius:0 0 20px 0}.landing-yard-inner{height:100%;background:#ffffff22;border:2px solid #ffffff55;border-radius:14px;display:grid;grid-template-columns:1fr 1fr;place-items:center;padding:16px}.landing-yard-inner span{width:28px;height:28px;border-radius:50%;box-shadow:inset 0 2px 3px #fff8,0 4px 7px #0008;border:2px solid #ffffff99}.landing-track{position:absolute;inset:27% 27%;background:repeating-linear-gradient(90deg,#f7f9ff 0 16%,#dce5ff 16% 18%);border:2px solid #14274f;box-shadow:0 0 0 2px #fff4}.landing-center{position:absolute;left:39%;top:39%;width:22%;height:22%;display:grid;place-items:center;background:conic-gradient(#ef3340 0 25%,#3478f6 25% 50%,#ffbd22 50% 75%,#16b86a 75%);border:2px solid #fff8;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);font-size:28px;color:#fff;text-shadow:0 2px 4px #000}.landing-die{position:absolute;right:-4%;top:-15%;font-size:65px;filter:drop-shadow(0 14px 10px #000b);animation:landing-float 2.8s ease-in-out infinite}@keyframes landing-float{50%{transform:translateY(-9px) rotate(4deg)}}
      .landing-stats{display:grid;grid-template-columns:repeat(3,1fr);padding:15px 8px;margin-top:10px;border:1px solid #263c78;border-radius:20px;background:#071532dd;box-shadow:0 15px 35px #0006}.landing-stats div{text-align:center;border-right:1px solid #263c78}.landing-stats div:last-child{border:0}.landing-stats b{display:block;font-size:21px}.landing-stats span{display:block;color:#9eb0cf;font-size:11px;margin-top:4px}
      .landing-features{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:12px}.landing-feature{min-height:112px;padding:13px;border-radius:18px;background:#06142d;border:1px solid #1b3470;text-align:center;box-sizing:border-box}.landing-feature-icon{font-size:28px;margin-bottom:6px}.landing-feature b{display:block;font-size:11px}.landing-feature span{display:block;color:#9db0cc;font-size:10px;line-height:1.35;margin-top:5px}
      .landing-actions{display:grid;gap:10px;margin-top:18px}.landing-login,.landing-create{display:flex;align-items:center;gap:12px;text-decoration:none;color:#fff;padding:15px 16px;border-radius:18px}.landing-login{background:linear-gradient(100deg,#247cf2,#b01eea);box-shadow:0 10px 25px #5517c955}.landing-create{background:#06142d;border:1px solid #347cff}.landing-login>span,.landing-create>span{font-size:25px;width:34px;text-align:center}.landing-actions b{display:block;font-size:16px}.landing-actions small{display:block;color:#d5def0;font-size:10px;margin-top:4px}.landing-actions strong{margin-left:auto;font-size:34px;font-weight:400}.landing-trust{display:flex;justify-content:center;align-items:center;gap:9px;margin-top:18px;color:#dce7f8}.landing-trust span{font-size:25px}.landing-trust b{display:block;font-size:13px}.landing-trust small{display:block;color:#7187aa;font-size:10px;margin-top:3px}
      @media(min-width:700px){.landing-page{padding-top:28px}.landing-features{grid-template-columns:repeat(4,1fr)}.landing-feature{min-height:145px}.landing-actions{grid-template-columns:1fr 1fr}.landing-hero{padding-top:44px}}
    `}</style>
  </main>;
}
