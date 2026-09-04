"use client";
import {useEffect,useMemo,useState} from "react";
type Item={id:string;type:string;name:string;yardKind?:string};
export function VisualSelectors({value,onChange}:{value:any;onChange:(v:any)=>void}){
 const[items,setItems]=useState<Item[]>([]);
 useEffect(()=>{fetch("/api/shop/catalog",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(Array.isArray(d?.items))setItems(d.items)}).catch(()=>{});},[]);
 const boards=useMemo(()=>items.filter(x=>x.type==="board"),[items]);
 const dice=useMemo(()=>items.filter(x=>x.type==="dice"),[items]);
 const yards=useMemo(()=>items.filter(x=>x.yardKind==="background"||x.yardKind==="sticker"),[items]);
 const set=(k:string,v:string)=>onChange({...value,[k]:v});
 const opts=(list:Item[])=>list.map(x=><option key={`${x.type}:${x.id}`} value={x.id}>{x.name}</option>);
 return <div className="form-grid">
  <label className="admin-field"><span>Board</span><select value={value?.boardId||"classic"} onChange={e=>set("boardId",e.target.value)}><option value="classic">Classic Ludo</option>{opts(boards.filter(x=>x.id!=="classic"))}</select></label>
  <label className="admin-field"><span>Dice</span><select value={value?.diceId||"classic"} onChange={e=>set("diceId",e.target.value)}><option value="classic">Classic White</option>{opts(dice.filter(x=>x.id!=="classic"))}</select></label>
  <label className="admin-field"><span>Yard</span><select value={value?.yardId||"yard-classic"} onChange={e=>set("yardId",e.target.value)}><option value="yard-classic">Classic Yard</option>{opts(yards.filter(x=>x.id!=="yard-classic"))}</select></label>
  <label className="admin-field"><span>Yard artwork</span><select value={value?.yardKind||"background"} onChange={e=>set("yardKind",e.target.value)}><option value="background">Background</option><option value="sticker">Backgroundless</option></select></label>
 </div>;
}
export function ShopItemSelector({value,onChange}:{value:string;onChange:(v:string)=>void}){
 const[items,setItems]=useState<Item[]>([]);
 useEffect(()=>{fetch("/api/shop/catalog",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(Array.isArray(d?.items))setItems(d.items)}).catch(()=>{});},[]);
 const label=(x:Item)=>x.yardKind?(x.yardKind==="background"?`${x.name} · Yard background`:`${x.name} · Backgroundless yard artwork`):`${x.name} · ${x.type}`;
 return <label className="admin-field"><span>Shop item to buy</span><select value={value||""} onChange={e=>onChange(e.target.value)}><option value="">Select a shop item…</option>{items.filter(x=>x.type!=="coin_package"&&x.type!=="gem_package").map(x=><option key={`${x.type}:${x.id}`} value={`${x.type}:${x.id}`}>{label(x)}</option>)}</select></label>;
}
