"use client";

import MultiplayerGameCanonical from "./MultiplayerGameCanonical";

export default function MultiplayerGame() {
  return (
    <div className="premium-multiplayer-route">
      <MultiplayerGameCanonical />
      <style jsx global>{`
        html,body{margin:0!important;background:#000!important;overflow:hidden!important}
        *{box-sizing:border-box}
        .pg-game{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:auto!important;background:#000!important;color:#f7ecd0!important}
        .pg-shell{width:min(680px,calc(100vw - 24px))!important;height:auto!important;max-height:calc(100dvh - 24px)!important;margin:auto!important;padding:0!important;display:grid!important;grid-template-rows:auto auto auto auto auto!important;gap:8px!important;overflow:visible!important}
        .pg-header{min-height:92px!important;height:92px!important;padding:8px 64px 8px 8px!important;border-radius:24px!important;grid-template-columns:1fr 1fr!important;gap:8px!important;overflow:visible!important}
        .pg-player{height:76px!important;min-width:0!important;padding:7px!important;border-radius:18px!important;gap:8px!important;overflow:hidden!important}
        .pg-avatar-btn{padding:0!important;background:none!important;border:0!important;width:58px!important;height:58px!important;flex:0 0 58px!important}
        .pg-avatar{width:58px!important;height:58px!important}
        .pg-player-copy b{font-size:13px!important;max-width:105px!important}
        .pg-player-copy small{font-size:9px!important}
        .pg-star{font-size:11px!important}
        .pg-logo{z-index:5!important}
        .pg-logo span{font-size:19px!important}.pg-logo strong{font-size:20px!important}.pg-logo b{font-size:13px!important}
        .pg-menu{right:8px!important;width:48px!important;height:52px!important}
        .lux-board-zone{min-height:0!important;overflow:visible!important;display:flex!important;align-items:flex-start!important;justify-content:center!important}
        .pg-board-frame{width:min(100%,660px)!important;max-width:660px!important;height:auto!important;aspect-ratio:1/1!important;padding:4px!important;border-radius:25px!important}
        .pg-board-frame>div{width:100%!important;height:100%!important}
        .pg-bottom{grid-template-columns:minmax(145px,1fr) minmax(220px,1.55fr) 84px!important;gap:7px!important;height:174px!important}
        .pg-profile-card,.pg-turn-card{min-height:174px!important;border-radius:20px!important}
        .pg-profile-card{padding:10px!important}.pg-profile-avatar{width:58px!important;height:58px!important}
        .pg-profile-card strong{font-size:14px!important}.pg-stars{font-size:12px!important}.pg-coin-row{padding:7px 9px!important}
        .pg-turn-card{padding:11px!important}.pg-turn-title{font-size:16px!important}.pg-turn-card p{font-size:11px!important;margin:5px 0!important}.pg-dice{margin-top:-20px!important}
        .pg-comm-actions{gap:7px!important}.pg-comm-actions>button,.pg-voice button{border-radius:17px!important}
        .pg-reaction-row{height:48px!important;flex-wrap:nowrap!important;overflow:hidden!important}.pg-reaction-row button{min-width:0!important;padding:7px 8px!important;font-size:10px!important}
        .pg-utility-row{height:48px!important}.pg-utility-row button{min-height:44px!important;font-size:10px!important}.pg-room{flex:1.5!important}
        .lux-modal-bg{z-index:100!important}
        @media(max-width:700px){
          .pg-shell{width:calc(100vw - 14px)!important;max-height:calc(100dvh - 14px)!important;gap:6px!important}
          .pg-header{height:82px!important;min-height:82px!important;padding:6px 54px 6px 6px!important;border-radius:21px!important}
          .pg-player{height:70px!important;border-radius:17px!important}
          .pg-avatar-btn,.pg-avatar{width:52px!important;height:52px!important;flex-basis:52px!important}
          .pg-player-copy b{font-size:12px!important;max-width:78px!important}.pg-player-copy small{font-size:8px!important}
          .pg-logo span{font-size:17px!important}.pg-logo strong{font-size:17px!important}.pg-logo b{font-size:11px!important}
          .pg-menu{width:43px!important;height:46px!important;font-size:23px!important}
          .pg-board-frame{width:100%!important;max-width:none!important}
          .pg-bottom{grid-template-columns:minmax(125px,1fr) minmax(175px,1.45fr) 68px!important;height:156px!important}
          .pg-profile-card,.pg-turn-card{min-height:156px!important;border-radius:17px!important}
          .pg-profile-avatar{width:50px!important;height:50px!important}.pg-profile-card strong{font-size:12px!important}.pg-stars{font-size:10px!important}.pg-coin-row{font-size:11px!important}
          .pg-turn-title{font-size:13px!important}.pg-turn-card p{font-size:9px!important}.pg-dice{margin-top:-10px!important}
          .pg-comm-actions>button span{font-size:19px!important}.pg-comm-actions b{font-size:9px!important}
          .pg-reaction-row,.pg-utility-row{height:42px!important}.pg-reaction-row button{font-size:8px!important;padding:6px 4px!important}.pg-utility-row button{font-size:9px!important;min-height:40px!important}.pg-room{font-size:8px!important}
        }
        @media(max-width:420px){
          .pg-shell{width:calc(100vw - 10px)!important}.pg-header{height:72px!important;min-height:72px!important;padding-right:48px!important}
          .pg-player{height:60px!important;padding:5px!important}.pg-avatar-btn,.pg-avatar{width:44px!important;height:44px!important;flex-basis:44px!important}
          .pg-player-copy b{font-size:10px!important;max-width:58px!important}.pg-player-copy small{font-size:7px!important}
          .pg-logo span{font-size:14px!important}.pg-logo strong{font-size:14px!important}.pg-logo b{font-size:9px!important}
          .pg-menu{width:38px!important;height:40px!important;font-size:20px!important}
          .pg-bottom{grid-template-columns:minmax(105px,1fr) minmax(145px,1.35fr) 58px!important;height:138px!important}.pg-profile-card,.pg-turn-card{min-height:138px!important}
          .pg-profile-avatar{width:44px!important;height:44px!important}.pg-turn-title{font-size:11px!important}.pg-turn-card p{font-size:8px!important}
          .pg-reaction-row button{font-size:7px!important}.pg-utility-row button{font-size:8px!important;padding:4px!important}
        }
      `}</style>
    </div>
  );
}
