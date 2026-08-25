"use client";
import type {CSSProperties,ReactNode} from "react";

export default function PlayerIdentityLink({username,children,className,style}:{username:string;children:ReactNode;className?:string;style?:CSSProperties}){
 const name=String(username||"").trim();
 if(!name)return <>{children}</>;
 return <a href={`/player/${encodeURIComponent(name)}`} className={className} style={{color:"inherit",textDecoration:"none",cursor:"pointer",...style}} aria-label={`View ${name}'s player showcase`}>{children}</a>;
}
