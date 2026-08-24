"use client";

import Link from "next/link";

const features = [
  ["👥", "PLAY ONLINE", "Real players"],
  ["🫂", "PLAY WITH FRIENDS", "Your friends"],
  ["🏆", "TOURNAMENTS", "Win rewards"],
  ["🎯", "DAILY REWARDS", "Earn every day"],
];

function MiniBoard() {
  const colors = ["red", "green", "yellow", "blue"];
  return (
    <div className="board-wrap" aria-hidden="true">
      <div className="board-glow" />
      <div className="mini-board">
        {colors.map((color) => (
          <div className={`yard ${color}`} key={color}>
            <div className="yard-inner">
              <i /><i /><i /><i />
            </div>
          </div>
        ))}
        <div className="path-grid">
          {Array.from({ length: 25 }).map((_, i) => <span key={i} />)}
        </div>
        <div className="home-diamond">
          <span className="home-red" /><span className="home-green" /><span className="home-yellow" /><span className="home-blue" />
          <b>★</b>
        </div>
        <div className="floating-die">🎲</div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="landing-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="landing-header">
        <div className="brand">
          <span className="brand-die">🎲</span>
          <span>LUDO <b>LIVE</b></span>
        </div>
        <button className="language">🌐 English <span>⌄</span></button>
      </header>

      <section className="hero">
        <div className="eyebrow">✦ THE LIVE LUDO EXPERIENCE</div>
        <h1>Play Ludo,<br /><strong>Win Big!</strong></h1>
        <p>Play with real players, challenge your friends and become the Ludo champion.</p>
        <MiniBoard />
      </section>

      <section className="stats">
        <div><b>4</b><span>Players</span></div>
        <div><b>24/7</b><span>Play</span></div>
        <div><b>100%</b><span>Fair Fun</span></div>
      </section>

      <section className="features">
        {features.map(([icon, title, text]) => (
          <div className="feature" key={title}>
            <div className="feature-icon">{icon}</div>
            <b>{title}</b>
            <span>{text}</span>
          </div>
        ))}
      </section>

      <section className="actions">
        <Link className="action primary" href="/account?mode=login">
          <span className="action-icon">👤</span>
          <span className="action-copy"><b>LOGIN</b><small>Welcome back! Sign in to play</small></span>
          <strong>›</strong>
        </Link>
        <Link className="action secondary" href="/account?mode=create">
          <span className="action-icon">👤<em>+</em></span>
          <span className="action-copy"><b>CREATE ACCOUNT</b><small>New here? Get started for free</small></span>
          <strong>›</strong>
        </Link>
      </section>

      <footer className="trust">
        <span>🛡️</span>
        <div><b>Secure • Fair • Fun</b><small>Your Ludo Live journey starts here.</small></div>
      </footer>

      <style>{`
        *{box-sizing:border-box}
        .landing-page{min-height:100dvh;overflow-x:hidden;position:relative;padding:18px 16px 28px;background:radial-gradient(ellipse at 50% 15%,#123b7b 0%,#082454 26%,#03122f 58%,#010815 100%);color:#fff;font-family:Arial,Helvetica,sans-serif}
        .landing-page:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(30,105,215,.08),transparent 35%,rgba(110,35,220,.06))}
        .ambient{position:absolute;border-radius:50%;filter:blur(50px);opacity:.3;pointer-events:none}.ambient-one{width:180px;height:180px;left:-90px;top:300px;background:#087cff}.ambient-two{width:190px;height:190px;right:-100px;top:700px;background:#9b24ff}
        .landing-header,.hero,.stats,.features,.actions,.trust{position:relative;z-index:2;width:min(100%,520px);margin-inline:auto}
        .landing-header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:2px 2px}.brand{display:flex;align-items:center;gap:8px;font-size:24px;font-weight:950;letter-spacing:-1.2px}.brand-die{font-size:30px;filter:drop-shadow(0 5px 8px rgba(0,0,0,.5))}.brand b{padding:2px 6px;border-radius:7px;background:linear-gradient(90deg,#159bff,#b72cff);font-size:.8em}.language{border:1px solid #36538e;background:rgba(3,16,43,.75);color:#eef5ff;border-radius:18px;padding:10px 13px;font-size:12px;font-weight:900;box-shadow:inset 0 1px rgba(255,255,255,.08)}.language span{margin-left:3px;color:#8cb9ff}
        .hero{text-align:center;padding-top:31px}.eyebrow{display:inline-flex;align-items:center;gap:5px;color:#66b3ff;font-size:10px;font-weight:950;letter-spacing:2px;margin-bottom:10px}.hero h1{margin:0;font-size:clamp(46px,14vw,68px);line-height:.91;letter-spacing:-3.5px;font-weight:950}.hero h1 strong{background:linear-gradient(90deg,#14a9ff 5%,#386cff 45%,#c01eff 100%);-webkit-background-clip:text;background-clip:text;color:transparent}.hero p{max-width:400px;margin:17px auto 0;color:#bdcde5;font-size:14px;line-height:1.55}
        .board-wrap{width:min(100%,390px);margin:18px auto 4px;position:relative;padding:7px}.board-glow{position:absolute;inset:16% 12%;border-radius:50%;background:#286bff;filter:blur(35px);opacity:.24}.mini-board{position:relative;width:100%;aspect-ratio:1;border:2px solid rgba(115,164,255,.75);border-radius:26px;overflow:visible;background:#07142d;box-shadow:0 24px 55px rgba(0,0,0,.55),0 0 35px rgba(60,100,255,.22);display:grid;grid-template-columns:1fr 1fr;transform:perspective(900px) rotateX(3deg)}
        .yard{position:relative;padding:13px}.yard.red{background:linear-gradient(145deg,#f33f51,#b51f39)}.yard.green{background:linear-gradient(145deg,#19c875,#079052)}.yard.yellow{background:linear-gradient(145deg,#ffc83d,#d79205)}.yard.blue{background:linear-gradient(145deg,#4288f5,#2058c8)}.yard:nth-of-type(1){border-radius:23px 0 0 0}.yard:nth-of-type(2){border-radius:0 23px 0 0}.yard:nth-of-type(3){border-radius:0 0 0 23px}.yard:nth-of-type(4){border-radius:0 0 23px 0}.yard-inner{width:100%;height:100%;border:2px solid rgba(255,255,255,.36);border-radius:16px;background:rgba(255,255,255,.07);display:grid;grid-template-columns:1fr 1fr;place-items:center;padding:16px}.yard-inner i{display:block;width:27px;height:27px;border-radius:50%;background:rgba(255,255,255,.72);border:2px solid rgba(255,255,255,.58);box-shadow:inset 0 2px 4px rgba(255,255,255,.8),0 4px 8px rgba(0,0,0,.32)}.red .yard-inner i{box-shadow:inset 0 2px 4px #fff,0 0 10px #ff7584,0 4px 8px #6d1225}.green .yard-inner i{box-shadow:inset 0 2px 4px #fff,0 0 10px #7dffc2,0 4px 8px #056637}.yellow .yard-inner i{box-shadow:inset 0 2px 4px #fff,0 0 10px #fff2a0,0 4px 8px #815500}.blue .yard-inner i{box-shadow:inset 0 2px 4px #fff,0 0 10px #9cc8ff,0 4px 8px #123b88}
        .path-grid{position:absolute;left:26.5%;top:0;width:47%;height:100%;display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,1fr);background:#f6f8ff;border:2px solid #15284e;box-shadow:0 0 0 1px rgba(255,255,255,.5)}.path-grid span{border:1px solid #d5def0}.path-grid span:nth-child(1),.path-grid span:nth-child(2),.path-grid span:nth-child(3),.path-grid span:nth-child(4),.path-grid span:nth-child(5){background:linear-gradient(#fff,#eaf0fc)}.path-grid:after{content:"";position:absolute;left:0;right:0;top:40%;height:20%;background:linear-gradient(90deg,#f33f51 0 25%,#19c875 25% 50%,#ffc83d 50% 75%,#4288f5 75%);opacity:.9}
        .home-diamond{position:absolute;left:36%;top:36%;width:28%;height:28%;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);background:#fff;display:grid;place-items:center;box-shadow:0 0 0 2px #17325e}.home-red,.home-green,.home-yellow,.home-blue{position:absolute;width:50%;height:50%}.home-red{top:0;left:0;background:#ef3340;clip-path:polygon(100% 0,100% 100%,0 100%,50% 50%)}.home-green{top:0;right:0;background:#16b86a;clip-path:polygon(0 0,100% 50%,0 100%,0 0)}.home-yellow{bottom:0;left:0;background:#ffbd22;clip-path:polygon(0 0,100% 100%,0 100%)}.home-blue{right:0;bottom:0;background:#3478f6;clip-path:polygon(100% 0,100% 100%,0 50%)}.home-diamond b{position:relative;z-index:3;font-size:24px;color:#fff;text-shadow:0 2px 4px rgba(0,0,0,.55)}
        .floating-die{position:absolute;right:-5%;top:-13%;font-size:58px;filter:drop-shadow(0 13px 9px rgba(0,0,0,.65));animation:die-float 3s ease-in-out infinite}@keyframes die-float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-8px) rotate(5deg)}}
        .stats{display:grid;grid-template-columns:repeat(3,1fr);padding:13px 6px;border:1px solid #28467e;border-radius:18px;background:rgba(4,19,48,.86);box-shadow:0 14px 30px rgba(0,0,0,.3)}.stats div{text-align:center;border-right:1px solid #28416e}.stats div:last-child{border-right:0}.stats b{display:block;font-size:21px}.stats span{display:block;margin-top:4px;color:#8ea4c6;font-size:10px}
        .features{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.feature{min-height:105px;padding:13px 9px;border-radius:17px;border:1px solid #1b3971;background:linear-gradient(145deg,rgba(8,29,65,.95),rgba(3,17,42,.96));text-align:center;box-shadow:inset 0 1px rgba(255,255,255,.04)}.feature-icon{font-size:26px;line-height:1;margin-bottom:8px}.feature b{display:block;font-size:10px;letter-spacing:.2px}.feature span{display:block;color:#7f94b6;font-size:10px;margin-top:5px}
        .actions{display:grid;gap:10px;margin-top:17px}.action{display:flex;align-items:center;gap:11px;padding:14px 15px;border-radius:18px;text-decoration:none;color:#fff;min-height:70px}.action.primary{background:linear-gradient(100deg,#2879f4 0%,#6536ef 48%,#b61ce8 100%);box-shadow:0 13px 28px rgba(80,29,205,.3)}.action.secondary{background:linear-gradient(145deg,rgba(7,28,62,.98),rgba(3,17,42,.98));border:1px solid #367cff}.action-icon{position:relative;width:34px;text-align:center;font-size:23px}.action-icon em{position:absolute;right:-2px;bottom:-4px;font-style:normal;font-size:17px;font-weight:950}.action-copy{display:grid;gap:4px}.action-copy b{font-size:15px}.action-copy small{font-size:10px;color:#d2ddf1}.action strong{margin-left:auto;font-size:34px;font-weight:300;line-height:1}
        .trust{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:17px;padding-bottom:4px;color:#dbe6f7}.trust>span{font-size:25px}.trust b{display:block;font-size:12px}.trust small{display:block;color:#6d83a5;font-size:9px;margin-top:3px}
        @media(min-width:700px){.landing-page{padding-top:26px}.features{grid-template-columns:repeat(4,1fr)}.feature{min-height:125px}.actions{grid-template-columns:1fr 1fr}.hero{padding-top:42px}}
      `}</style>
    </main>
  );
}
