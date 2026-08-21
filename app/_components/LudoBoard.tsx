"use client";

export type BoardThemeId = "classic"|"golden"|"neon"|"beach"|"galaxy"|"wood"|"dragon"|"christmas"|"football"|"candy";

export const BOARD_PALETTES:Record<BoardThemeId,{bg:string;green:string;yellow:string;red:string;blue:string;accent:string}>={
  classic:{bg:"#ffffff",green:"#39b85a",yellow:"#f5c328",red:"#ef3b3b",blue:"#3478e5",accent:"#222222"},
  golden:{bg:"#ffffff",green:"#39b85a",yellow:"#f5c328",red:"#ef3b3b",blue:"#3478e5",accent:"#222222"},
  neon:{bg:"#ffffff",green:"#39b85a",yellow:"#f5c328",red:"#ef3b3b",blue:"#3478e5",accent:"#222222"},
  beach:{bg:"#ffffff",green:"#39b85a",yellow:"#f5c328",red:"#ef3b3b",blue:"#3478e5",accent:"#222222"},
  galaxy:{bg:"#ffffff",green:"#39b85a",yellow:"#f5c328",red:"#ef3b3b",blue:"#3478e5",accent:"#222222"},
  wood:{bg:"#ffffff",green:"#39b85a",yellow:"#f5c328",red:"#ef3b3b",blue:"#3478e5",accent:"#222222"},
  dragon:{bg:"#ffffff",green:"#39b85a",yellow:"#f5c328",red:"#ef3b3b",blue:"#3478e5",accent:"#222222"},
  christmas:{bg:"#ffffff",green:"#39b85a",yellow:"#f5c328",red:"#ef3b3b",blue:"#3478e5",accent:"#222222"},
  football:{bg:"#ffffff",green:"#39b85a",yellow:"#f5c328",red:"#ef3b3b",blue:"#3478e5",accent:"#222222"},
  candy:{bg:"#ffffff",green:"#39b85a",yellow:"#f5c328",red:"#ef3b3b",blue:"#3478e5",accent:"#222222"}
};

export const BOARD_NAMES:Record<BoardThemeId,string>={classic:"Classic Ludo",golden:"Golden Royal",neon:"Neon Glow",beach:"Beach Vibes",galaxy:"Galaxy Space",wood:"Wooden Classic",dragon:"Dragon Theme",christmas:"Christmas Edition",football:"Football Arena",candy:"Candy Land"};

export default function LudoBoard({theme="classic",preview=false,className="",style}: {theme?:BoardThemeId;preview?:boolean;className?:string;style?:React.CSSProperties}){
  const p=BOARD_PALETTES[theme]||BOARD_PALETTES.classic;
  const cells=Array.from({length:225},(_,index)=>({index,row:Math.floor(index/15),col:index%15}));

  return <div className={`shared-ludo-board ${preview?"shared-ludo-board-preview":""} ${className}`.trim()} style={{...style,background:p.bg,borderColor:p.accent}} aria-label={`${BOARD_NAMES[theme]} Ludo board`}>
    {cells.map(({index,row,col})=>{
      const isTrack=row>=6&&row<=8||col>=6&&col<=8;
      const isGreenLane=col===7&&row<6;
      const isYellowLane=row===7&&col>8;
      const isRedLane=row===7&&col<6;
      const isBlueLane=col===7&&row>8;
      const laneClass=isGreenLane?"lane-green":isYellowLane?"lane-yellow":isRedLane?"lane-red":isBlueLane?"lane-blue":"";
      return <div className={`board-cell ${isTrack?"track-cell":""} ${laneClass}`} key={index} aria-hidden="true"/>;
    })}

    <div className="home-area home-green" aria-hidden="true" />
    <div className="home-area home-yellow" aria-hidden="true" />
    <div className="home-area home-red" aria-hidden="true" />
    <div className="home-area home-blue" aria-hidden="true" />

    <style jsx>{`
      .shared-ludo-board{width:100%;max-width:100%;aspect-ratio:1 / 1;position:relative;box-sizing:border-box;display:grid;grid-template-columns:repeat(15,minmax(0,1fr));grid-template-rows:repeat(15,minmax(0,1fr));background:#fff;border:1px solid #222;border-radius:0;overflow:hidden;box-shadow:none;margin:0 auto}
      .board-cell{min-width:0;min-height:0;box-sizing:border-box;background:#fff;border-right:1px solid #222;border-bottom:1px solid #222}
      .board-cell:nth-child(15n){border-right:0}.board-cell:nth-last-child(-n+15){border-bottom:0}
      .track-cell{background:#fff}
      .lane-green{background:#39b85a}.lane-yellow{background:#f5c328}.lane-red{background:#ef3b3b}.lane-blue{background:#3478e5}
      .home-area{position:absolute;width:40%;height:40%;box-sizing:border-box;background:#fff;border:2px solid #222;pointer-events:none;z-index:2}
      .home-green{top:0;left:0}.home-yellow{top:0;right:0}.home-red{bottom:0;left:0}.home-blue{bottom:0;right:0}
      .shared-ludo-board-preview{width:100%;max-width:260px;border-width:1px}
      @media(max-width:480px){.shared-ludo-board{width:100%;max-width:100%;border-width:1px;border-radius:0}}
    `}</style>
  </div>;
}
