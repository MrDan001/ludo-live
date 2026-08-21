"use client";

export type DiceSkinId="classic"|"golden"|"crystal"|"fire"|"rainbow"|"diamond"|"skull"|"sports";

export const DICE_STYLES:Record<DiceSkinId,string>={classic:"linear-gradient(145deg,#ffffff 0%,#d9e2ec 55%,#aebdca 100%)",golden:"linear-gradient(145deg,#fff0a8,#c98d15)",crystal:"linear-gradient(145deg,#dff7ff,#1685d8)",fire:"linear-gradient(145deg,#ffcf57,#e52d20)",rainbow:"linear-gradient(145deg,#5ee7ff,#ff6ab3)",diamond:"linear-gradient(145deg,#fff,#91c7ff)",skull:"linear-gradient(145deg,#20242b,#05070a)",sports:"linear-gradient(145deg,#fff,#8bc34a)"};
const pipMap:Record<number,number[]>={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const rotations:Record<number,string>={1:"rotateX(0deg) rotateY(0deg)",2:"rotateX(-90deg) rotateY(0deg)",3:"rotateX(0deg) rotateY(-90deg)",4:"rotateX(0deg) rotateY(90deg)",5:"rotateX(90deg) rotateY(0deg)",6:"rotateX(0deg) rotateY(180deg)"};
function Face({value,size,dark,transform}:{value:number;size:number;dark:boolean;transform:string}){const pips=pipMap[value];return <div className="dice-face" style={{width:size,height:size,transform,background:DICE_STYLES["classic"],color:dark?"#fff":"#111"}}>{Array.from({length:9},(_,i)=><span key={i} className="dice-slot">{pips.includes(i)&&<span className="dice-pip" style={{width:size*.14,height:size*.14,background:dark?"#fff":"#111"}}/>}</span>)}</div>}
export default function LudoDice({skin="classic",value=1,size=112,className="",onClick}:{skin?:DiceSkinId;value?:number;size?:number;className?:string;onClick?:()=>void}){
 const dark=skin==="skull",shown=Math.max(1,Math.min(6,value)),style=DICE_STYLES[skin]||DICE_STYLES.classic;
 return <button type="button" aria-label={`Roll dice, showing ${shown}`} onClick={onClick} className={`ludo-dice ${className}`.trim()} style={{width:size,height:size,cursor:onClick?"pointer":"default"}}>
   <span className="dice-stage" style={{width:size*.72,height:size*.72}}>
     <span className="dice-cube" style={{width:size*.72,height:size*.72,transform:rotations[shown]}}>
       <span className="dice-face dice-front" style={{background:style}}>{Array.from({length:9},(_,i)=><span key={i} className="dice-slot">{pipMap[shown].includes(i)&&<span className="dice-pip" style={{background:dark?"#fff":"#111"}}/>}</span>)}</span>
       <Face value={6} size={size*.72} dark={dark} transform="rotateY(180deg) translateZ(1px)"/>
       <Face value={2} size={size*.72} dark={dark} transform="rotateX(90deg) translateZ(1px)"/>
       <Face value={5} size={size*.72} dark={dark} transform="rotateX(-90deg) translateZ(1px)"/>
       <Face value={3} size={size*.72} dark={dark} transform="rotateY(90deg) translateZ(1px)"/>
       <Face value={4} size={size*.72} dark={dark} transform="rotateY(-90deg) translateZ(1px)"/>
     </span>
   </span>
   <style jsx>{`.ludo-dice{position:relative;border:0;background:transparent;padding:0;display:grid;place-items:center;perspective:900px;filter:drop-shadow(0 9px 12px rgba(0,0,0,.28))}.dice-stage{display:block;position:relative;perspective:900px}.dice-cube{display:block;position:absolute;inset:0;transform-style:preserve-3d;transition:transform .55s cubic-bezier(.2,.8,.2,1)}.dice-face{position:absolute;inset:0;border:3px solid #111;border-radius:16%;box-sizing:border-box;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:12%;gap:2%;backface-visibility:hidden;box-shadow:inset 0 2px 2px rgba(255,255,255,.65),inset 0 -5px 9px rgba(0,0,0,.14)}.dice-front{transform:translateZ(calc(var(--dice-half, 40px)))}.dice-slot{display:grid;place-items:center}.dice-pip{width:28%;height:28%;min-width:6px;min-height:6px;border-radius:50%;box-shadow:inset 0 1px 2px rgba(255,255,255,.35),0 1px 2px rgba(0,0,0,.28)}@media(max-width:480px){.dice-face{border-width:2px;border-radius:15%}}`}</style>
 </button>;
}
