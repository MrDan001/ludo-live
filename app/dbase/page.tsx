"use client";
import Link from "next/link";
import {useEffect,useState} from "react";

type Stat={label:string;value:string|number;icon:string};
const sections=[
 ["shop","🛍️","Shop","Manage published items, prices, currencies and level requirements."],
 ["boards","🎨","Boards","Manage Ludo boards and board artwork."],
 ["dice","🎲","Dice","Manage dice sets and their shop settings."],
 ["avatars","🧑‍🎨","Avatars","Manage player avatars and availability."],
 ["yards","🏡","Yards","Manage yard backgrounds and backgroundless artwork."],
 ["spin","🎡","Spin Wheel","Add, edit, enable, disable or delete spin rewards."],
 ["missions","🎯","Missions","Manage missions and player objectives."],
 ["events","🎉","Events","Create and manage live events."],
 ["tournament","🏆","Tournament","Control tournaments and competition settings."],
 ["finance","🏦","Finance","Review economy and financial administration."],
 ["support","💬","Support","Handle player support and disputes."],
];
export default function Dbase(){
 const[data,setData]=useState<any>(null); const[error,setError]=useState("");
 useEffect(()=>{let live=true;const load=async()=>{try{const r=await fetch("/api/admin",{cache:"no-store"});const x=await r.json();if(!r.ok)throw Error(x.error||"Unable to load admin data");if(live)setData(x)}catch(e){if(live)setError(e instanceof Error?e.message:"Unable to load admin data")}};void load();return()=>{live=false}},[]);
 if(error)return <main style={styles.page}><div style={styles.error}><span style={styles.bigIcon}>🔐</span><h1>Admin access required</h1><p>{error}</p><Link href="/dbase/login" style={styles.primary}>Admin Login</Link></div></main>;
 if(!data)return <main style={styles.page}><div style={styles.loading}><span style={styles.bigIcon}>🛡️</span><h1>Loading Admin</h1><p>Securing your command center…</p></div></main>;
 const s=data.stats||{};const stats:Stat[]=[{label:"Players",value:Number(s.total||0).toLocaleString(),icon:"👥"},{label:"Online",value:Number(data.online||0).toLocaleString(),icon:"🟢"},{label:"Coins",value:Number(s.coins||0).toLocaleString(),icon:"🪙"},{label:"Gems",value:Number(s.gems||0).toLocaleString(),icon:"💎"}];
 return <main style={styles.page}><div style={styles.container}>
  <header style={styles.header}><div><div style={styles.kicker}>LUDO LIVE • ADMIN</div><h1 style={styles.title}>Command Center</h1><p style={styles.subtitle}>{data.admin?.email||"Administrator"}</p></div><div style={styles.status}>● LIVE</div></header>
  <section style={styles.stats}>{stats.map(x=><div key={x.label} style={styles.stat}><span style={styles.statIcon}>{x.icon}</span><div style={styles.statText}><small>{x.label}</small><strong>{x.value}</strong></div></div>)}</section>
  <section><div style={styles.sectionTitle}><div><h2 style={styles.sectionHeading}>Management</h2><p style={styles.sectionDescription}>Choose a section to manage it on its own page.</p></div></div><div style={styles.grid}>{sections.map(([slug,icon,name,desc])=><Link href={`/dbase/${slug}`} key={slug} style={styles.card}><span style={styles.cardIcon}>{icon}</span><div style={styles.cardBody}><h3 style={styles.cardHeading}>{name}</h3><p style={styles.cardDescription}>{desc}</p></div><span style={styles.arrow}>→</span></Link>)}</div></section>
  <section style={styles.quick}><div><h2 style={styles.quickHeading}>Admin information</h2><p style={styles.quickDescription}>Existing players, shop data, rewards, inventory, economy records, support records and other stored information remain untouched by this interface rebuild.</p></div><span style={styles.quickIcon}>🛡️</span></section>
 </div><style jsx>{`@media(max-width:700px){main{padding-top:14px}.admin-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-grid{grid-template-columns:1fr}}`}</style></main>
}
const styles:any={page:{minHeight:"100vh",background:"#030817",color:"#eef5ff",padding:"20px 14px 60px",fontFamily:"system-ui,-apple-system,sans-serif"},container:{width:"min(1120px,100%)",margin:"0 auto"},header:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,padding:"10px 2px 22px"},kicker:{fontSize:10,fontWeight:900,letterSpacing:2,color:"#70b0ff"},title:{fontSize:"clamp(28px,6vw,42px)",margin:"5px 0 2px",lineHeight:1.05},subtitle:{margin:0,color:"#8298b8",fontSize:13,overflowWrap:"anywhere"},status:{padding:"8px 11px",borderRadius:999,background:"#0b2b20",border:"1px solid #1c6848",color:"#79e6ac",fontWeight:900,fontSize:11},stats:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginBottom:28},stat:{display:"flex",alignItems:"center",gap:10,minWidth:0,padding:14,borderRadius:16,background:"#08142b",border:"1px solid #1c3356"},statIcon:{fontSize:22},statText:{display:"grid",minWidth:0},sectionTitle:{marginBottom:12},sectionHeading:{margin:0,fontSize:22},sectionDescription:{margin:"4px 0 0",color:"#8298b8",fontSize:12},grid:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12},card:{display:"flex",alignItems:"center",gap:13,minWidth:0,textDecoration:"none",color:"inherit",padding:16,borderRadius:16,background:"#08142b",border:"1px solid #1c3356"},cardIcon:{fontSize:28,width:42,textAlign:"center"},cardBody:{minWidth:0,flex:1},cardHeading:{margin:"0 0 4px",fontSize:16},cardDescription:{margin:0,color:"#8298b8",fontSize:12,lineHeight:1.4},arrow:{fontSize:22,color:"#6ea8ef"},quick:{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",marginTop:28,padding:17,borderRadius:16,background:"#071125",border:"1px solid #182f50"},quickHeading:{margin:"0 0 5px",fontSize:16},quickDescription:{margin:0,color:"#8298b8",fontSize:12,lineHeight:1.5},quickIcon:{fontSize:30},loading:{minHeight:"80vh",display:"grid",placeItems:"center",alignContent:"center",textAlign:"center"},error:{minHeight:"80vh",display:"grid",placeItems:"center",alignContent:"center",textAlign:"center",gap:8},bigIcon:{fontSize:42},primary:{display:"inline-block",padding:"11px 16px",borderRadius:11,background:"#1769e8",color:"white",textDecoration:"none",fontWeight:900}};
