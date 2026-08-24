"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="landing">
      <div className="orb orbA" />
      <div className="orb orbB" />

      <nav className="nav">
        <div className="logo"><span>◆</span> LUDO <b>LIVE</b></div>
        <div className="nav-right"><span className="online"><i /> LIVE NOW</span><span className="lang">EN ▾</span></div>
      </nav>

      <section className="hero">
        <div className="badge">✦ THE NEXT GENERATION OF LUDO</div>
        <h1>The board is<br /><span>always live.</span></h1>
        <p>Play. Compete. Connect. Experience Ludo with real players, private rooms and tournaments built for the modern player.</p>
        <div className="cta-row">
          <Link href="/account?mode=create" className="cta primary">CREATE FREE ACCOUNT <b>→</b></Link>
          <Link href="/account?mode=login" className="cta ghost">SIGN IN</Link>
        </div>
        <div className="trust"><span>● No download</span><span>● Free to start</span><span>● Play anywhere</span></div>
      </section>

      <section className="showcase" aria-hidden="true">
        <div className="glass-card left-card"><small>PLAYERS</small><strong>24,891</strong><em>● LIVE</em></div>
        <div className="board">
          <div className="yard red"><i/><i/><i/><i/></div><div className="yard green"><i/><i/><i/><i/></div>
          <div className="track" />
          <div className="center"><span>◆</span></div>
          <div className="yard yellow"><i/><i/><i/><i/></div><div className="yard blue"><i/><i/><i/><i/></div>
          <div className="piece p1"/><div className="piece p2"/><div className="piece p3"/>
        </div>
        <div className="glass-card right-card"><small>TOURNAMENT</small><strong>₦250K</strong><em>PRIZE POOL</em></div>
      </section>

      <section className="features">
        <article><div className="icon">◎</div><h3>LIVE MATCHES</h3><p>Challenge real players in fast, seamless games.</p></article>
        <article><div className="icon">♜</div><h3>PRIVATE ROOMS</h3><p>Invite friends and create your own table.</p></article>
        <article><div className="icon">♛</div><h3>TOURNAMENTS</h3><p>Climb the ranks and compete for rewards.</p></article>
        <article><div className="icon">✦</div><h3>YOUR PROFILE</h3><p>Build your level, collection and reputation.</p></article>
      </section>

      <section className="bottom-cta">
        <div><small>YOUR NEXT GAME IS WAITING</small><h2>Ready to roll?</h2></div>
        <Link href="/account?mode=create">JOIN LUDO LIVE <span>→</span></Link>
      </section>

      <footer><span>© 2026 LUDO LIVE</span><span>SECURE • FAIR • SOCIAL</span></footer>

      <style>{`
        *{box-sizing:border-box}.landing{min-height:100dvh;overflow:hidden;position:relative;background:#03070f;color:#f5f8ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:0 24px}.landing:before{content:"";position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:70px 70px;mask-image:linear-gradient(to bottom,#000,transparent 80%);pointer-events:none}.orb{position:absolute;border-radius:50%;filter:blur(100px);opacity:.24;pointer-events:none}.orbA{width:420px;height:420px;background:#165dff;left:-180px;top:180px}.orbB{width:420px;height:420px;background:#8b22ff;right:-180px;top:460px}.nav{height:82px;width:min(1180px,100%);margin:auto;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2;border-bottom:1px solid rgba(255,255,255,.08)}.logo{font-weight:950;letter-spacing:-1px;font-size:20px}.logo span{color:#5aa2ff;margin-right:7px}.logo b{font-size:12px;background:linear-gradient(90deg,#4da3ff,#a75cff);padding:4px 7px;border-radius:6px;margin-left:3px}.nav-right{display:flex;gap:20px;align-items:center;color:#93a2bb;font-size:10px;font-weight:800;letter-spacing:1.3px}.online i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#38e58c;box-shadow:0 0 12px #38e58c;margin-right:6px}.lang{padding:8px 11px;border:1px solid #263246;border-radius:9px}.hero{position:relative;z-index:2;text-align:center;width:min(820px,100%);margin:0 auto;padding:92px 0 42px}.badge{display:inline-block;border:1px solid rgba(89,151,255,.3);background:rgba(30,70,130,.16);color:#78b5ff;border-radius:30px;padding:8px 14px;font-size:9px;font-weight:900;letter-spacing:2px}.hero h1{font-size:clamp(58px,10vw,112px);line-height:.87;letter-spacing:-6px;margin:24px 0 20px;font-weight:950}.hero h1 span{background:linear-gradient(90deg,#fff 0%,#70aaff 45%,#b55cff 100%);-webkit-background-clip:text;color:transparent}.hero p{max-width:610px;margin:auto;color:#8796ad;line-height:1.7;font-size:14px}.cta-row{display:flex;justify-content:center;gap:10px;margin-top:30px;flex-wrap:wrap}.cta{min-width:180px;text-decoration:none;border-radius:11px;padding:15px 20px;font-size:11px;font-weight:950;letter-spacing:.7px}.cta.primary{color:#fff;background:linear-gradient(100deg,#2179ff,#8d32ef);box-shadow:0 12px 40px rgba(62,71,255,.25)}.cta.primary b{float:right;font-size:17px;line-height:11px}.cta.ghost{color:#dbe5f5;border:1px solid #2a374c;background:rgba(8,14,26,.65)}.trust{margin-top:18px;color:#53627a;font-size:9px;font-weight:800;letter-spacing:.7px;display:flex;justify-content:center;gap:18px}.showcase{width:min(1100px,100%);height:470px;margin:8px auto 0;position:relative;display:grid;place-items:center;z-index:2}.board{width:min(430px,75vw);aspect-ratio:1;position:relative;display:grid;grid-template-columns:1fr 1fr;border:9px solid #111c30;border-radius:28px;box-shadow:0 35px 100px rgba(0,0,0,.65),0 0 70px rgba(56,111,255,.18);transform:perspective(1000px) rotateX(5deg)}.yard{display:grid;grid-template-columns:1fr 1fr;place-items:center;padding:25px}.yard i{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.82);border:2px solid rgba(255,255,255,.45);box-shadow:0 7px 12px rgba(0,0,0,.35)}.red{background:linear-gradient(145deg,#ff4353,#a81735);border-radius:18px 0 0}.green{background:linear-gradient(145deg,#20d47d,#067e50);border-radius:0 18px 0 0}.yellow{background:linear-gradient(145deg,#ffd34b,#c98706);border-radius:0 0 0 18px}.blue{background:linear-gradient(145deg,#438cff,#2450c0);border-radius:0 0 18px 0}.track{position:absolute;inset:0;margin:25%;background:repeating-linear-gradient(0deg,#f4f7fd 0 19%,#d6dfed 20% 21%),repeating-linear-gradient(90deg,transparent 0 19%,#cbd6e7 20% 21%);border:5px solid #17233a;z-index:3}.center{position:absolute;z-index:5;inset:37%;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);background:conic-gradient(#ff4353 0 25%,#20d47d 0 50%,#ffd34b 0 75%,#438cff 0);display:grid;place-items:center;color:#fff;font-size:28px;text-shadow:0 2px 5px #000}.piece{position:absolute;width:20px;height:20px;border-radius:50%;z-index:7;border:3px solid #fff;box-shadow:0 4px 10px #000}.p1{left:47%;top:20%;background:#ff4353}.p2{left:70%;top:55%;background:#438cff}.p3{left:30%;top:70%;background:#20d47d}.glass-card{position:absolute;padding:18px 20px;border:1px solid rgba(139,166,212,.18);background:rgba(9,17,31,.72);backdrop-filter:blur(18px);border-radius:14px;box-shadow:0 18px 45px rgba(0,0,0,.35);display:grid;gap:5px;min-width:150px}.glass-card small{color:#657792;font-size:8px;font-weight:900;letter-spacing:1.5px}.glass-card strong{font-size:23px}.glass-card em{font-style:normal;color:#4fd89b;font-size:8px;font-weight:900;letter-spacing:1px}.left-card{left:4%;top:22%}.right-card{right:4%;bottom:21%}.right-card em{color:#7183a2}.features{width:min(1100px,100%);margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;position:relative;z-index:2}.features article{padding:22px 20px;border:1px solid #172338;background:linear-gradient(145deg,rgba(10,19,34,.9),rgba(5,11,20,.9));border-radius:14px}.icon{color:#5b9fff;font-size:21px;margin-bottom:14px}.features h3{font-size:10px;letter-spacing:1px;margin:0 0 7px}.features p{margin:0;color:#65758e;font-size:10px;line-height:1.5}.bottom-cta{width:min(1100px,100%);margin:45px auto 0;padding:27px 30px;border:1px solid #263a5b;border-radius:18px;background:linear-gradient(100deg,rgba(22,52,96,.55),rgba(36,15,71,.4));display:flex;align-items:center;justify-content:space-between;gap:20px;position:relative;z-index:2}.bottom-cta small{color:#6685b0;font-size:8px;letter-spacing:2px;font-weight:900}.bottom-cta h2{margin:5px 0 0;font-size:30px;letter-spacing:-1px}.bottom-cta a{color:#fff;text-decoration:none;background:#1769e8;padding:13px 18px;border-radius:10px;font-size:10px;font-weight:950}.bottom-cta a span{margin-left:18px;font-size:15px}footer{width:min(1100px,100%);margin:28px auto;padding:18px 0 25px;border-top:1px solid #111b2a;display:flex;justify-content:space-between;color:#3f4d62;font-size:8px;font-weight:800;letter-spacing:1px;position:relative;z-index:2}@media(max-width:700px){.landing{padding:0 15px}.nav{height:68px}.online{display:none}.hero{padding-top:65px}.hero h1{letter-spacing:-4px}.hero p{font-size:13px}.showcase{height:390px}.board{width:min(350px,88vw)}.glass-card{transform:scale(.78)}.left-card{left:-7%;top:13%}.right-card{right:-7%;bottom:10%}.features{grid-template-columns:1fr 1fr}.bottom-cta{align-items:flex-start;flex-direction:column;padding:24px}.bottom-cta a{width:100%;text-align:center}.trust{gap:9px;flex-wrap:wrap}}@media(max-width:430px){.features{grid-template-columns:1fr}.showcase{height:360px}.glass-card{display:none}.hero h1{font-size:55px}.trust{font-size:8px}}
      `}</style>
    </main>
  );
}
