"use client";

export type BoardThemeId = "classic"|"golden"|"neon"|"beach"|"galaxy"|"wood"|"dragon"|"christmas"|"football"|"candy";

export const BOARD_PALETTES:Record<BoardThemeId,{bg:string;green:string;yellow:string;red:string;blue:string;accent:string}>={
  classic:{bg:"#ffffff",green:"#ffffff",yellow:"#ffffff",red:"#ffffff",blue:"#ffffff",accent:"#d7dde5"},
  golden:{bg:"#ffffff",green:"#ffffff",yellow:"#ffffff",red:"#ffffff",blue:"#ffffff",accent:"#d7dde5"},
  neon:{bg:"#ffffff",green:"#ffffff",yellow:"#ffffff",red:"#ffffff",blue:"#ffffff",accent:"#d7dde5"},
  beach:{bg:"#ffffff",green:"#ffffff",yellow:"#ffffff",red:"#ffffff",blue:"#ffffff",accent:"#d7dde5"},
  galaxy:{bg:"#ffffff",green:"#ffffff",yellow:"#ffffff",red:"#ffffff",blue:"#ffffff",accent:"#d7dde5"},
  wood:{bg:"#ffffff",green:"#ffffff",yellow:"#ffffff",red:"#ffffff",blue:"#ffffff",accent:"#d7dde5"},
  dragon:{bg:"#ffffff",green:"#ffffff",yellow:"#ffffff",red:"#ffffff",blue:"#ffffff",accent:"#d7dde5"},
  christmas:{bg:"#ffffff",green:"#ffffff",yellow:"#ffffff",red:"#ffffff",blue:"#ffffff",accent:"#d7dde5"},
  football:{bg:"#ffffff",green:"#ffffff",yellow:"#ffffff",red:"#ffffff",blue:"#ffffff",accent:"#d7dde5"},
  candy:{bg:"#ffffff",green:"#ffffff",yellow:"#ffffff",red:"#ffffff",blue:"#ffffff",accent:"#d7dde5"}
};

export const BOARD_NAMES:Record<BoardThemeId,string>={classic:"Classic Ludo",golden:"Golden Royal",neon:"Neon Glow",beach:"Beach Vibes",galaxy:"Galaxy Space",wood:"Wooden Classic",dragon:"Dragon Theme",christmas:"Christmas Edition",football:"Football Arena",candy:"Candy Land"};

export default function LudoBoard({theme="classic",preview=false,className="",style}: {theme?:BoardThemeId;preview?:boolean;className?:string;style?:React.CSSProperties}){
  const p=BOARD_PALETTES[theme]||BOARD_PALETTES.classic;

  return <div
    className={`shared-ludo-board ${preview?"shared-ludo-board-preview":""} ${className}`.trim()}
    style={{...style,background:p.bg,borderColor:p.accent}}
    aria-label={`${BOARD_NAMES[theme]} Ludo board`}
  >
    <style jsx>{`
      .shared-ludo-board{
        width:100%;
        max-width:100%;
        aspect-ratio:1 / 1;
        position:relative;
        box-sizing:border-box;
        display:block;
        background:#fff;
        border:1px solid #d7dde5;
        border-radius:0;
        overflow:hidden;
        box-shadow:none;
        margin:0 auto;
      }

      .shared-ludo-board-preview{
        width:100%;
        max-width:260px;
        border-width:1px;
      }

      @media(max-width:480px){
        .shared-ludo-board{
          width:100%;
          max-width:100%;
          border-width:1px;
          border-radius:0;
        }
      }
    `}</style>
  </div>;
}
