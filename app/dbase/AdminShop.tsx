"use client";

import { useEffect, useMemo, useState } from "react";

type Item = { type:string; id:string; name:string; description?:string; icon?:string; rarity?:string; currency:"coins"|"gems"|"naira"; price:number };

const label = (c:string) => c === "coins" ? "🪙 Coins" : c === "gems" ? "💎 Gems" : "₦ Naira";

export default function AdminShop() {
  const [items,setItems] = useState<Item[]>([]);
  const [search,setSearch] = useState("");
  const [busy,setBusy] = useState("");
  const [notice,setNotice] = useState("");

  const load = async () => {
    try {
      const r = await fetch("/api/admin/shop", { cache:"no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Unable to load shop.");
      setItems(d.items || []);
      setNotice("");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Unable to load shop."); }
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => items.filter(x => `${x.name} ${x.type} ${x.id}`.toLowerCase().includes(search.toLowerCase())), [items,search]);

  const save = async (item:Item, currency:string, price:string) => {
    const n = Math.trunc(Number(price));
    if (!Number.isFinite(n) || n < 0) { setNotice("Price must be zero or greater."); return; }
    setBusy(`${item.type}:${item.id}`); setNotice("");
    try {
      const r = await fetch("/api/admin/shop", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ type:item.type, id:item.id, currency, price:n }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Unable to save price.");
      setItems(prev => prev.map(x => x.type===item.type && x.id===item.id ? {...x,currency:d.item.currency,price:Number(d.item.price)} : x));
      setNotice(`${item.name} is now ${label(currency)} ${n.toLocaleString("en-NG")}.`);
    } catch (e) { setNotice(e instanceof Error ? e.message : "Unable to save price."); }
    finally { setBusy(""); }
  };

  return <section style={panel}>
    <div style={head}><div><h2>🛍️ Shop Pricing</h2><p style={muted}>Admin can change price and payment currency only. Changes are server-backed and immediately used by the player shop.</p></div><input style={searchBox} placeholder="Search shop item…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    {notice && <div style={noticeBox}>{notice}</div>}
    <div style={grid}>{filtered.map(item => <PriceRow key={`${item.type}:${item.id}`} item={item} busy={busy===`${item.type}:${item.id}`} onSave={save}/>)}</div>
  </section>;
}

function PriceRow({item,busy,onSave}:{item:Item;busy:boolean;onSave:(item:Item,currency:string,price:string)=>void}) {
  const [currency,setCurrency] = useState(item.currency);
  const [price,setPrice] = useState(String(item.price));
  useEffect(()=>{setCurrency(item.currency);setPrice(String(item.price));},[item.currency,item.price]);
  return <article style={row}>
    <div style={info}><div style={icon}>{item.icon || (item.type === "board" ? "🎨" : item.type === "dice" ? "🎲" : item.type === "avatar" ? "🧑‍🎮" : "✨")}</div><div><b>{item.name}</b><small>{item.type.toUpperCase()} • {item.rarity || "ITEM"}</small></div></div>
    <select style={input} value={currency} onChange={e=>setCurrency(e.target.value)}><option value="coins">🪙 Coins</option><option value="gems">💎 Gems</option><option value="naira">₦ Naira</option></select>
    <input style={input} type="number" min="0" step="1" value={price} onChange={e=>setPrice(e.target.value)}/>
    <div style={current}>{label(item.currency)}<b>{Number(item.price).toLocaleString("en-NG")}</b></div>
    <button style={saveBtn} disabled={busy} onClick={()=>onSave(item,currency,price)}>{busy?"Saving…":"Save price"}</button>
  </article>;
}

const panel:any={background:"rgba(8,19,42,.96)",border:"1px solid #20375d",borderRadius:18,padding:18,margin:"16px 0"};
const head:any={display:"flex",justifyContent:"space-between",gap:14,alignItems:"center",flexWrap:"wrap"};
const muted:any={color:"#8fa5c5",fontSize:13};
const searchBox:any={background:"#071024",color:"white",border:"1px solid #2b466f",borderRadius:10,padding:"10px 12px",minWidth:210};
const grid:any={display:"grid",gap:10,marginTop:14};
const row:any={display:"grid",gridTemplateColumns:"minmax(210px,2fr) 150px 130px 150px 110px",gap:10,alignItems:"center",padding:"12px 0",borderTop:"1px solid #1a2b49"};
const info:any={display:"flex",gap:10,alignItems:"center",minWidth:0};
const icon:any={width:42,height:42,borderRadius:12,display:"grid",placeItems:"center",background:"#10274c",fontSize:21};
const input:any={background:"#071024",color:"white",border:"1px solid #2b466f",borderRadius:9,padding:"9px 10px",minWidth:0};
const current:any={display:"grid",gap:2,color:"#8fa5c5",fontSize:11};
const saveBtn:any={border:"1px solid #31b978",background:"#116b42",color:"white",padding:"9px 10px",borderRadius:9,fontWeight:850,cursor:"pointer"};
const noticeBox:any={marginTop:12,padding:"10px 12px",border:"1px solid #315b8d",background:"#0a1934",borderRadius:10,color:"#cfe2ff"};
