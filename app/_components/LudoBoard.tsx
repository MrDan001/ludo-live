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

function cellKind(row:number,col:number){
  if(row<6&&col<6)return "green" as const;
  if(row<6&&col>8)return "yellow" as const;
  if(row>8&&col<6)return "red" as const;
  if(row>8&&col>8)return "blue" as const;
  if(row>=6&&row<=8&&col>=6&&col<=8)return "center" as const;
  return "track" as const;
}

export default function LudoBoard({theme="classic",preview=false,className="",style}: {theme?:BoardThemeId;preview?:boolean;className?:string;style?:React.CSSProperties}){
  const p=BOARD_PALETTES[theme]||BOARD_PALETTES.classic;
  const cells=Array.from({length:225},(_,index)=>{const row=Math.floor(index/15),col=index%15;return{index,row,col,kind:cellKind(row,col)}});
  return <div className={`shared-ludo-board ${preview?"shared-ludo-board-preview":""} ${className}`.trim()} style={{...style,background:p.bg,borderColor:p.accent,"--board-accent":p.accent} as React.CSSProperties} aria-label={`${BOARD_NAMES[theme]} 15 by 15 Ludo board`}>
    {cells.map(c=>c.kind==="center"?<div key={c.index} className="shared-board-cell shared-center-cell" style={{background:p.accent}}><span>🏆</span></div>:c.kind==="track"?<div key={c.index} className="shared-board-cell shared-track-cell" style={{borderColor:p.accent,background:(c.row+c.col)%2?p.bg:"#fff"}}>{(c.row*15+c.col)%13===0?"★":""}</div>:<div key={c.index} className={`shared-board-cell shared-home-cell shared-home-${c.kind}`} style={{background:p[c.kind]}}>{c.row===(c.kind==="green"?0:c.kind==="yellow"?0:9)&&c.col===(c.kind==="green"?0:c.kind==="yellow"?9:0)&&!preview?<b>{c.kind.toUpperCase()}</b>:null}{((c.kind==="green"||c.kind==="yellow")&&c.row<4&&c.col%3===1)||((c.kind==="red"||c.kind==="blue")&&c.row%3===1&&c.col<14&&((c.kind==="red"&&c.col<4)||(c.kind==="blue"&&c.col>10)))?<span className="shared-home-token-dot" style={{background:p[c.kind]}}/>:null}</div>)}
    <style jsx>{`.shared-ludo-board{width:min(94vw,650px);aspect-ratio:1;position:relative;border:6px solid;border-radius:22px;overflow:hidden;display:grid;grid-template-columns:repeat(15,1fr);grid-template-rows:repeat(15,1fr);box-shadow:0 18px 50px rgba(0,0,0,.4);box-sizing:border-box}.shared-board-cell{min-width:0;min-height:0;box-sizing:border-box}.shared-home-cell{position:relative;border:1px solid rgba(255,255,255,.18);display:grid;place-items:center;color:#fff;font-size:clamp(7px,1.7vw,12px);font-weight:900}.shared-home-green{border-bottom-right-radius:8px}.shared-home-yellow{border-bottom-left-radius:8px}.shared-home-red{border-top-right-radius:8px}.shared-home-blue{border-top-left-radius:8px}.shared-home-token-dot{width:58%;aspect-ratio:1;border-radius:50%;border:3px solid rgba(255,255,255,.95);box-shadow:inset 0 4px 7px rgba(255,255,255,.25),0 3px 7px rgba(0,0,0,.3)}.shared-track-cell{display:grid;place-items:center;border:1px solid;font-size:clamp(6px,1.4vw,10px);font-weight:900}.shared-center-cell{display:grid;place-items:center;border:1px solid rgba(255,255,255,.25);z-index:3;color:#fff;font-size:clamp(16px,5vw,34px);box-shadow:inset 0 0 0 3px rgba(255,255,255,.25)}.shared-ludo-board-preview{width:100%;max-width:260px;border-width:3px;border-radius:14px;box-shadow:none}.shared-ludo-board-preview .shared-home-token-dot{border-width:2px}.shared-ludo-board-preview .shared-center-cell{font-size:18px}@media(max-width:480px){.shared-ludo-board{width:min(96vw,650px);border-width:4px;border-radius:16px}.shared-home-token-dot{border-width:2px}}`}</style>
  </div>;
}
