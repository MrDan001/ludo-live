"use client";

export type BoardThemeId = "classic"|"golden"|"neon"|"beach"|"galaxy"|"wood"|"dragon"|"christmas"|"football"|"candy";

export const BOARD_PALETTES:Record<BoardThemeId,{bg:string;green:string;yellow:string;red:string;blue:string;accent:string}>={
  classic:{bg:"#0b172b",green:"#18a957",yellow:"#f5b51b",red:"#ed3340",blue:"#2f78e8",accent:"#60a5fa"},
  golden:{bg:"#1b1206",green:"#b68a21",yellow:"#ffd34d",red:"#9f2932",blue:"#375b9b",accent:"#ffd34d"},
  neon:{bg:"#050916",green:"#00f5a0",yellow:"#ffe600",red:"#ff3b7d",blue:"#00b7ff",accent:"#b45cff"},
  beach:{bg:"#07334a",green:"#20c878",yellow:"#ffd166",red:"#ff6b6b",blue:"#39a9db",accent:"#6ee7f9"},
  galaxy:{bg:"#09071e",green:"#36e0a0",yellow:"#f5d76e",red:"#ff557a",blue:"#6e72ff",accent:"#b48cff"},
  wood:{bg:"#3b2115",green:"#5f9d54",yellow:"#d7a943",red:"#b64a3a",blue:"#4d7fa8",accent:"#e6b45f"},
  dragon:{bg:"#1b0907",green:"#2e9f58",yellow:"#e1a52d",red:"#d9362b",blue:"#3476a6",accent:"#f97316"},
  christmas:{bg:"#102338",green:"#18a957",yellow:"#f5c84b",red:"#e53935",blue:"#3d7fe5",accent:"#f8fafc"},
  football:{bg:"#062411",green:"#28a745",yellow:"#d9a72b",red:"#d83b3b",blue:"#3478d4",accent:"#86efac"},
  candy:{bg:"#240b24",green:"#45d483",yellow:"#ffd45c",red:"#ff6aa9",blue:"#67a7ff",accent:"#f0abfc"}
};

export const BOARD_NAMES:Record<BoardThemeId,string>={classic:"Classic Ludo",golden:"Golden Royal",neon:"Neon Glow",beach:"Beach Vibes",galaxy:"Galaxy Space",wood:"Wooden Classic",dragon:"Dragon Theme",christmas:"Christmas Edition",football:"Football Arena",candy:"Candy Land"};

type HomeColor="green"|"yellow"|"red"|"blue";

function homeAt(row:number,col:number):HomeColor|null{
  if(row<6&&col<6)return "green";
  if(row<6&&col>8)return "yellow";
  if(row>8&&col<6)return "red";
  if(row>8&&col>8)return "blue";
  return null;
}

function isCenter(row:number,col:number){return row>=6&&row<=8&&col>=6&&col<=8;}

function laneColor(row:number,col:number):HomeColor|null{
  if(col===7&&row>=1&&row<=5)return "green";
  if(row===7&&col>=9&&col<=13)return "yellow";
  if(col===7&&row>=9&&row<=13)return "red";
  if(row===7&&col>=1&&col<=5)return "blue";
  return null;
}

const safeCells=new Set(["2:6","2:8","6:2","8:2","6:12","8:12","12:6","12:8"]);

function homeToken(color:HomeColor,index:number,p:{green:string;yellow:string;red:string;blue:string}){
  return <span key={index} className="home-token" style={{background:p[color]}} aria-hidden="true"><span/></span>;
}

function HomeZone({color,p,label}:{color:HomeColor;p:typeof BOARD_PALETTES.classic;label:string}){
  return <div className={`home-zone home-zone-${color}`} style={{background:p[color]}}>
    <span className="home-label">{label}</span>
    <div className="home-inner">{[0,1,2,3].map(i=><div className="home-slot" key={i}>{homeToken(color,i,p)}</div>)}</div>
  </div>;
}

export default function LudoBoard({theme="classic",preview=false,className="",style}: {theme?:BoardThemeId;preview?:boolean;className?:string;style?:React.CSSProperties}){
  const p=BOARD_PALETTES[theme]||BOARD_PALETTES.classic;
  const cells=Array.from({length:225},(_,index)=>{const row=Math.floor(index/15),col=index%15;return{index,row,col};});

  return <div className={`shared-ludo-board ${preview?"shared-ludo-board-preview":""} ${className}`.trim()} style={{...style,background:p.bg,borderColor:p.accent,"--board-accent":p.accent} as React.CSSProperties} aria-label={`${BOARD_NAMES[theme]} Ludo board`}>
    {cells.map(c=>{
      if(homeAt(c.row,c.col)||isCenter(c.row,c.col))return <div key={c.index} className="board-underlay"/>;
      const lane=laneColor(c.row,c.col);
      const safe=safeCells.has(`${c.row}:${c.col}`);
      const start=(c.row===5&&c.col===6)||(c.row===6&&c.col===9)||(c.row===8&&c.col===8)||(c.row===7&&c.col===5);
      const arrow=(c.row===0&&c.col===7)?"↓":(c.row===7&&c.col===14)?"←":(c.row===14&&c.col===7)?"↑":(c.row===7&&c.col===0)?"→":"";
      return <div key={c.index} className={`board-cell ${lane?"board-lane":"board-track"} ${safe?"board-safe":""} ${start?"board-start":""}`} style={{background:lane?p[lane]:(c.row+c.col)%2===0?"#ffffff":p.bg,borderColor:p.accent}}>
        {safe&&<span className="safe-star">★</span>}
        {arrow&&<span className="entry-arrow" style={{color:lane?p[lane]:p.accent}}>{arrow}</span>}
      </div>;
    })}

    <HomeZone color="green" p={p} label="GREEN"/>
    <HomeZone color="yellow" p={p} label="YELLOW"/>
    <HomeZone color="red" p={p} label="RED"/>
    <HomeZone color="blue" p={p} label="BLUE"/>

    <div className="center-home" aria-hidden="true">
      <div className="center-triangle center-green" style={{background:p.green}}/>
      <div className="center-triangle center-yellow" style={{background:p.yellow}}/>
      <div className="center-triangle center-red" style={{background:p.red}}/>
      <div className="center-triangle center-blue" style={{background:p.blue}}/>
      <div className="center-dot" style={{borderColor:p.accent}}/>
    </div>

    <style jsx>{`
      .shared-ludo-board{width:min(94vw,650px);aspect-ratio:1;position:relative;border:6px solid;border-radius:22px;overflow:hidden;display:grid;grid-template-columns:repeat(15,1fr);grid-template-rows:repeat(15,1fr);box-shadow:0 18px 50px rgba(0,0,0,.42);box-sizing:border-box;background-clip:padding-box}
      .board-underlay{min-width:0;min-height:0}
      .board-cell{min-width:0;min-height:0;position:relative;box-sizing:border-box;display:grid;place-items:center;border:1px solid rgba(11,23,43,.22);font-weight:950}
      .board-track{color:#0b172b}
      .board-lane{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.2)}
      .board-start{box-shadow:inset 0 0 0 3px rgba(255,255,255,.8)}
      .safe-star{font-size:clamp(13px,2.7vw,22px);line-height:1;color:#0b172b;text-shadow:0 1px 0 rgba(255,255,255,.7)}
      .entry-arrow{font-size:clamp(18px,4vw,30px);line-height:1;font-weight:1000}
      .home-zone{position:absolute;width:40%;height:40%;padding:clamp(12px,2.5vw,20px);box-sizing:border-box;color:#fff;z-index:4}
      .home-zone-green{left:0;top:0;border-radius:16px 0 0 0}
      .home-zone-yellow{right:0;top:0;border-radius:0 16px 0 0}
      .home-zone-red{left:0;bottom:0;border-radius:0 0 0 16px}
      .home-zone-blue{right:0;bottom:0;border-radius:0 0 16px 0}
      .home-label{position:absolute;top:clamp(7px,1.6vw,12px);left:clamp(9px,1.8vw,14px);font-size:clamp(9px,2vw,14px);font-weight:1000;letter-spacing:.2px;text-shadow:0 1px 2px rgba(0,0,0,.2)}
      .home-zone-yellow .home-label,.home-zone-blue .home-label{left:auto;right:clamp(9px,1.8vw,14px)}
      .home-zone-red .home-label,.home-zone-blue .home-label{top:auto;bottom:clamp(7px,1.6vw,12px)}
      .home-inner{position:absolute;inset:22% 13% 13%;display:grid;grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(2,1fr);gap:clamp(8px,2.2vw,18px)}
      .home-slot{display:grid;place-items:center}
      .home-token{width:72%;max-width:72px;aspect-ratio:1;border-radius:50%;border:clamp(2px,.5vw,4px) solid rgba(255,255,255,.9);box-shadow:inset 0 5px 10px rgba(255,255,255,.25),0 4px 10px rgba(0,0,0,.25);display:grid;place-items:center}
      .home-token span{width:48%;aspect-ratio:1;border-radius:50%;background:rgba(0,0,0,.16);box-shadow:inset 0 2px 4px rgba(0,0,0,.15)}
      .center-home{position:absolute;left:40%;top:40%;width:20%;height:20%;z-index:6;overflow:hidden;border:1px solid rgba(11,23,43,.25);background:${p.bg}}
      .center-triangle{position:absolute;inset:0;clip-path:polygon(0 0,100% 0,50% 50%)}
      .center-yellow{transform:rotate(90deg)}
      .center-red{transform:rotate(180deg)}
      .center-blue{transform:rotate(270deg)}
      .center-dot{position:absolute;left:42%;top:42%;width:16%;height:16%;border:2px solid;border-radius:50%;background:#fff;box-shadow:0 2px 5px rgba(0,0,0,.25)}
      .shared-ludo-board-preview{width:100%;max-width:260px;border-width:3px;border-radius:14px;box-shadow:none}
      .shared-ludo-board-preview .home-zone{padding:8px;border-radius:9px 0 0 0}
      .shared-ludo-board-preview .home-label{font-size:7px;top:5px;left:6px}
      .shared-ludo-board-preview .home-zone-yellow .home-label,.shared-ludo-board-preview .home-zone-blue .home-label{left:auto;right:6px}
      .shared-ludo-board-preview .home-zone-red .home-label,.shared-ludo-board-preview .home-zone-blue .home-label{top:auto;bottom:5px}
      .shared-ludo-board-preview .home-inner{gap:4px}
      .shared-ludo-board-preview .home-token{border-width:2px}
      .shared-ludo-board-preview .safe-star{font-size:12px}
      .shared-ludo-board-preview .entry-arrow{font-size:16px}
      @media(max-width:480px){
        .shared-ludo-board{width:min(96vw,650px);border-width:4px;border-radius:16px}
        .home-zone{padding:9px}
        .home-inner{gap:6px}
        .home-token{width:76%;border-width:2px}
      }
    `}</style>
  </div>;
}
