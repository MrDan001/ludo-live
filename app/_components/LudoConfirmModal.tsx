"use client";
import type { CSSProperties } from "react";

type Props={open:boolean;title:string;message:string;confirmLabel?:string;cancelLabel?:string;onConfirm:()=>void;onCancel:()=>void;danger?:boolean};
export default function LudoConfirmModal({open,title,message,confirmLabel="Confirm",cancelLabel="Cancel",onConfirm,onCancel,danger=false}:Props){
 if(!open)return null;
 return <div style={overlay} onMouseDown={e=>{if(e.target===e.currentTarget)onCancel()}}><section style={card} role="dialog" aria-modal="true"><div style={brandRow}><div style={logo}>♛</div><div><div style={eyebrow}>LUDO LIVE</div><h2 style={titleStyle}>{title}</h2></div></div><div style={divider}/><p style={messageStyle}>{message}</p><div style={actions}><button type="button" onClick={onCancel} style={cancel}>{cancelLabel}</button><button type="button" onClick={onConfirm} style={{...confirm,...(danger?dangerConfirm:{})}}>{confirmLabel}</button></div></section></div>;
}
const overlay:CSSProperties={position:"fixed",inset:0,zIndex:1000,display:"grid",placeItems:"center",padding:18,background:"rgba(0,5,18,.78)",backdropFilter:"blur(7px)"};
const card:CSSProperties={width:"min(100%,430px)",padding:20,boxSizing:"border-box",borderRadius:22,background:"linear-gradient(145deg,#0a2148,#050f25)",border:"1px solid rgba(91,151,255,.45)",boxShadow:"0 24px 80px rgba(0,0,0,.55)",color:"#fff"};
const brandRow:CSSProperties={display:"flex",alignItems:"center",gap:12};
const logo:CSSProperties={width:46,height:46,borderRadius:14,display:"grid",placeItems:"center",background:"linear-gradient(145deg,#1769e8,#6734e8)",border:"1px solid #6aa7ff",fontSize:26};
const eyebrow:CSSProperties={fontSize:9,letterSpacing:2,color:"#65adff",fontWeight:950};
const titleStyle:CSSProperties={margin:"3px 0 0",fontSize:20,fontWeight:950};
const divider:CSSProperties={height:1,background:"#173966",margin:"17px 0"};
const messageStyle:CSSProperties={margin:0,color:"#c7d6eb",fontSize:14,lineHeight:1.55};
const actions:CSSProperties={display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginTop:20};
const cancel:CSSProperties={border:"1px solid #31517f",borderRadius:11,padding:12,background:"#071a37",color:"#d5e4f8",fontWeight:900,fontSize:13};
const confirm:CSSProperties={border:0,borderRadius:11,padding:12,background:"linear-gradient(135deg,#1769e8,#7134ef)",color:"#fff",fontWeight:950,fontSize:13};
const dangerConfirm:CSSProperties={background:"linear-gradient(135deg,#c52f52,#8f1837)"};
