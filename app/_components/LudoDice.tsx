"use client";

export type DiceSkinId="classic"|"golden"|"crystal"|"fire"|"rainbow"|"diamond"|"skull"|"sports";

export const DICE_STYLES:Record<DiceSkinId,string>={classic:"linear-gradient(145deg,#fff,#dbe4ee)",golden:"linear-gradient(145deg,#fff0a8,#c98d15)",crystal:"linear-gradient(145deg,#dff7ff,#1685d8)",fire:"linear-gradient(145deg,#ffcf57,#e52d20)",rainbow:"linear-gradient(145deg,#5ee7ff,#ff6ab3)",diamond:"linear-gradient(145deg,#fff,#91c7ff)",skull:"linear-gradient(145deg,#20242b,#05070a)",sports:"linear-gradient(145deg,#fff,#8bc34a)"};

export default function LudoDice({skin="classic",value=1,size=74,className="",onClick}:{skin?:DiceSkinId;value?:number;size?:number;className?:string;onClick?:()=>void}){
  const dark=skin==="skull";
  return <button type="button" aria-label={`Dice showing ${value}`} onClick={onClick} className={className} style={{width:size,height:size,borderRadius:Math.max(12,size*.23),border:0,background:DICE_STYLES[skin]||DICE_STYLES.classic,color:dark?"#fff":"#111",fontSize:Math.max(22,size*.4),fontWeight:950,boxShadow:"0 8px 20px rgba(0,0,0,.35)",cursor:onClick?"pointer":"default"}}>{value}</button>;
}
