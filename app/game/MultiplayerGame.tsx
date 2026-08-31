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
        .pg-shell{width:min(680px,calc(100vw - 24px))!important;height:auto!important;max-height:none!important;margin:0 auto!important;padding:120px 0 24px!important;display:grid!important;grid-template-rows:auto auto auto auto auto!important;gap:8px!important;overflow:visible!important}

        .pg-header{position:relative!important;margin-top:0!important;min-height:100px!important;height:100px!important;padding:8px 58px 8px 8px!important;border-radius:25px!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:54px!important;overflow:visible!important}
        .pg-player{height:84px!important;min-width:0!important;padding:7px!important;border-radius:20px!important;gap:7px!important;overflow:hidden!important}
        .pg-avatar-btn{padding:0!important;background:none!important;border:0!important;width:50px!important;height:50px!important;flex:0 0 50px!important}
        .pg-avatar{width:50px!important;height:50px!important}
        .pg-online{width:9px!important;height:9px!important}
        .pg-player-copy b{font-size:13px!important;max-width:105px!important}
        .pg-player-copy small{font-size:8px!important}
        .pg-star{font-size:11px!important}
        .pg-logo{z-index:5!important;background:radial-gradient(circle,#100b03 0 54%,#100b0359 55%,transparent 70%)!important;width:72px!important;height:72px!important;border-radius:50%!important}
        .pg-logo span{font-size:17px!important}.pg-logo strong{font-size:18px!important}.pg-logo b{font-size:10px!important}
        .pg-menu{right:7px!important;width:46px!important;height:50px!important}

        .lux-board-zone{min-height:0!important;overflow:visible!important;display:flex!important;align-items:flex-start!important;justify-content:center!important}
        .pg-board-frame{width:min(calc(100vw - 48px),656px)!important;max-width:656px!important;height:auto!important;aspect-ratio:1/1!important;padding:4px!important;border-radius:26px!important}
        .pg-board-frame>div{width:100%!important;height:100%!important}

        .pg-bottom{grid-template-columns:minmax(145px,1fr) minmax(220px,1.55fr) 82px!important;gap:7px!important;height:190px!important;min-height:190px!important}
        .pg-profile-card,.pg-turn-card{min-height:190px!important;border-radius:20px!important}
        .pg-profile-card{padding:11px!important}.pg-profile-avatar{width:64px!important;height:64px!important}
        .pg-profile-card strong{font-size:14px!important}.pg-stars{font-size:12px!important}.pg-coin-row{padding:7px 9px!important}
        .pg-turn-card{padding:12px!important}.pg-turn-title{font-size:17px!important}.pg-turn-card p{font-size:10px!important;margin:6px 0!important}.pg-dice{position:absolute!important;right:8px!important;top:50%!important;bottom:auto!important;transform:translateY(-50%) scale(.70)!important;transform-origin:center right!important;margin:0!important}
        .pg-comm-actions{gap:7px!important}.pg-comm-actions>button,.pg-voice button{border-radius:17px!important}

        .pg-reaction-row{height:44px!important;min-height:44px!important;flex-wrap:nowrap!important;overflow:hidden!important}.pg-reaction-row button{min-width:0!important;padding:6px 6px!important;font-size:10px!important}
        .pg-utility-row{height:46px!important;min-height:46px!important}.pg-utility-row button{min-height:42px!important;font-size:10px!important}.pg-room{flex:1.5!important}
        .lux-modal-bg{z-index:100!important}

        @media(max-width:700px){
          .pg-shell{width:calc(100vw - 32px)!important;padding-top:70px!important;gap:7px!important}
          .pg-header{height:96px!important;min-height:96px!important;padding:7px 54px 7px 7px!important;border-radius:23px!important;gap:46px!important}
          .pg-player{height:82px!important;border-radius:18px!important}
          .pg-avatar-btn,.pg-avatar{width:50px!important;height:50px!important;flex-basis:50px!important}
          .pg-player-copy b{font-size:12px!important;max-width:78px!important}.pg-player-copy small{font-size:7px!important}
          .pg-logo{width:70px!important;height:70px!important}.pg-logo span{font-size:16px!important}.pg-logo strong{font-size:16px!important}.pg-logo b{font-size:9px!important}
          .pg-menu{width:42px!important;height:46px!important;font-size:23px!important}
          .pg-board-frame{width:calc(100vw - 48px)!important;max-width:none!important}
          .pg-bottom{grid-template-columns:minmax(135px,1fr) minmax(190px,1.45fr) 72px!important;height:190px!important;min-height:190px!important}
          .pg-profile-card,.pg-turn-card{min-height:190px!important;border-radius:18px!important}
          .pg-profile-avatar{width:60px!important;height:60px!important}.pg-profile-card strong{font-size:13px!important}.pg-stars{font-size:11px!important}.pg-coin-row{font-size:11px!important}
          .pg-turn-title{font-size:15px!important}.pg-turn-card p{font-size:9px!important}.pg-dice{right:4px!important;transform:translateY(-50%) scale(.63)!important}
          .pg-comm-actions>button span{font-size:19px!important}.pg-comm-actions b{font-size:9px!important}
          .pg-reaction-row,.pg-utility-row{height:44px!important;min-height:44px!important}.pg-reaction-row button{font-size:9px!important;padding:6px 3px!important}.pg-utility-row button{font-size:9px!important;min-height:40px!important}.pg-room{font-size:8px!important}
        }
        @media(max-width:520px){
          .pg-shell{width:calc(100vw - 24px)!important;padding-top:58px!important}
          .pg-header{height:92px!important;min-height:92px!important;padding:6px 50px 6px 6px!important;gap:38px!important}
          .pg-player{height:80px!important;padding:6px!important}
          .pg-avatar-btn,.pg-avatar{width:46px!important;height:46px!important;flex-basis:46px!important}
          .pg-player-copy b{font-size:10px!important;max-width:70px!important}.pg-player-copy small{font-size:7px!important}.pg-star{font-size:9px!important}
          .pg-logo{width:66px!important;height:66px!important}.pg-logo strong{font-size:14px!important}.pg-logo span{font-size:14px!important}.pg-logo b{font-size:8px!important}
          .pg-menu{width:40px!important;height:44px!important;font-size:21px!important}
          .pg-board-frame{width:calc(100vw - 32px)!important}
          .pg-bottom{grid-template-columns:minmax(112px,1fr) minmax(160px,1.4fr) 64px!important;height:180px!important;min-height:180px!important}
          .pg-profile-card,.pg-turn-card{min-height:180px!important}.pg-profile-avatar{width:54px!important;height:54px!important}
          .pg-turn-title{font-size:14px!important}.pg-dice{right:2px!important;transform:translateY(-50%) scale(.59)!important}.pg-reaction-row button{font-size:8px!important}.pg-utility-row button{font-size:8px!important}
        }
        @media(max-height:900px){
          .pg-shell{padding-top:24px!important}
          .pg-header{height:92px!important;min-height:92px!important}.pg-player{height:76px!important}.pg-avatar-btn,.pg-avatar{width:46px!important;height:46px!important;flex-basis:46px!important}
          .pg-board-frame{width:min(calc(100vw - 32px),calc(100dvh - 330px))!important}.pg-bottom{height:160px!important;min-height:160px!important}.pg-profile-card,.pg-turn-card{min-height:160px!important}.pg-reaction-row{height:40px!important;min-height:40px!important}.pg-utility-row{height:42px!important;min-height:42px!important}
          .pg-dice{transform:translateY(-50%) scale(.58)!important}
        }

        /* Final reference-match HUD: image 2 is the source of truth. */
        .pg-menu{display:none!important}
        .pg-header{grid-template-columns:minmax(0,1fr) 96px minmax(0,1fr)!important;gap:8px!important;padding:5px 8px!important;height:84px!important;min-height:84px!important;align-items:center!important}
        .pg-player:nth-child(1){grid-column:1!important;grid-row:1!important}
        .pg-player:nth-child(2){grid-column:3!important;grid-row:1!important}
        .pg-logo{grid-column:2!important;grid-row:1!important;position:relative!important;left:auto!important;top:auto!important;transform:none!important;justify-self:center!important;width:78px!important;height:78px!important}
        .pg-player{height:68px!important;padding:4px 8px!important;border-radius:17px!important;gap:6px!important}
        .pg-avatar-btn{width:38px!important;height:38px!important;flex:0 0 38px!important}
        .pg-avatar{width:38px!important;height:38px!important;overflow:hidden!important}
        .pg-avatar>span{width:100%!important;height:100%!important}
        .pg-player-copy{min-width:0!important;flex:1 1 auto!important;display:flex!important;flex-direction:column!important;justify-content:center!important;overflow:hidden!important}
        .pg-player-copy b{font-size:11px!important;line-height:1.1!important;max-width:100%!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
        .pg-player-copy small{font-size:7px!important;line-height:1.15!important;white-space:nowrap!important}
        .pg-star{font-size:9px!important;margin-left:2px!important;align-self:flex-end!important}
        .pg-crown{font-size:11px!important}

        .pg-bottom{grid-template-columns:minmax(0,1fr) minmax(0,1.84fr) minmax(90px,.45fr)!important;gap:7px!important;height:160px!important;min-height:160px!important}
        .pg-profile-card,.pg-turn-card{height:160px!important;min-height:160px!important;border-radius:18px!important}
        .pg-profile-card{padding:9px!important;display:grid!important;grid-template-columns:58px minmax(0,1fr)!important;grid-template-rows:54px 1fr 30px!important;column-gap:8px!important;align-items:center!important;overflow:hidden!important}
        .pg-profile-avatar{grid-column:1!important;grid-row:1 / span 2!important;width:44px!important;height:44px!important;margin:0!important;align-self:start!important}
        .pg-profile-avatar>span{width:100%!important;height:100%!important}
        .pg-profile-card strong{grid-column:2!important;grid-row:1!important;align-self:start!important;margin-top:4px!important;font-size:14px!important;line-height:1.1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
        .pg-stars{grid-column:2!important;grid-row:1!important;align-self:end!important;margin:0 0 5px!important;font-size:11px!important;line-height:1!important}
        .pg-edit{grid-column:2!important;grid-row:1!important;justify-self:end!important;align-self:start!important;margin-top:0!important}
        .pg-coin-row{grid-column:1 / -1!important;grid-row:3!important;width:100%!important;height:30px!important;margin:0!important;padding:5px 9px!important;border-radius:15px!important;font-size:11px!important}
        .pg-coin-row a{display:none!important}

        .pg-turn-card{position:relative!important;padding:12px!important;display:block!important;overflow:hidden!important}
        .pg-turn-title{position:relative!important;z-index:2!important;margin:0!important;padding:0!important;max-width:50%!important;font-size:16px!important;line-height:1.05!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
        .pg-turn-card p{position:relative!important;z-index:2!important;margin:6px 0 0!important;max-width:48%!important;font-size:10px!important;line-height:1.2!important}
        .pg-dice{right:4px!important;top:53%!important;bottom:auto!important;transform:translateY(-50%) scale(.70)!important;transform-origin:center right!important;margin:0!important}
        .pg-comm-actions{height:160px!important;gap:7px!important}
        .pg-comm-actions>button,.pg-voice button{min-height:76px!important;border-radius:17px!important}
        .pg-comm-actions>button span{font-size:20px!important}.pg-comm-actions b{font-size:9px!important}.pg-voice{height:76px!important}

        @media(max-width:700px){
          .pg-header{grid-template-columns:minmax(0,1fr) 82px minmax(0,1fr)!important;gap:6px!important;height:82px!important;min-height:82px!important;padding:4px 6px!important}
          .pg-logo{width:68px!important;height:68px!important}
          .pg-player{height:64px!important;padding:4px 6px!important}
          .pg-avatar-btn{width:34px!important;height:34px!important;flex-basis:34px!important}
          .pg-avatar{width:34px!important;height:34px!important}
          .pg-player-copy b{font-size:10px!important}.pg-player-copy small{font-size:7px!important}.pg-star{font-size:8px!important}
          .pg-bottom{grid-template-columns:minmax(0,1fr) minmax(0,1.84fr) minmax(88px,.45fr)!important;height:160px!important;min-height:160px!important}
          .pg-profile-card,.pg-turn-card{height:160px!important;min-height:160px!important}
          .pg-profile-avatar{width:42px!important;height:42px!important}
          .pg-profile-card{grid-template-columns:53px minmax(0,1fr)!important;grid-template-rows:50px 1fr 29px!important;padding:8px!important}
          .pg-profile-card strong{font-size:13px!important}.pg-stars{font-size:10px!important}
          .pg-turn-title{font-size:15px!important}.pg-turn-card p{font-size:9px!important}
          .pg-dice{right:3px!important;top:53%!important;transform:translateY(-50%) scale(.66)!important}
          .pg-comm-actions>button,.pg-voice button{min-height:76px!important}.pg-comm-actions>button span{font-size:18px!important}
        }
        @media(max-width:520px){
          .pg-header{grid-template-columns:minmax(0,1fr) 72px minmax(0,1fr)!important;height:78px!important;min-height:78px!important}
          .pg-logo{width:60px!important;height:60px!important}
          .pg-player{height:60px!important}
          .pg-avatar-btn,.pg-avatar{width:32px!important;height:32px!important;flex-basis:32px!important}
          .pg-player-copy b{font-size:9px!important}.pg-player-copy small{font-size:6px!important}
          .pg-bottom{grid-template-columns:minmax(0,1fr) minmax(0,1.84fr) minmax(84px,.45fr)!important;height:156px!important;min-height:156px!important}
          .pg-profile-card,.pg-turn-card{height:156px!important;min-height:156px!important}
          .pg-profile-avatar{width:40px!important;height:40px!important}.pg-profile-card{grid-template-columns:49px minmax(0,1fr)!important;grid-template-rows:47px 1fr 28px!important}
          .pg-profile-card strong{font-size:12px!important}.pg-stars{font-size:9px!important}
          .pg-turn-title{font-size:14px!important}.pg-turn-card p{font-size:9px!important}
          .pg-dice{transform:translateY(-50%) scale(.62)!important}
          .pg-comm-actions>button,.pg-voice button{min-height:72px!important}
        }
      `}</style>
    </div>
  );
}