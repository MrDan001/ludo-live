"use client";

export type BoardThemeId = "classic"|"golden"|"neon"|"beach"|"galaxy"|"wood"|"dragon"|"christmas"|"football"|"candy";

type Palette={bg:string;green:string;yellow:string;red:string;blue:string;accent:string};

export const BOARD_PALETTES:Record<BoardThemeId,Palette>={
  classic:{bg:"#ffffff",green:"#18a84b",yellow:"#f5b800",red:"#f02d43",blue:"#2f6be5",accent:"#222222"},
  golden:{bg:"#ffffff",green:"#18a84b",yellow:"#f5b800",red:"#f02d43",blue:"#2f6be5",accent:"#222222"},
  neon:{bg:"#ffffff",green:"#18a84b",yellow:"#f5b800",red:"#f02d43",blue:"#2f6be5",accent:"#222222"},
  beach:{bg:"#ffffff",green:"#18a84b",yellow:"#f5b800",red:"#f02d43",blue:"#2f6be5",accent:"#222222"},
  galaxy:{bg:"#ffffff",green:"#18a84b",yellow:"#f5b800",red:"#f02d43",blue:"#2f6be5",accent:"#222222"},
  wood:{bg:"#ffffff",green:"#18a84b",yellow:"#f5b800",red:"#f02d43",blue:"#2f6be5",accent:"#222222"},
  dragon:{bg:"#ffffff",green:"#18a84b",yellow:"#f5b800",red:"#f02d43",blue:"#2f6be5",accent:"#222222"},
  christmas:{bg:"#ffffff",green:"#18a84b",yellow:"#f5b800",red:"#f02d43",blue:"#2f6be5",accent:"#222222"},
  football:{bg:"#ffffff",green:"#18a84b",yellow:"#f5b800",red:"#f02d43",blue:"#2f6be5",accent:"#222222"},
  candy:{bg:"#ffffff",green:"#18a84b",yellow:"#f5b800",red:"#f02d43",blue:"#2f6be5",accent:"#222222"}
};

export const BOARD_NAMES:Record<BoardThemeId,string>={classic:"Classic Ludo",golden:"Golden Royal",neon:"Neon Glow",beach:"Beach Vibes",galaxy:"Galaxy Space",wood:"Wooden Classic",dragon:"Dragon Theme",christmas:"Christmas Edition",football:"Football Arena",candy:"Candy Land"};

const homes=[
  {key:"green",row:0,col:0,color:"green"},
  {key:"yellow",row:0,col:9,color:"yellow"},
  {key:"red",row:9,col:0,color:"red"},
  {key:"blue",row:9,col:9,color:"blue"}
] as const;

const lanes=[
  ...Array.from({length:5},(_,i)=>({color:"green",row:i+1,col:7})),
  ...Array.from({length:5},(_,i)=>({color:"yellow",row:7,col:i+9})),
  ...Array.from({length:5},(_,i)=>({color:"red",row:i+9,col:7})),
  ...Array.from({length:5},(_,i)=>({color:"blue",row:7,col:i+1}))
] as const;

const stars=[
  {row:6,col:1},
  {row:1,col:8},
  {row:13,col:6},
  {row:8,col:13}
] as const;

export default function LudoBoard({theme="classic",preview=false,className="",style}:{theme?:BoardThemeId;preview?:boolean;className?:string;style?:React.CSSProperties}){
  const p=BOARD_PALETTES[theme]||BOARD_PALETTES.classic;
  const cells=Array.from({length:225},(_,index)=>({index,row:Math.floor(index/15),col:index%15}));
  const laneAt=(row:number,col:number)=>lanes.find(l=>l.row===row&&l.col===col)?.color;
  const starAt=(row:number,col:number)=>stars.some(s=>s.row===row&&s.col===col);

  return <div className={`shared-ludo-board ${preview?"shared-ludo-board-preview":""} ${className}`.trim()} style={{...style,background:p.bg,borderColor:p.accent}} aria-label={`${BOARD_NAMES[theme]} Ludo board`}>
    {cells.map(({index,row,col})=>{
      const lane=laneAt(row,col);
      const isHome=homes.some(h=>row>=h.row&&row<h.row+6&&col>=h.col&&col<h.col+6);
      const isTrack=!isHome;
      return <div className={`board-cell ${isTrack?"track-cell":""} ${lane?`lane-${lane}`:""}`} key={index} aria-hidden="true">
        {starAt(row,col)&&<span className="safe-star">★</span>}
      </div>;
    })}

    {homes.map(home=><div key={home.key} className={`home-area home-${home.key}`} style={{background:p[home.color]}} aria-hidden="true">
      <div className="token-yard">
        <span className={`token token-${home.color}`} style={{background:p[home.color]}} />
        <span className={`token token-${home.color}`} style={{background:p[home.color]}} />
        <span className={`token token-${home.color}`} style={{background:p[home.color]}} />
        <span className={`token token-${home.color}`} style={{background:p[home.color]}} />
      </div>
    </div>)}

    <div className="center-home" aria-hidden="true">
      <span className="center-triangle center-green" style={{background:p.green}} />
      <span className="center-triangle center-yellow" style={{background:p.yellow}} />
      <span className="center-triangle center-red" style={{background:p.red}} />
      <span className="center-triangle center-blue" style={{background:p.blue}} />
    </div>

    <style jsx>{`
      .shared-ludo-board{width:100%;max-width:100%;aspect-ratio:1 / 1;position:relative;box-sizing:border-box;display:grid;grid-template-columns:repeat(15,minmax(0,1fr));grid-template-rows:repeat(15,minmax(0,1fr));background:#fff;border:3px solid #222;border-radius:0;overflow:hidden;box-shadow:none;margin:0 auto}
      .board-cell{min-width:0;min-height:0;box-sizing:border-box;background:#fff;border-right:1px solid #a8a8a8;border-bottom:1px solid #a8a8a8;display:flex;align-items:center;justify-content:center;position:relative}
      .board-cell:nth-child(15n){border-right:0}.board-cell:nth-last-child(-n+15){border-bottom:0}
      .track-cell{background:#fff}
      .lane-green{background:${p.green}}.lane-yellow{background:${p.yellow}}.lane-red{background:${p.red}}.lane-blue{background:${p.blue}}
      .safe-star{font-size:clamp(11px,2.8vw,24px);line-height:1;color:#111;position:relative;z-index:1}
      .home-area{position:absolute;width:40%;height:40%;box-sizing:border-box;border:3px solid #222;pointer-events:none;z-index:3;padding:5.8%;}
      .home-green{top:0;left:0}.home-yellow{top:0;right:0}.home-red{bottom:0;left:0}.home-blue{bottom:0;right:0}
      .token-yard{width:100%;height:100%;box-sizing:border-box;background:#fff;border:3px solid #222;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;place-items:center;padding:9%;gap:7%}
      .token{width:62%;aspect-ratio:1;border-radius:50%;border:3px solid #222;box-shadow:0 1px 1px rgba(0,0,0,.12)}
      .center-home{position:absolute;left:40%;top:40%;width:20%;height:20%;z-index:5;background:#fff;border:2px solid #222;overflow:hidden}
      .center-triangle{position:absolute;inset:0}
      .center-green{clip-path:polygon(0 0,50% 50%,0 100%)}
      .center-yellow{clip-path:polygon(0 0,100% 0,50% 50%)}
      .center-red{clip-path:polygon(0 100%,100% 100%,50% 50%)}
      .center-blue{clip-path:polygon(100% 0,100% 100%,50% 50%)}
      .shared-ludo-board-preview{width:100%;max-width:260px;border-width:2px}
      @media(max-width:480px){.shared-ludo-board{width:100%;max-width:100%;border-width:2px}.token{border-width:2px}.token-yard{border-width:2px}.home-area{border-width:2px}}
    `}</style>
  </div>;
}
