"use client";

export type DiceSkinId="classic"|"golden"|"crystal"|"fire"|"rainbow"|"diamond"|"skull"|"sports";

export const DICE_STYLES:Record<DiceSkinId,string>={classic:"linear-gradient(145deg,#fff,#dbe4ee)",golden:"linear-gradient(145deg,#fff0a8,#c98d15)",crystal:"linear-gradient(145deg,#dff7ff,#1685d8)",fire:"linear-gradient(145deg,#ffcf57,#e52d20)",rainbow:"linear-gradient(145deg,#5ee7ff,#ff6ab3)",diamond:"linear-gradient(145deg,#fff,#91c7ff)",skull:"linear-gradient(145deg,#20242b,#05070a)",sports:"linear-gradient(145deg,#fff,#8bc34a)"};
const pipMap:Record<number,number[]>={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
export default function LudoDice({skin="classic",value=1,size=96,className="",onClick}:{skin?:DiceSkinId;value?:number;size?:number;className?:string;onClick?:()=>void}){
  const dark=skin==="skull",pips=pipMap[Math.max(1,Math.min(6,value))]||pipMap[1];
  return <button type="button" aria-label={`Roll dice${value?`, showing ${value}`:""}`} onClick={onClick} className={className} style={{width:size,height:size,borderRadius:Math.max(14,size*.22),border:"3px solid #111",background:DICE_STYLES[skin]||DICE_STYLES.classic,color:dark?"#fff":"#111",boxShadow:"0 8px 20px rgba(0,0,0,.35)",cursor:onClick?"pointer":"default",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gridTemplateRows:"repeat(3,1fr)",padding:size*.14,gap:size*.035,boxSizing:"border-box"}}>{Array.from({length:9},(_,i)=><span key={i} style={{display:"grid",placeItems:"center"}}>{pips.includes(i)&&<span style={{width:size*.13,height:size*.13,borderRadius:"50%",background:dark?"#fff":"#111",boxShadow:"inset 0 1px 1px rgba(255,255,255,.35)"}}/>}</span>)}</button>;
}
