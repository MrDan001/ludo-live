"use client";

import { useEffect, useState } from "react";

type Props = {
  roomId?: string;
  playerName?: string;
  opponentName?: string;
  playerAvatar?: string;
  opponentAvatar?: string;
  playerStars?: number;
  opponentStars?: number;
  coins?: number;
  isMyTurn?: boolean;
  micOn?: boolean;
  onToggleMic?: () => void;
  onOpenChat?: () => void;
  onOpenPlayers?: () => void;
  onLeave?: () => void;
  onToggleSound?: () => void;
};

export default function InGameComms({
  roomId = "AJSHCM",
  playerName = "Dbase",
  opponentName = "Adaugo",
  playerAvatar = "🧑🏿‍🎮",
  opponentAvatar = "🎮",
  playerStars = 24,
  opponentStars = 18,
  coins = 2450,
  isMyTurn = true,
  micOn = true,
  onToggleMic,
  onOpenChat,
  onOpenPlayers,
  onLeave,
  onToggleSound,
}: Props) {
  const [showVoiceNotice, setShowVoiceNotice] = useState(false);

  useEffect(() => {
    if (!micOn) return;
    const t = window.setTimeout(() => setShowVoiceNotice(false), 2500);
    return () => window.clearTimeout(t);
  }, [micOn]);

  const react = (emoji: string) => {
    window.dispatchEvent(new CustomEvent("ludo:quick-reaction", { detail: emoji }));
  };

  return (
    <section className="premium-hud" aria-label="In-game controls">
      <div className="hud-players">
        <div className="hud-player active">
          <span className="crown">♛</span>
          <div className="avatar"><span>{playerAvatar}</span><i /></div>
          <div className="player-copy"><strong>{playerName} (You)</strong><small><b /> Your Turn</small></div>
          <em>YOU</em>
          <label>★ {playerStars}</label>
        </div>
        <div className="hud-logo" aria-label="Ludo Live"><span>♛</span><strong>LUDO</strong><b>LIVE</b></div>
        <div className="hud-player opponent">
          <div className="avatar"><span>{opponentAvatar}</span><i /></div>
          <div className="player-copy"><strong>{opponentName}</strong><small><b /> IN MATCH</small></div>
          <label>★ {opponentStars}</label>
        </div>
        <button className="menu-btn" aria-label="Menu">☰</button>
      </div>

      <div className="hud-bottom">
        <div className="profile-card">
          <div className="profile-avatar"><span>{playerAvatar}</span><i /></div>
          <button className="edit" aria-label="Edit profile">✎</button>
          <strong>{playerName}</strong>
          <div className="stars">★ {playerStars}</div>
          <div className="coin-row"><span>◉</span>{coins.toLocaleString()}<button>+</button></div>
        </div>

        <div className="turn-card">
          <div className={isMyTurn ? "turn-title mine" : "turn-title"}><i />{isMyTurn ? "YOUR TURN" : "OPPONENT TURN"}</div>
          <p>{isMyTurn ? "Roll the dice and make your move" : "Waiting for opponent..."}</p>
          <button className="dice-result" aria-label="Dice result">6</button>
          <small>Tap the dice to roll</small>
          <div className="dice" aria-hidden="true">⚄</div>
        </div>

        <div className="comm-actions">
          <button onClick={onOpenChat} aria-label="Chat"><span>💬</span><b>Chat</b></button>
          <button onClick={onToggleMic} aria-label={micOn ? "Turn mic off" : "Turn mic on"} className={micOn ? "mic-on" : ""}><span>♩</span><b>Mic {micOn ? "On" : "Off"}</b></button>
        </div>
      </div>

      <div className="reaction-row">
        {["👋 Hi!", "😂 LOL", "🔥 Nice!", "👋 Good move", "🎉 GG", "😎"].map((x) => <button key={x} onClick={() => react(x)}>{x}</button>)}
      </div>

      <div className="utility-row">
        <button className="leave" onClick={onLeave}>⇥ <span>Leave Match</span></button>
        <button onClick={onOpenPlayers}>👥 <span>Players</span></button>
        <button onClick={onToggleSound}>🔊 <span>Sound</span></button>
        <button className="room">🛡 <span>Room ID: {roomId}</span> <b>▣</b></button>
      </div>

      {showVoiceNotice && <div className="voice-notice">Voice is connecting…</div>}

      <style jsx>{`
        .premium-hud{width:100%;max-width:1000px;margin:0 auto;padding:10px 18px 18px;color:#f7edcf;font-family:inherit}.hud-players{display:grid;grid-template-columns:1fr 150px 1fr 62px;gap:14px;align-items:center}.hud-player{position:relative;min-height:88px;border:1px solid rgba(212,167,48,.65);border-radius:25px;background:linear-gradient(145deg,rgba(29,24,12,.94),rgba(6,6,5,.96));display:flex;align-items:center;padding:10px 14px;gap:12px;box-shadow:inset 0 1px rgba(255,255,255,.06),0 8px 24px rgba(0,0,0,.35)}.hud-player.active{box-shadow:inset 0 1px rgba(255,255,255,.08),0 0 22px rgba(212,167,48,.12)}.crown{position:absolute;left:-5px;top:-19px;font-size:32px;color:#f3c63e;transform:rotate(-18deg)}.avatar,.profile-avatar{position:relative;display:grid;place-items:center;border:2px solid #d9b445;border-radius:50%;background:#111;width:64px;height:64px;flex:none;overflow:hidden}.avatar span,.profile-avatar span{font-size:35px}.avatar i,.profile-avatar i{position:absolute;right:0;bottom:1px;width:12px;height:12px;border-radius:50%;background:#19df72;border:2px solid #111}.player-copy{min-width:0;display:flex;flex-direction:column;gap:7px}.player-copy strong{font-size:18px;white-space:nowrap}.player-copy small{font-size:12px;font-weight:800;letter-spacing:.8px;color:#19e66e}.opponent .player-copy small{color:#ff4554}.player-copy small b{display:inline-block;width:10px;height:10px;border-radius:50%;background:currentColor;margin-right:7px}.hud-player em{font-style:normal;font-size:10px;font-weight:900;padding:5px 7px;background:#f1c536;color:#211900;border-radius:7px;margin-left:auto}.hud-player label{position:absolute;left:45px;bottom:-12px;background:#0b0906;border:1px solid #cfa63b;border-radius:14px;padding:3px 9px;font-size:12px}.hud-logo{display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:.8;text-shadow:0 0 18px #d4a82d}.hud-logo span{font-size:28px;color:#f7cf56}.hud-logo strong{font-family:Georgia,serif;font-size:31px;color:#f5d36a}.hud-logo b{font-family:Georgia,serif;font-size:22px;color:#fff}.menu-btn{height:62px;border:1px solid #b98d28;border-radius:18px;background:#100e09;color:#f5c940;font-size:30px}.hud-bottom{display:grid;grid-template-columns:250px 1fr 96px;gap:12px;margin-top:24px}.profile-card,.turn-card{position:relative;border:1px solid rgba(191,147,38,.5);border-radius:22px;background:linear-gradient(145deg,rgba(18,15,9,.97),rgba(4,4,3,.98));box-shadow:inset 0 1px rgba(255,255,255,.05);min-height:210px}.profile-card{padding:16px}.profile-card .profile-avatar{width:78px;height:78px;float:left;margin-right:12px}.profile-card strong{display:block;font-size:22px;padding-top:15px}.stars{font-size:18px;color:#f2c33b;margin-top:8px}.edit{position:absolute;right:13px;top:10px;background:none;border:0;color:#f1ca58;font-size:20px}.coin-row{position:absolute;left:14px;right:14px;bottom:14px;border:1px solid rgba(205,159,48,.5);border-radius:18px;padding:10px 12px;font-size:21px;font-weight:800;display:flex;align-items:center;gap:9px}.coin-row span{color:#f2c33b}.coin-row button{margin-left:auto;width:32px;height:32px;border-radius:50%;border:1px solid #24d96b;background:#0e1b11;color:#25dc6d;font-size:22px}.turn-card{padding:18px 150px 18px 24px}.turn-title{font-size:24px;font-weight:950;color:#f0bd37}.turn-title.mine{color:#19e66e}.turn-title i{display:inline-block;width:14px;height:14px;border-radius:50%;background:currentColor;margin-right:9px;box-shadow:0 0 14px currentColor}.turn-card p{font-size:16px;color:#aaa;margin:13px 0}.dice{position:absolute;right:24px;top:20px;font-size:82px;color:#8c76ff;text-shadow:0 7px 20px #000}.dice-result{position:absolute;left:25px;bottom:38px;width:110px;height:45px;border-radius:25px;border:1px solid #9d7b2c;background:#17130b;color:#fff;font-size:24px}.turn-card small{position:absolute;left:43px;bottom:13px;color:#999}.comm-actions{display:flex;flex-direction:column;gap:10px}.comm-actions button{border:1px solid rgba(199,154,40,.65);border-radius:20px;background:linear-gradient(145deg,#17130a,#060605);color:#f5e4a7;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-size:25px}.comm-actions button b{font-size:14px}.comm-actions .mic-on b{color:#19e66e}.comm-actions .mic-on span{color:#19e66e}.reaction-row,.utility-row{display:flex;gap:10px;margin-top:12px}.reaction-row button,.utility-row button{flex:1;min-height:42px;border:1px solid rgba(194,150,39,.52);border-radius:22px;background:#0c0b08;color:#f2d47a;font-weight:800;font-size:13px;white-space:nowrap}.utility-row .leave{color:#ff4554}.utility-row .room{flex:1.7;color:#999}.utility-row .room b{float:right;font-size:19px;color:#e9d47e}.voice-notice{position:fixed;right:18px;bottom:145px;background:#17130a;border:1px solid #9f7a2d;border-radius:15px;padding:13px;color:#e8d6a2;z-index:50}
        @media(max-width:700px){.premium-hud{padding:6px 8px 12px}.hud-players{grid-template-columns:1fr 1fr 44px;gap:6px}.hud-logo{display:none}.hud-player{min-height:66px;border-radius:18px;padding:7px;gap:7px}.hud-player .avatar{width:47px;height:47px}.hud-player .avatar span{font-size:25px}.player-copy strong{font-size:13px}.player-copy small{font-size:9px;gap:3px}.hud-player em{display:none}.hud-player label{left:35px;font-size:10px}.menu-btn{height:48px;font-size:24px}.hud-bottom{grid-template-columns:112px 1fr 62px;gap:7px;margin-top:17px}.profile-card,.turn-card{min-height:150px;border-radius:16px}.profile-card{padding:9px}.profile-card .profile-avatar{width:53px;height:53px;margin-right:7px}.profile-avatar span{font-size:26px}.profile-card strong{font-size:14px;padding-top:7px}.stars{font-size:12px;margin-top:5px}.coin-row{left:8px;right:8px;bottom:8px;padding:6px;font-size:13px;border-radius:12px}.coin-row button{width:23px;height:23px;font-size:16px}.turn-card{padding:13px 74px 10px 12px}.turn-title{font-size:15px}.turn-title i{width:8px;height:8px}.turn-card p{font-size:10px;margin:7px 0}.dice{font-size:49px;right:6px;top:25px}.dice-result{left:12px;bottom:26px;width:65px;height:31px;font-size:17px}.turn-card small{left:18px;bottom:8px;font-size:8px}.comm-actions button{border-radius:15px;font-size:19px}.comm-actions button b{font-size:10px}.reaction-row{overflow:hidden;gap:5px}.reaction-row button{min-width:76px;font-size:10px;min-height:36px}.utility-row{gap:5px}.utility-row button{font-size:10px;min-height:38px;padding:0 6px}.utility-row button span{font-size:9px}.utility-row .room{display:none}}
      `}</style>
    </section>
  );
}
