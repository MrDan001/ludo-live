import type { ReactNode } from "react";

export default function GameOnlineLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style dangerouslySetInnerHTML={{ __html: `
        html, body { overflow: hidden !important; }
        .ludo-live-wrapper { height: 100dvh !important; min-height: 0 !important; }
        .ludo-live-wrapper .ludo-live-container { height: 100dvh !important; min-height: 0 !important; grid-template-rows: auto minmax(0,1fr) auto !important; overflow: hidden !important; }
        .ludo-live-wrapper .ll-board-stage { min-height:0 !important; min-width:0 !important; width:100% !important; height:100% !important; overflow:hidden !important; box-sizing:border-box !important; display:flex !important; align-items:center !important; justify-content:center !important; padding:2px 0 6px !important; }
        .ludo-live-wrapper .ll-board-frame { box-sizing:border-box !important; width:min(90vw,600px) !important; height:auto !important; aspect-ratio:1/1 !important; max-width:100% !important; max-height:calc(100% - 2px) !important; flex:0 0 auto !important; margin:0 auto !important; }
        .ludo-live-wrapper .ll-board-frame > * { width:100% !important; height:100% !important; max-width:100% !important; max-height:100% !important; }

        /* Tall/narrow portrait: keep the entire HUD compact and fully inside the viewport. */
        @media (orientation:portrait) and (max-width:900px) and (max-aspect-ratio:1/2) {
          .ludo-live-wrapper .ludo-live-container { padding:8px 10px 6px !important; }
          .ludo-live-wrapper .multiplayer-topbar { min-height:86px !important; padding:0 0 5px !important; gap:6px !important; }
          .ludo-live-wrapper .multiplayer-player-card { height:68px !important; padding:6px 8px !important; gap:6px !important; }
          .ludo-live-wrapper .multiplayer-player-avatar { width:48px !important; height:48px !important; flex-basis:48px !important; }
          .ludo-live-wrapper .multiplayer-player-name-row strong { font-size:12px !important; }
          .ludo-live-wrapper .multiplayer-player-status { font-size:9px !important; }
          .ludo-live-wrapper .multiplayer-level-badge { font-size:10px !important; }
          .ludo-live-wrapper .multiplayer-topbar-logo strong { font-size:25px !important; }
          .ludo-live-wrapper .multiplayer-topbar-logo span:last-child { font-size:14px !important; }

          .ludo-live-wrapper .ll-bottom-panel { height:226px !important; min-height:226px !important; max-height:226px !important; gap:4px !important; overflow:hidden !important; }
          .ludo-live-wrapper .ll-controls-row { height:146px !important; min-height:146px !important; grid-template-columns:128px minmax(0,1fr) 50px !important; gap:5px !important; align-items:stretch !important; }
          .ludo-live-wrapper .ll-user-box,
          .ludo-live-wrapper .ll-dice-box { height:146px !important; min-height:146px !important; padding:7px !important; border-radius:14px !important; box-sizing:border-box !important; }
          .ludo-live-wrapper .ll-user-header { gap:5px !important; }
          .ludo-live-wrapper .ll-user-avatar { width:42px !important; height:42px !important; flex-basis:42px !important; }
          .ludo-live-wrapper .ll-u-name { font-size:11px !important; }
          .ludo-live-wrapper .ll-u-level { font-size:8px !important; }
          .ludo-live-wrapper .ll-coins-pill { min-height:30px !important; height:30px !important; padding:5px 8px !important; font-size:12px !important; }

          /* Dice column gets a real fixed-width visual slot. Do not let the 150px intrinsic DemoDice width overflow. */
          .ludo-live-wrapper .ll-dice-box { grid-template-columns:minmax(0,1fr) 68px !important; gap:0 !important; overflow:visible !important; }
          .ludo-live-wrapper .ll-turn-copy { min-width:0 !important; padding-top:0 !important; }
          .ludo-live-wrapper .ll-turn-title { font-size:10px !important; white-space:nowrap !important; }
          .ludo-live-wrapper .ll-turn-sub { font-size:8px !important; line-height:1.15 !important; }
          .ludo-live-wrapper .ll-dice-result { width:50px !important; height:24px !important; font-size:14px !important; }
          .ludo-live-wrapper .ll-dice-hint { width:60px !important; font-size:6px !important; white-space:nowrap !important; }
          .ludo-live-wrapper .ll-dice-slot { min-width:68px !important; width:68px !important; overflow:visible !important; display:block !important; position:relative !important; }
          .ludo-live-wrapper .ll-dice-slot .dice-area { min-width:0 !important; width:112px !important; transform:scale(.48) !important; transform-origin:top center !important; position:absolute !important; top:2px !important; left:50% !important; margin-left:-56px !important; }
          .ludo-live-wrapper .ll-dice-slot .dice-button { width:112px !important; height:105px !important; }
          .ludo-live-wrapper .ll-dice-slot .cube-wrap { width:70px !important; height:70px !important; }
          .ludo-live-wrapper .ll-dice-slot .cube { width:70px !important; height:70px !important; }
          .ludo-live-wrapper .ll-dice-slot .face { width:70px !important; height:70px !important; }
          .ludo-live-wrapper .ll-dice-slot .dice-value { font-size:14px !important; min-height:18px !important; }
          .ludo-live-wrapper .ll-dice-slot .dice-hint { font-size:7px !important; }

          .ludo-live-wrapper .ll-side-actions { gap:4px !important; }
          .ludo-live-wrapper .ll-action-btn { width:50px !important; height:70px !important; min-height:70px !important; border-radius:12px !important; gap:2px !important; }
          .ludo-live-wrapper .action-icon { font-size:14px !important; }
          .ludo-live-wrapper .ll-action-btn span:last-child { font-size:8px !important; }

          .ludo-live-wrapper .ll-reactions-bar { height:31px !important; min-height:31px !important; gap:4px !important; overflow:hidden !important; }
          .ludo-live-wrapper .ll-pill-btn { min-height:31px !important; height:31px !important; padding:5px 9px !important; font-size:8px !important; border-radius:13px !important; }
          .ludo-live-wrapper .ll-footer { height:31px !important; min-height:31px !important; gap:5px !important; overflow:hidden !important; }
          .ludo-live-wrapper .ll-foot-btn,.ludo-live-wrapper .ll-room-chip { min-height:31px !important; height:31px !important; padding:5px 9px !important; font-size:8px !important; border-radius:12px !important; }

          .ludo-live-wrapper .ll-board-frame { width:min(90vw,600px) !important; max-width:100% !important; max-height:calc(100% - 2px) !important; }
        }

        /* Shorter portrait phones: reserve less space for the HUD and let the board use the freed middle height. */
        @media (orientation:portrait) and (max-width:700px) and (max-height:900px) {
          .ludo-live-wrapper .ll-bottom-panel { gap:4px !important; }
          .ludo-live-wrapper .ll-controls-row { min-height:146px !important; }
          .ludo-live-wrapper .ll-board-frame { width:min(90vw, calc(100dvh - 340px), 600px) !important; }
        }
      ` }} />
    </>
  );
}
