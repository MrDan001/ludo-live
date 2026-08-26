"use client";

import { useState } from "react";

type Props={item:{icon?:string|null;name?:string;imageUrl?:string|null}};

export default function ShopItemArtwork({item}:Props){
  const [broken,setBroken]=useState(false);
  if(item.imageUrl&&!broken)return <img src={item.imageUrl} alt={item.name??"Shop avatar"} className="h-full w-full object-contain" loading="lazy" onError={()=>setBroken(true)} />;
  return <span className="text-5xl leading-none" aria-label={item.name??"Shop item"}>{item.icon??"🛍️"}</span>;
}
