"use client";
import LudoBoard,{BOARD_NAMES,BOARD_PALETTES,type BoardThemeId,type DemoToken} from "./LudoBoard";
import {getTokenCell} from "../../lib/canonicalLudoBoard";
export type {BoardThemeId,DemoToken};

type Props={theme?:BoardThemeId;demoTokens?:DemoToken[];onTokenClick?:(color:DemoToken["color"],id:number)=>void};
export default function CanonicalLudoBoard({theme="classic",demoTokens=[],onTokenClick}:Props){
 const moving=demoTokens.filter(t=>t.state!=="yard"&&t.state!=="finished").map(t=>{const cell=getTokenCell(t.color,t.position);return cell?{...t,row:cell[0],col:cell[1]}:null}).filter(Boolean) as Array<DemoToken&{row:number;col:number}>;
 const finished=demoTokens.filter(t=>t.state==="finished");
 return <div className="canonical-ludo-frame" style={{position:"relative",width:"100%",aspectRatio:"1"} as React.CSSProperties} aria-label={`${BOARD_NAMES[theme]} canonical Ludo board`}>
  <style>{`
    .canonical-ludo-frame{isolation:isolate}
    .canonical-ludo-frame .shared-ludo-board{box-shadow:none!important;position:relative;z-index:1}
  `}</style>
  <LudoBoard theme={theme} demoTokens={demoTokens.filter(t=>t.state==="yard")} onTokenClick={onTokenClick} style={{width:"100%",height:"100%"}}/>
  {moving.map(t=><button key={`${t.color}-${t.id}`} type="button" onClick={()=>onTokenClick?.(t.color,t.id)} aria-label={`${t.color} token`} style={{position:"absolute",left:`${(t.col+.5)*100/15}%`,top:`${(t.row+.5)*100/15}%`,transform:"translate(-50%,-50%)",width:"5.1%",aspectRatio:1,borderRadius:"50%",border:"2px solid #222",background:BOARD_PALETTES[theme][t.color],zIndex:30,fontWeight:900,padding:0,color:"transparent",fontSize:0}} />)}
  <div aria-label={`Finished tokens: ${finished.length}`} style={{position:"absolute",left:"40%",top:"40%",width:"20%",height:"20%",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gridTemplateRows:"repeat(4,1fr)",gap:"2%",padding:"4%",boxSizing:"border-box",placeItems:"center",pointerEvents:"none",zIndex:40}}>{finished.map(t=><span key={`${t.color}-${t.id}`} style={{width:"92%",height:"92%",borderRadius:"50%",background:BOARD_PALETTES[theme][t.color],border:"2px solid #fff",boxShadow:"0 2px 5px rgba(0,0,0,.35)"}} />)}</div>
 </div>;
}
