"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [boardImage, setBoardImage] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/ludo-board.b64")
      .then((r) => r.text())
      .then((b64) => {
        if (alive && b64.trim()) setBoardImage(`data:image/webp;base64,${b64.trim()}`);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <main className="landing">
      <div className="stars" aria-hidden="true" />
      <div className="aurora auroraOne" aria-hidden="true" />
      <div className="aurora auroraTwo" aria-hidden="true" />
      <div className="aurora auroraThree" aria-hidden="true" />

      <nav className="nav">
        <Link href="/" className="brand" aria-label="Ludo Live home">
          <span className="brandMark">◆</span>
          <span>LUDO</span>
          <b>LIVE</b>
        </Link>
        <div className="navRight">
          <span className="livePill"><i /> LIVE PLAY</span>
          <Link href="/account?mode=login" className="navSignIn">Sign in</Link>
          <Link href="/account?mode=create" className="navJoin">Join free <span>↗</span></Link>
        </div>
      </nav>

      <section className="hero">
        <div className="heroCopy">
          <div className="eyebrow"><span>✦</span> THE LUDO LIVE EXPERIENCE</div>
          <h1>Roll it.<br /><span>Own it.</span></h1>
          <p className="lead">
            A modern Ludo arena built for <strong>live multiplayer, tournaments, missions and rewards.</strong>
            Roll the dice, make your move and climb your way to the top.
          </p>

          <div className="heroActions">
            <Link href="/account?mode=create" className="primaryCta">
              <span className="ctaIcon">🎲</span>
              <span><small>START PLAYING</small><b>Create free account</b></span>
              <strong>→</strong>
            </Link>
            <Link href="/account?mode=login" className="secondaryCta">
              I already have an account <span>→</span>
            </Link>
          </div>

          <div className="trustLine">
            <div className="avatarStack" aria-hidden="true"><span>🧑🏽</span><span>👩🏾</span><span>🧑🏻</span><span>👨🏿</span></div>
            <div><b>Ready when you are.</b><small>Play fair. Play live. Play Ludo.</small></div>
            <span className="shield">🛡️</span>
          </div>
        </div>

        <div className="heroVisual">
          <div className="visualGlow" />
          <div className="orbit orbitOne" />
          <div className="orbit orbitTwo" />
          <div className="floatingChip chipTop"><span>🏆</span><div><b>Tournaments</b><small>Compete & climb</small></div></div>
          <div className="floatingChip chipBottom"><span>⚡</span><div><b>Live matches</b><small>Real-time action</small></div></div>
          <div className="dice diceOne">🎲</div>
          <div className="dice diceTwo">🎲</div>
          <div className="boardFrame">
            <div className="boardHalo" />
            {boardImage ? (
              <img className="heroBoard" src={boardImage} alt="Ludo Live game board" />
            ) : (
              <div className="boardFallback"><span>🎲</span><b>LUDO LIVE</b></div>
            )}
          </div>
        </div>
      </section>

      <section className="featureStrip" aria-label="Ludo Live highlights">
        <div className="stripItem"><span>♟</span><div><b>Multiplayer</b><small>Play together in real time</small></div></div>
        <div className="stripItem"><span>🏆</span><div><b>Tournaments</b><small>Compete for the top spot</small></div></div>
        <div className="stripItem"><span>🎯</span><div><b>Missions</b><small>Complete goals and earn rewards</small></div></div>
        <div className="stripItem"><span>💎</span><div><b>Rewards</b><small>Make your progress matter</small></div></div>
      </section>

      <section className="section showcase">
        <div className="sectionHeading">
          <div><span>BUILT FOR EVERY MOVE</span><h2>Everything happens<br /><em>inside the game.</em></h2></div>
          <p>From your first roll to the final token home, Ludo Live keeps the experience social, competitive and rewarding.</p>
        </div>
        <div className="featureGrid">
          <article className="featureCard cardBlue"><div className="cardNumber">01</div><div className="featureIcon">♟</div><h3>Live Multiplayer</h3><p>Challenge other players and make every turn count with real-time Ludo rooms.</p><div className="cardLine" /></article>
          <article className="featureCard cardGold"><div className="cardNumber">02</div><div className="featureIcon">🏆</div><h3>Reward Tournaments</h3><p>Enter dedicated competitions, track your points and fight your way up the standings.</p><div className="cardLine" /></article>
          <article className="featureCard cardPurple"><div className="cardNumber">03</div><div className="featureIcon">🎯</div><h3>Daily Missions</h3><p>Fresh daily challenges give your normal gameplay another reason to keep rolling.</p><div className="cardLine" /></article>
          <article className="featureCard cardGreen"><div className="cardNumber">04</div><div className="featureIcon">💎</div><h3>Meaningful Rewards</h3><p>Build up your coins, gems, progress and achievements as you play.</p><div className="cardLine" /></article>
        </div>
      </section>

      <section className="section playSection">
        <div className="playPanel">
          <div className="miniBoard" aria-hidden="true"><div className="miniCenter">🎲</div><i className="miniToken red" /><i className="miniToken blue" /><i className="miniToken green" /><i className="miniToken yellow" /></div>
          <div className="playCopy">
            <span className="eyebrow">YOUR NEXT GAME IS WAITING</span>
            <h2>One roll can<br /><em>change everything.</em></h2>
            <p>Join Ludo Live and enter a game built around the way you actually want to play.</p>
            <Link href="/account?mode=create" className="wideCta">CREATE YOUR FREE ACCOUNT <b>→</b></Link>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footerBrand"><span className="brandMark">◆</span> LUDO <b>LIVE</b></div>
        <span>© 2026 Ludo Live</span>
        <span>SECURE · FAIR · SOCIAL</span>
      </footer>

      <style>{`
        *{box-sizing:border-box}
        .landing{min-height:100dvh;overflow:hidden;position:relative;background:#020611;color:#f7f9ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:0 22px}
        .landing:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 10%,rgba(35,82,180,.16),transparent 35%),linear-gradient(rgba(91,132,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(91,132,255,.035) 1px,transparent 1px);background-size:auto,68px 68px,68px 68px;pointer-events:none}
        .stars{position:absolute;inset:0;opacity:.45;background-image:radial-gradient(circle,rgba(255,255,255,.75) 0 1px,transparent 1.5px),radial-gradient(circle,rgba(91,170,255,.55) 0 1px,transparent 1.5px);background-size:127px 127px,193px 193px;background-position:15px 22px,83px 41px;animation:starsDrift 18s linear infinite;pointer-events:none}
        .aurora{position:absolute;border-radius:50%;filter:blur(100px);pointer-events:none;opacity:.24;animation:floatGlow 9s ease-in-out infinite}
        .auroraOne{width:420px;height:420px;left:-240px;top:170px;background:#006dff}.auroraTwo{width:480px;height:480px;right:-260px;top:270px;background:#7c19ff;animation-delay:-3s}.auroraThree{width:360px;height:360px;left:35%;top:780px;background:#00b8ff;opacity:.1;animation-delay:-6s}
        .nav{width:min(1180px,100%);height:82px;margin:auto;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08);position:relative;z-index:10}
        .brand{display:flex;align-items:center;gap:6px;text-decoration:none;color:#fff;font-size:20px;font-weight:950;letter-spacing:-1px}.brandMark{color:#5ebcff;text-shadow:0 0 18px #168fff;margin-right:2px}.brand b,.footerBrand b{font-size:9px;letter-spacing:1px;background:linear-gradient(90deg,#159cff,#a51cff);padding:5px 7px;border-radius:6px;margin-left:3px}
        .navRight{display:flex;align-items:center;gap:18px;font-size:11px;font-weight:850}.livePill{color:#9eacc4;letter-spacing:1px}.livePill i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#35e99b;box-shadow:0 0 13px #35e99b;margin-right:7px;animation:pulse 1.8s ease-in-out infinite}.navSignIn{color:#c7d0df;text-decoration:none}.navJoin{color:#fff;text-decoration:none;border:1px solid #34486e;border-radius:10px;padding:10px 13px;background:rgba(8,18,40,.65)}.navJoin span{color:#67bdff;margin-left:6px}
        .hero{width:min(1180px,100%);min-height:670px;margin:auto;display:grid;grid-template-columns:46% 54%;align-items:center;position:relative;z-index:2}.heroCopy{padding:70px 0 55px}.eyebrow{display:inline-flex;align-items:center;gap:8px;color:#63b9ff;font-size:9px;font-weight:950;letter-spacing:2.5px}.eyebrow span{color:#b468ff;font-size:13px}.hero h1{font-size:clamp(70px,8vw,112px);line-height:.86;letter-spacing:-7px;margin:24px 0 25px;font-weight:950}.hero h1 span{background:linear-gradient(100deg,#15a5ff,#7350ff 58%,#cf35ff);-webkit-background-clip:text;color:transparent;text-shadow:0 0 50px rgba(79,80,255,.12)}.lead{max-width:520px;color:#a7b4ca;font-size:15px;line-height:1.75;margin:0}.lead strong{color:#f4c92f;font-weight:850}.heroActions{margin-top:30px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}.primaryCta{min-width:260px;display:flex;align-items:center;gap:12px;padding:12px 14px;text-decoration:none;color:#fff;border:1px solid rgba(114,154,255,.35);border-radius:13px;background:linear-gradient(100deg,#067fff,#771cff);box-shadow:0 18px 45px rgba(36,78,255,.26);transition:transform .25s,box-shadow .25s}.primaryCta:hover{transform:translateY(-3px);box-shadow:0 22px 55px rgba(36,78,255,.38)}.ctaIcon{width:39px;height:39px;display:grid;place-items:center;background:rgba(255,255,255,.12);border-radius:10px;font-size:21px}.primaryCta span:nth-child(2){display:grid;gap:2px;text-align:left}.primaryCta small{font-size:8px;letter-spacing:1.4px;color:#c8e7ff}.primaryCta b{font-size:12px}.primaryCta>strong{margin-left:auto;font-size:20px}.secondaryCta{color:#9daac0;text-decoration:none;border:1px solid #293b5d;border-radius:12px;padding:15px 16px;font-size:10px;font-weight:850;background:rgba(4,11,25,.55)}.secondaryCta span{color:#5dbaff;margin-left:7px}.trustLine{margin-top:25px;display:flex;align-items:center;gap:10px;color:#aab6c9}.trustLine b{display:block;color:#e5ebf6;font-size:10px}.trustLine small{display:block;font-size:9px;margin-top:2px;color:#687a96}.avatarStack{display:flex;padding-left:8px}.avatarStack span{width:28px;height:28px;margin-left:-8px;display:grid;place-items:center;border-radius:50%;border:2px solid #0b1428;background:#18243e;font-size:14px}.shield{margin-left:8px;opacity:.75}
        .heroVisual{height:620px;display:grid;place-items:center;position:relative}.visualGlow{position:absolute;width:480px;height:370px;border-radius:50%;background:radial-gradient(circle,#1d5dff 0,rgba(79,40,255,.42) 40%,transparent 72%);filter:blur(35px);animation:glowPulse 4.5s ease-in-out infinite}.boardFrame{width:min(610px,52vw);position:relative;transform:perspective(1200px) rotateY(-5deg) rotateX(2deg);animation:boardFloat 5.5s ease-in-out infinite}.boardFrame:after{content:"";position:absolute;inset:6%;border-radius:30px;box-shadow:0 35px 80px rgba(0,0,0,.7);pointer-events:none}.boardHalo{position:absolute;inset:9%;border-radius:30px;background:linear-gradient(135deg,#00a5ff,#7d25ff,#ff2c7c);filter:blur(28px);opacity:.32}.heroBoard{position:relative;z-index:2;width:100%;height:auto;display:block;object-fit:contain;border-radius:23px;filter:drop-shadow(0 25px 25px rgba(0,0,0,.35))}.boardFallback{position:relative;z-index:2;aspect-ratio:1;border-radius:28px;display:grid;place-items:center;align-content:center;gap:15px;background:conic-gradient(#20bd65 0 25%,#ffd22e 0 50%,#2d70ef 0 75%,#ef3150 0);box-shadow:0 30px 80px #000a}.boardFallback span{font-size:76px}.boardFallback b{font-size:24px;letter-spacing:3px}
        .orbit{position:absolute;border:1px solid rgba(99,170,255,.18);border-radius:50%;animation:spin 17s linear infinite}.orbitOne{width:540px;height:540px}.orbitTwo{width:680px;height:360px;transform:rotate(-20deg);animation-direction:reverse;animation-duration:22s}.dice{position:absolute;z-index:5;font-size:47px;filter:drop-shadow(0 15px 15px #0008);animation:diceFloat 4s ease-in-out infinite}.diceOne{right:7%;top:17%;transform:rotate(16deg)}.diceTwo{left:8%;bottom:14%;font-size:38px;animation-delay:-2s;transform:rotate(-18deg)}.floatingChip{position:absolute;z-index:6;display:flex;align-items:center;gap:9px;padding:10px 12px;border:1px solid rgba(120,161,255,.32);border-radius:13px;background:rgba(5,13,32,.8);backdrop-filter:blur(15px);box-shadow:0 18px 40px #0006;animation:chipFloat 4.5s ease-in-out infinite}.floatingChip>span{width:35px;height:35px;display:grid;place-items:center;border-radius:10px;background:linear-gradient(145deg,#213f8c,#32155c);font-size:18px}.floatingChip b,.floatingChip small{display:block}.floatingChip b{font-size:10px}.floatingChip small{font-size:8px;color:#7183a1;margin-top:2px}.chipTop{right:1%;top:12%}.chipBottom{left:1%;bottom:11%;animation-delay:-2.2s}.chipBottom>span{background:linear-gradient(145deg,#0a664d,#0a3562)}
        .featureStrip{width:min(1120px,100%);margin:-5px auto 0;position:relative;z-index:7;display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #22375e;border-radius:18px;background:linear-gradient(100deg,rgba(7,19,46,.96),rgba(5,11,29,.96));box-shadow:0 25px 60px #0005;overflow:hidden}.stripItem{display:flex;align-items:center;gap:12px;padding:18px 21px;border-right:1px solid #1d2e4e}.stripItem:last-child{border-right:0}.stripItem>span{font-size:24px}.stripItem b,.stripItem small{display:block}.stripItem b{font-size:11px}.stripItem small{font-size:8px;color:#70819c;margin-top:4px}
        .section{width:min(1180px,100%);margin:95px auto 0;position:relative;z-index:2}.sectionHeading{display:grid;grid-template-columns:1fr 360px;gap:50px;align-items:end}.sectionHeading>div>span{font-size:9px;letter-spacing:2.5px;font-weight:950;color:#5faeff}.sectionHeading h2{font-size:44px;line-height:1;letter-spacing:-2.5px;margin:13px 0 0}.sectionHeading h2 em{font-style:normal;background:linear-gradient(90deg,#6fbaff,#bd52ff);-webkit-background-clip:text;color:transparent}.sectionHeading p{color:#8494ad;font-size:11px;line-height:1.8;margin:0 0 3px}.featureGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:35px}.featureCard{position:relative;min-height:250px;padding:22px;border-radius:17px;border:1px solid #263a61;background:linear-gradient(160deg,rgba(9,23,52,.92),rgba(4,10,25,.96));overflow:hidden;transition:transform .25s,border-color .25s}.featureCard:hover{transform:translateY(-7px);border-color:#4d70ae}.cardNumber{position:absolute;right:14px;top:10px;font-size:25px;font-weight:950;color:#172b4d}.featureIcon{width:52px;height:52px;display:grid;place-items:center;border-radius:14px;background:#0d2347;font-size:25px;margin-bottom:32px}.featureCard h3{font-size:15px;margin:0 0 10px}.featureCard p{font-size:10px;line-height:1.75;color:#7e8fa9;margin:0}.cardLine{position:absolute;left:22px;bottom:18px;width:42px;height:2px;border-radius:2px}.cardBlue .featureIcon{box-shadow:0 0 25px rgba(30,144,255,.16)}.cardBlue h3{color:#65baff}.cardBlue .cardLine{background:#2f91ff}.cardGold .featureIcon{background:#3a2c0d}.cardGold h3{color:#ffd341}.cardGold .cardLine{background:#f5c62e}.cardPurple .featureIcon{background:#2d1648}.cardPurple h3{color:#d179ff}.cardPurple .cardLine{background:#b94cff}.cardGreen .featureIcon{background:#0b3a31}.cardGreen h3{color:#3de0ad}.cardGreen .cardLine{background:#22d69e}
        .playSection{margin-top:100px}.playPanel{min-height:420px;position:relative;display:grid;grid-template-columns:42% 58%;align-items:center;padding:45px 55px;border-radius:25px;border:1px solid #304d80;background:radial-gradient(circle at 15% 50%,rgba(26,111,255,.22),transparent 30%),linear-gradient(120deg,#071a3b,#100b2b 70%,#060a19);overflow:hidden}.playPanel:after{content:"";position:absolute;width:420px;height:420px;border-radius:50%;right:-120px;top:-130px;background:radial-gradient(circle,rgba(137,42,255,.25),transparent 67%);filter:blur(8px)}.miniBoard{width:290px;aspect-ratio:1;border-radius:50%;position:relative;display:grid;place-items:center;background:conic-gradient(#24b867 0 25%,#f9c91d 0 50%,#2d6ff0 0 75%,#ef3150 0);box-shadow:0 25px 70px #0009,0 0 60px rgba(36,98,255,.17);animation:slowSpin 15s linear infinite}.miniBoard:before{content:"";position:absolute;width:54%;height:54%;background:#07152e;border:2px solid rgba(255,255,255,.14);transform:rotate(45deg);border-radius:13px}.miniCenter{position:relative;z-index:2;font-size:45px;animation:counterSpin 15s linear infinite}.miniToken{position:absolute;width:34px;height:34px;border-radius:50%;border:4px solid rgba(255,255,255,.75);box-shadow:0 7px 13px #0008}.miniToken.red{background:#ef3150;left:31px;top:31px}.miniToken.blue{background:#2d70ef;right:31px;top:31px}.miniToken.green{background:#20bd65;left:31px;bottom:31px}.miniToken.yellow{background:#f8c921;right:31px;bottom:31px}.playCopy{position:relative;z-index:2}.playCopy h2{font-size:49px;line-height:.95;letter-spacing:-2.5px;margin:14px 0}.playCopy h2 em{font-style:normal;color:#a24cff}.playCopy p{max-width:430px;color:#8e9db5;font-size:12px;line-height:1.8}.wideCta{display:inline-flex;align-items:center;justify-content:space-between;min-width:260px;margin-top:12px;padding:14px 17px;border-radius:11px;color:#fff;text-decoration:none;background:linear-gradient(90deg,#078fff,#801fff);font-size:9px;font-weight:950;letter-spacing:.6px;box-shadow:0 14px 35px rgba(60,39,255,.24)}.wideCta b{font-size:16px}
        .footer{width:min(1180px,100%);margin:30px auto 0;padding:24px 0 32px;border-top:1px solid #14213a;color:#50617c;display:flex;justify-content:space-between;align-items:center;font-size:8px;font-weight:900;letter-spacing:1px;position:relative;z-index:2}.footerBrand{color:#dce6f5;font-size:15px}.footerBrand .brandMark{font-size:12px}
        @keyframes boardFloat{0%,100%{transform:perspective(1200px) rotateY(-5deg) rotateX(2deg) translateY(0)}50%{transform:perspective(1200px) rotateY(-2deg) rotateX(1deg) translateY(-13px)}}
        @keyframes diceFloat{0%,100%{translate:0 0 rotate(0)}50%{translate:0 -12px rotate(9deg)}}
        @keyframes chipFloat{0%,100%{translate:0 0}50%{translate:0 -9px}}
        @keyframes glowPulse{0%,100%{opacity:.65;scale:1}50%{opacity:.95;scale:1.08}}
        @keyframes floatGlow{0%,100%{translate:0 0}50%{translate:0 -25px}}
        @keyframes starsDrift{from{transform:translateY(0)}to{transform:translateY(68px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slowSpin{to{transform:rotate(360deg)}}
        @keyframes counterSpin{to{transform:rotate(-360deg)}}
        @keyframes pulse{0%,100%{scale:1;opacity:1}50%{scale:1.5;opacity:.65}}
        @media(max-width:980px){.hero{grid-template-columns:1fr;min-height:auto}.heroCopy{text-align:center;padding:65px 0 10px}.lead{margin:auto}.heroActions,.trustLine{justify-content:center}.heroVisual{height:570px}.boardFrame{width:min(650px,80vw)}.featureStrip{grid-template-columns:1fr 1fr}.stripItem:nth-child(2){border-right:0}.featureGrid{grid-template-columns:1fr 1fr}.sectionHeading{grid-template-columns:1fr;gap:15px}.sectionHeading p{max-width:580px}.playPanel{grid-template-columns:36% 64%;padding:35px}.miniBoard{width:240px}}
        @media(max-width:650px){.landing{padding:0 14px}.nav{height:68px}.navRight{gap:9px}.livePill{display:none}.navJoin{padding:9px 10px}.navSignIn{font-size:10px}.hero h1{font-size:70px;letter-spacing:-5px}.heroCopy{padding-top:52px}.lead{font-size:12px;line-height:1.7}.heroActions{flex-direction:column;align-items:stretch}.primaryCta,.secondaryCta{width:100%;justify-content:center}.trustLine{text-align:left}.heroVisual{height:390px}.boardFrame{width:96vw;max-width:560px}.orbitOne{width:350px;height:350px}.orbitTwo{width:420px;height:250px}.floatingChip{transform:scale(.78)}.chipTop{right:-18px;top:7%}.chipBottom{left:-18px;bottom:7%}.dice{font-size:32px}.diceOne{right:3%;top:11%}.diceTwo{left:4%;bottom:8%}.featureStrip{margin-top:15px}.stripItem{padding:15px 13px}.stripItem>span{font-size:20px}.stripItem small{font-size:7px}.section{margin-top:70px}.sectionHeading h2{font-size:37px}.featureGrid{grid-template-columns:1fr 1fr;gap:9px}.featureCard{min-height:235px;padding:17px}.featureIcon{width:45px;height:45px;font-size:21px;margin-bottom:25px}.featureCard h3{font-size:12px}.featureCard p{font-size:9px}.playSection{margin-top:75px}.playPanel{grid-template-columns:1fr;padding:25px 20px;text-align:center;min-height:auto;gap:20px}.miniBoard{width:180px;margin:auto}.playCopy h2{font-size:38px}.playCopy p{margin:0 auto}.wideCta{width:100%}.footer{font-size:7px}.footerBrand{font-size:12px}.footer>span:last-child{display:none}}
        @media(max-width:390px){.hero h1{font-size:60px}.featureGrid{grid-template-columns:1fr}.featureCard{min-height:210px}.featureStrip{grid-template-columns:1fr}.stripItem{border-right:0;border-bottom:1px solid #1d2e4e}.stripItem:last-child{border-bottom:0}.floatingChip{display:none}}
        @media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.001ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition:none!important}}
      `}</style>
    </main>
  );
}
