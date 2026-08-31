"use client";

export default function MultiplayerHUDOverlay() {
  return <div className="multiplayer-hud-overlay" aria-hidden="true">
    <div className="hud-corner hud-corner-left"><span className="hud-live-dot"/>LIVE</div>
    <div className="hud-corner hud-corner-right"><span>💬</span><span>🎙️</span><span>⚙️</span></div>
    <div className="hud-player hud-player-top"><span className="hud-avatar">🦁</span><span><b>Player 1</b><small>LEVEL 1</small></span></div>
    <div className="hud-player hud-player-bottom"><span className="hud-avatar">🐼</span><span><b>Player 2</b><small>LEVEL 1</small></span></div>
    <style jsx>{`.multiplayer-hud-overlay{position:fixed;inset:0;z-index:30;pointer-events:none;color:#fff;font-family:system-ui,-apple-system,sans-serif}.hud-corner{position:absolute;top:max(12px,env(safe-area-inset-top));padding:8px 11px;border:1px solid #ffffff18;border-radius:12px;background:#080808b8;backdrop-filter:blur(12px);font-size:9px;font-weight:900;letter-spacing:1px}.hud-corner-left{left:12px}.hud-corner-right{right:12px;display:flex;gap:10px;font-size:15px}.hud-live-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#45df87;margin-right:6px}.hud-player{position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:7px;padding:6px 10px;border:1px solid #ffffff15;border-radius:14px;background:#080808b8;backdrop-filter:blur(12px);box-shadow:0 8px 24px #0006}.hud-player-top{top:max(56px,calc(env(safe-area-inset-top) + 56px))}.hud-player-bottom{bottom:max(48px,calc(env(safe-area-inset-bottom) + 48px))}.hud-avatar{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#24211a;font-size:16px}.hud-player b,.hud-player small{display:block}.hud-player b{font-size:9px}.hud-player small{font-size:7px;color:#d5b65c;font-weight:900;margin-top:2px}@media(max-width:600px){.hud-player{padding:5px 8px}.hud-player-top{top:56px}.hud-corner{padding:7px 9px}}`}</style>
  </div>;
}
