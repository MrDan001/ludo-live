"use client";

import MultiplayerGameCanonical from "./MultiplayerGameCanonical";
import MultiplayerHUD from "./MultiplayerHUD";

export default function MultiplayerGame() {
  return <div className="clean-multiplayer-route"><MultiplayerGameCanonical /><style jsx global>{`
    html,body{margin:0!important;padding:0!important;width:100%!important;height:100%!important;overflow:hidden!important;background:#030303!important}
    .clean-multiplayer-route{position:fixed!important;inset:0!important;width:100vw!important;height:100%!important;overflow:hidden!important;background:radial-gradient(circle at 50% 50%,#251b0a,#050403 58%,#020202)!important}
    .clean-multiplayer-route .live-page{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;overflow:hidden!important;background:transparent!important}
    .clean-multiplayer-route .board-stage{position:absolute!important;inset:0!important;display:grid!important;place-items:center!important;padding:0!important}
    .clean-multiplayer-route .board-wrap{width:min(96vw,calc(100svh - 170px),760px)!important;height:min(96vw,calc(100svh - 170px),760px)!important;max-width:760px!important;max-height:760px!important;aspect-ratio:1/1!important}
    .clean-multiplayer-route .board-frame{width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;padding:4px!important;border-radius:25px!important}
    .clean-multiplayer-route .board-frame>div{width:100%!important;height:100%!important;aspect-ratio:1/1!important;border-radius:21px!important;overflow:hidden!important}
    .clean-multiplayer-route .match-badge,.clean-multiplayer-route .turn-pill,.clean-multiplayer-route .board-glow,.clean-multiplayer-route .floating-tools{display:none!important}
    @media(max-width:700px){.clean-multiplayer-route .board-wrap{width:min(94vw,calc(100svh - 155px))!important;height:min(94vw,calc(100svh - 155px))!important}}
  `}</style></div>;
}
