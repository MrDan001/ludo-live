"use client";

import MultiplayerGameCanonical from "./MultiplayerGameCanonical";

export default function MultiplayerGame() {
  return (
    <div className="premium-multiplayer-route">
      <MultiplayerGameCanonical />
      <style jsx global>{`
        html,body{margin:0!important;padding:0!important;background:#000!important;overflow:hidden!important}
        *{box-sizing:border-box}
        .pg-game{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;display:block!important;overflow:hidden!important;background:#000!important;color:#f7ecd0!important}
        .pg-shell{width:min(680px,calc(100vw - 24px))!important;height:auto!important;max-height:none!important;margin:0 auto!important;padding:140px 0 24px!important;display:grid!important;grid-template-rows:auto auto auto auto auto!important;gap:8px!important;overflow:visible!important}

        .pg-header{position:relative!important;margin-top:0!important;min-height:112px!important;height:112px!important;padding:10px 62px 10px 10px!important;border-radius:25px!important;grid-template-columns:1fr 1fr!important;gap:8px!important;overflow:visible!important}
        .pg-player{height:88px!important;min-width:0!important;padding:7px!important;border-radius:20px!important;gap:8px!important;overflow:hidden!important}
        .pg-avatar-btn{padding:0!important;background:none!important;border:0!important;width:56px!important;height:56px!important;flex:0 0 56px!important}
        .pg-avatar{width:56px!important;height:56px!important}
        .pg-online{width:10px!important;height:10px!important}
        .pg-player-copy b{font-size:14px!important;max-width:105px!important}
        .pg-player-copy small{font-size:9px!important}
        .pg-star{font-size:12px!important}
        .pg-logo{z-index:5!important;background:radial-gradient(circle,#100b03 0 56%,#100b0359 57%,transparent 70%)!important;width:82px!important;height:82px!important;border-radius:50%!important}
        .pg-logo span{font-size:18px!important}.pg-logo strong{font-size:19px!important}.pg-logo b{font-size:12px!important}
        .pg-menu{right:8px!important;width:48px!important;height:54px!important}

        .lux-board-zone{min-height:0!important;overflow:visible!important;display:flex!important;align-items:flex-start!important;justify-content:center!important}
        .pg-board-frame{width:min(calc(100vw - 48px),656px)!important;max-width:656px!important;height:auto!important;aspect-ratio:1/1!important;padding:4px!important;border-radius:26px!important}
        .pg-board-frame>div{width:100%!important;height:100%!important}

        .pg-bottom{grid-template-columns:minmax(145px,1fr) minmax(220px,1.55fr) 82px!important;gap:7px!important;height:190px!important;min-height:190px!important}
        .pg-profile-card,.pg-turn-card{min-height:190px!important;border-radius:20px!important}
        .pg-profile-card{padding:11px!important}.pg-profile-avatar{width:64px!important;height:64px!important}
        .pg-profile-card strong{font-size:14px!important}.pg-stars{font-size:12px!important}.pg-coin-row{padding:7px 9px!important}
        .pg-turn-card{padding:12px!important}.pg-turn-title{font-size:17px!important}.pg-turn-card p{font-size:10px!important;margin:6px 0!important}.pg-dice{position:absolute!important;right:16px!important;bottom:8px!important;transform:scale(.78)!important;transform-origin:bottom right!important;margin:0!important}
        .pg-comm-actions{gap:7px!important}.pg-comm-actions>button,.pg-voice button{border-radius:17px!important}

        .pg-reaction-row{height:44px!important;min-height:44px!important;flex-wrap:nowrap!important;overflow:hidden!important}.pg-reaction-row button{min-width:0!important;padding:6px 6px!important;font-size:10px!important}
        .pg-utility-row{height:46px!important;min-height:46px!important}.pg-utility-row button{min-height:42px!important;font-size:10px!important}.pg-room{flex:1.5!important}
        .lux-modal-bg{z-index:100!important}

        @media(max-width:700px){
          .pg-shell{width:calc(100vw - 32px)!important;padding-top:140px!important;gap:7px!important}
          .pg-header{height:112px!important;min-height:112px!important;padding:9px 56px 9px 9px!important;border-radius:23px!important}
          .pg-player{height:88px!important;border-radius:19px!important}
          .pg-avatar-btn,.pg-avatar{width:54px!important;height:54px!important;flex-basis:54px!important}
          .pg-player-copy b{font-size:13px!important;max-width:88px!important}.pg-player-copy small{font-size:8px!important}
          .pg-logo{width:78px!important;height:78px!important}.pg-logo span{font-size:17px!important}.pg-logo strong{font-size:17px!important}.pg-logo b{font-size:10px!important}
          .pg-menu{width:44px!important;height:48px!important;font-size:23px!important}
          .pg-board-frame{width:calc(100vw - 48px)!important;max-width:none!important}
          .pg-bottom{grid-template-columns:minmax(135px,1fr) minmax(190px,1.45fr) 72px!important;height:190px!important;min-height:190px!important}
          .pg-profile-card,.pg-turn-card{min-height:190px!important;border-radius:18px!important}
          .pg-profile-avatar{width:60px!important;height:60px!important}.pg-profile-card strong{font-size:13px!important}.pg-stars{font-size:11px!important}.pg-coin-row{font-size:11px!important}
          .pg-turn-title{font-size:15px!important}.pg-turn-card p{font-size:9px!important}.pg-dice{transform:scale(.72)!important}
          .pg-comm-actions>button span{font-size:19px!important}.pg-comm-actions b{font-size:9px!important}
          .pg-reaction-row,.pg-utility-row{height:44px!important;min-height:44px!important}.pg-reaction-row button{font-size:9px!important;padding:6px 3px!important}.pg-utility-row button{font-size:9px!important;min-height:40px!important}.pg-room{font-size:8px!important}
        }
        @media(max-width:520px){
          .pg-shell{width:calc(100vw - 24px)!important;padding-top:120px!important}
          .pg-header{height:104px!important;min-height:104px!important;padding:8px 52px 8px 8px!important}
          .pg-player{height:88px!important;padding:6px!important}
          .pg-avatar-btn,.pg-avatar{width:48px!important;height:48px!important;flex-basis:48px!important}
          .pg-player-copy b{font-size:11px!important;max-width:72px!important}.pg-player-copy small{font-size:7px!important}.pg-star{font-size:10px!important}
          .pg-logo{width:72px!important;height:72px!important}.pg-logo strong{font-size:15px!important}.pg-logo span{font-size:15px!important}.pg-logo b{font-size:9px!important}
          .pg-menu{width:42px!important;height:46px!important;font-size:22px!important}
          .pg-board-frame{width:calc(100vw - 32px)!important}
          .pg-bottom{grid-template-columns:minmax(112px,1fr) minmax(160px,1.4fr) 64px!important;height:180px!important;min-height:180px!important}
          .pg-profile-card,.pg-turn-card{min-height:180px!important}.pg-profile-avatar{width:54px!important;height:54px!important}
          .pg-turn-title{font-size:14px!important}.pg-dice{transform:scale(.68)!important}.pg-reaction-row button{font-size:8px!important}.pg-utility-row button{font-size:8px!important}
        }
        @media(max-height:900px){
          .pg-shell{padding-top:54px!important}
          .pg-header{height:92px!important;min-height:92px!important}.pg-player{height:76px!important}.pg-avatar-btn,.pg-avatar{width:48px!important;height:48px!important;flex-basis:48px!important}
          .pg-board-frame{width:min(calc(100vw - 32px),calc(100dvh - 330px))!important}.pg-bottom{height:160px!important;min-height:160px!important}.pg-profile-card,.pg-turn-card{min-height:160px!important}.pg-reaction-row{height:40px!important;min-height:40px!important}.pg-utility-row{height:42px!important;min-height:42px!important}
        }
      `}</style>
    </div>
  );
}
