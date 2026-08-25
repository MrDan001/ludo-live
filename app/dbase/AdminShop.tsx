"use client";

import { useEffect, useMemo, useState } from "react";

type Currency = "coins" | "gems" | "naira";
type Item = { type:string; id:string; name:string; description?:string; icon?:string; rarity?:string; currency:Currency; price:number };
const label = (c:Currency) => c === "coins" ? "🪙 Coins" : c === "gems" ? "💎 Gems" : "₦ Naira";

export default function AdminShop() {
  const [items,setItems] = useState<Item[]>([]), [search,setSearch] = useState(""), [busy,setBusy] = useState(""), [notice,setNotice] = useState(""), [open,setOpen] = useState(false), [lastUpdated,setLastUpdated] = useState<string|null>(null), [loading,setLoading] = useState(false);
  const load = async () => { setLoading(true); try { const r=await fetch("/api/admin/shop",{cache:"no-store"}),d=await r.json(); if(!r.ok) throw new Error(d.error||"Unable to load shop."); setItems(d.items||[]); setLastUpdated(d.lastUpdated||null); setNotice(""); } catch(e) { setNotice(e instanceof Error?e.message:"Unable to load shop."); } finally { setLoading(false); } };
  useEffect(()=>{void load()},[]);
  const filtered=useMemo(()=>items.filter(x=>`${x.name} ${x.type} ${x.id}`.toLowerCase().includes(search.toLowerCase())),[items,search]);
  const save=async(item:Item,currency:Currency,price:string)=>{const n=Math.trunc(Number(price));if(!Number.isFinite(n)||n<0){setNotice("Price must be zero or greater.");return}setBusy(`${item.type}:${item.id}`);setNotice("");try{const r=await fetch("/api/admin/shop",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:item.type,id:item.id,currency,price:n})}),d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to save price.");setItems(p=>p.map(x=>x.type===item.type&&x.id===item.id?{...x,currency:d.item.currency as Currency,price:Number(d.item.price)}:x));setLastUpdated(d.lastUpdated||new Date().toISOString());setNotice(`${item.name} is now ${label(currency)} ${n.toLocaleString("en-NG")}.`)}catch(e){setNotice(e instanceof Error?e.message:"Unable to save price")}finally{setBusy("")}};
  const updatedLabel=lastUpdated?new Intl.DateTimeFormat("en-NG",{dateStyle:"medium",timeStyle:"short"}).format(new Date(lastUpdated)):"No pricing overrides yet";
  return <>
    <button style={shopButton} onClick={()=>setOpen(v=>!v)}>🛍️ Shop</button>
    {open&&<div style={overlay} onClick={()=>setOpen(false)}><section style={panel} onClick={e=>e.stopPropagation()}><div style={head}><div><h2>🛍️ Shop Pricing</h2><p style={muted}>Change only the price and payment currency. Updates are server-backed and used by the player shop.</p><div style={liveRow}><span style={liveDot}/><b>Live pricing</b><span style={updated}>Last updated: {updatedLabel}</span><button style={refreshBtn} onClick={()=>void load()} disabled={loading}>{loading?"Refreshing…":"Refresh"}</button></div></div><div style={{display:"flex",gap:8,alignItems:"center"}}><input style={searchBox} placeholder="Search shop item…" value={search} onChange={e=>setSearch(e.target.value)}/><button style={closeBtn} onClick={()=>setOpen(false)}>×</button></div></div>{notice&&<div style={noticeBox}>{notice}</div>}<div style={grid}>{filtered.map(item=><PriceRow key={`${item.type}:${item.id}`} item={item} busy={busy===`${item.type}:${item.id}`} onSave={save}/>)}</div></section></div>}
  </>;
}

function AtlasIcon({icon}:{icon:string}) {
  const match = /^atlas:(\d{1,2})$/.exec(icon);
  if (!match) return null;
  const index = Number(match[1]);
  if (index < 1 || index > 30) return null;
  const zero = index - 1;
  const column = zero % 5;
  const rowIndex = Math.floor(zero / 5);
  return <span aria-label={`Avatar ${index}`} style={{...icon, backgroundImage:"url('/avatars/premium-elite-atlas.jpg')", backgroundSize:"500% 600%", backgroundPosition:`${column * 25}% ${rowIndex * 20}%`, backgroundRepeat:"no-repeat"}}/>;
}

function PriceRow({item,busy,onSave}:{item:Item;busy:boolean;onSave:(item:Item,currency:Currency,price:string)=>void}){const[currency,setCurrency]=useState<Currency>(item.currency),[price,setPrice]=useState(String(item.price));useEffect(()=>{setCurrency(item.currency);setPrice(String(item.price))},[item.currency,item.price]);return <article style={row}><div style={info}>{item.icon?.startsWith("atlas:")?<AtlasIcon icon={item.icon}/>:<div style={icon}>{item.icon||(item.type==="board"?"🎨":item.type==="dice"?"🎲":item.type==="avatar"?"🧑‍🎮":"✨")}</div>}<div><b>{item.name}</b><small>{item.type.toUpperCase()} • {item.rarity||"ITEM"}</small></div></div><select style={input} value={currency} onChange={e=>setCurrency(e.target.value as Currency)}><option value="coins">🪙 Coins</option><option value="gems">💎 Gems</option><option value="naira">₦ Naira</option></select><input style={input} type="number" min="0" step="1" value={price} onChange={e=>setPrice(e.target.value)}/><div style={current}>{label(item.currency)}<b>{Number(item.price).toLocaleString("en-NG")}</b></div><button style={saveBtn} disabled={busy} onClick={()=>onSave(item,currency,price)}>{busy?"Saving…":"Save price"}</button></article>}

const shopButton:any={position:"fixed",right:18,top:18,zIndex:1100,border:"1px solid #31b978",background:"#116b42",color:"white",borderRadius:12,padding:"10px 14px",fontWeight:900,cursor:"pointer",boxShadow:"0 10px 28px rgba(0,0,0,.3)"};
const overlay:any={position:"fixed",inset:0,zIndex:1099,background:"rgba(0,0,0,.72)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"72px 14px 20px",overflow:"auto"};
const panel:any={background:"#07142c",color:"#e8f0ff",border:"1px solid #315078",borderRadius:18,padding:18,width:"min(1180px,100%)",maxHeight:"calc(100vh - 90px)",overflow:"auto",boxShadow:"0 25px 80px rgba(0,0,0,.55)"};
const head:any={display:"flex",justifyContent:"space-between",gap:14,alignItems:"center",flexWrap:"wrap"};const muted:any={color:"#8fa5c5",fontSize:13};const liveRow:any={display:"flex",alignItems:"center",gap:8,marginTop:9,fontSize:12,flexWrap:"wrap"};const liveDot:any={width:8,height:8,borderRadius:999,background:"#31b978",boxShadow:"0 0 0 4px rgba(49,185,120,.12)"};const updated:any={color:"#8fa5c5"};const refreshBtn:any={border:"1px solid #315b8d",background:"#0b1935",color:"#cfe2ff",padding:"5px 8px",borderRadius:8,fontWeight:700,cursor:"pointer"};const searchBox:any={background:"#071024",color:"white",border:"1px solid #2b466f",borderRadius:10,padding:"10px 12px",minWidth:210};const grid:any={display:"grid",gap:10,marginTop:14};const row:any={display:"grid",gridTemplateColumns:"minmax(210px,2fr) 150px 130px 150px 110px",gap:10,alignItems:"center",padding:"12px 0",borderTop:"1px solid #1a2b49"};const info:any={display:"flex",gap:10,alignItems:"center",minWidth:0};const icon:any={width:42,height:42,borderRadius:12,display:"grid",placeItems:"center",background:"#10274c",fontSize:21,backgroundColor:"#10274c"};const input:any={background:"#071024",color:"white",border:"1px solid #2b466f",borderRadius:9,padding:"9px 10px",minWidth:0};const current:any={display:"grid",gap:2,color:"#8fa5c5",fontSize:11};const saveBtn:any={border:"1px solid #31b978",background:"#116b42",color:"white",padding:"9px 10px",borderRadius:9,fontWeight:850,cursor:"pointer"};const closeBtn:any={border:"1px solid #526f98",background:"#0b1935",color:"white",width:40,height:40,borderRadius:10,fontSize:24,cursor:"pointer"};const noticeBox:any={marginTop:12,padding:"10px 12px",border:"1px solid #315b8d",background:"#0a1934",borderRadius:10,color:"#cfe2ff"};
