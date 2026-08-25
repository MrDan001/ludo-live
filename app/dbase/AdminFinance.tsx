"use client";
import {useEffect,useState} from "react";

export default function AdminFinance(){
  const[d,setD]=useState<any>(null),[open,setOpen]=useState(false),[currency,setCurrency]=useState("coins"),[amount,setAmount]=useState(""),[reason,setReason]=useState("Platform funding"),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const load=()=>fetch("/api/admin/finance",{cache:"no-store"}).then(async r=>{const x=await r.json();if(r.ok)setD(x);else setMessage(x.error||"Finance unavailable")}).catch(()=>setMessage("Finance unavailable"));
  useEffect(()=>{void load()},[]);
  const act=async(body:any)=>{setBusy(true);setMessage("");try{const r=await fetch("/api/admin/finance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),x=await r.json();if(!r.ok)throw Error(x.error);setMessage("Wallet updated.");setAmount("");await load()}catch(e){setMessage(e instanceof Error?e.message:"Action failed")}finally{setBusy(false)}};
  if(!d)return <button style={fab} onClick={()=>{setOpen(true);void load()}}>🏦 Finance</button>;
  const w=d.wallet||{};
  return <>
    {!open&&<button style={fab} onClick={()=>setOpen(true)}>🏦 Finance</button>}
    {open&&<div style={overlay}>
      <section style={panel}>
        <header style={head}><div><small style={eyebrow}>DBASE • ADMIN FINANCE</small><h2>🏦 Platform Wallets</h2><p>Money Bank is the Admin-only server top-up source. Treasury is for tournament obligations. Revenue records game/tournament purchases.</p></div><button style={close} onClick={()=>setOpen(false)}>×</button></header>
        <div style={grid}><Card icon="🏦" title="Money Bank" coins={w.money_bank_coins} gems={w.money_bank_gems}/><Card icon="🏆" title="Treasury" coins={w.treasury_coins} gems={w.treasury_gems}/><Card icon="💰" title="Revenue" coins={w.revenue_coins} gems={w.revenue_gems}/></div>
        <section style={box}>
          <h3>Server Top Up • Money Bank</h3>
          <div className="finance-form finance-topup-form" style={form}>
            <select value={currency} onChange={e=>setCurrency(e.target.value)}><option value="coins">🪙 Coins</option><option value="gems">💎 Gems</option></select>
            <input type="number" min="1" inputMode="numeric" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)}/>
            <input placeholder="Reason" value={reason} onChange={e=>setReason(e.target.value)}/>
            <button style={primary} disabled={busy||!amount} onClick={()=>void act({action:"topup_money_bank",currency,amount:Number(amount),reason})}>{busy?"…":"TOP UP MONEY BANK"}</button>
          </div>
        </section>
        <section style={box}>
          <h3>Transfer from Money Bank to Treasury</h3>
          <div className="finance-form finance-transfer-form" style={form}>
            <button style={secondary} disabled={busy||!amount} onClick={()=>void act({action:"transfer",from:"money_bank",to:"treasury",currency,amount:Number(amount),reason:"Tournament funding transfer"})}>TRANSFER {currency}</button>
            <input type="number" min="1" inputMode="numeric" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)}/>
          </div>
        </section>
        {message&&<div style={notice}>{message}</div>}
        <div style={ledger}>{(d.ledger||[]).slice(0,30).map((x:any)=><div key={x.id}><b>{x.wallet_from?`${x.wallet_from} → ${x.wallet_to}`:x.wallet_to}</b><span>{Number(x.amount).toLocaleString()} {x.currency}</span><small>{x.reason} • {new Date(x.created_at).toLocaleString()}</small></div>)}</div>
      </section>
    </div>}
    <style dangerouslySetInnerHTML={{__html:`
      .finance-form{width:100%;min-width:0}
      .finance-form select,.finance-form input{min-width:0;box-sizing:border-box}
      .finance-form button{min-width:0;white-space:normal;line-height:1.15}
      @media(max-width:700px){
        .finance-form{display:grid!important;grid-template-columns:1fr!important;gap:10px!important}
        .finance-form>*{width:100%!important;min-width:0!important;margin:0!important}
        .finance-topup-form button{min-height:52px!important}
        .finance-transfer-form button{min-height:48px!important}
      }
    `}}/>
  </>
}

function Card({icon,title,coins,gems}:{icon:string;title:string;coins:any;gems:any}){return <div style={card}><b>{icon} {title}</b><strong>🪙 {Number(coins||0).toLocaleString()}</strong><strong>💎 {Number(gems||0).toLocaleString()}</strong></div>}
const fab:any={position:"fixed",right:18,bottom:70,zIndex:50,border:0,borderRadius:14,padding:"13px 16px",background:"linear-gradient(135deg,#0d7c68,#1767e8)",color:"#fff",fontWeight:950,boxShadow:"0 10px 30px #0008"};
const overlay:any={position:"fixed",inset:0,zIndex:60,background:"#020611dd",backdropFilter:"blur(10px)",padding:16,display:"grid",placeItems:"center"};
const panel:any={width:"min(900px,100%)",maxHeight:"92vh",overflow:"auto",background:"linear-gradient(145deg,#0b1d3d,#050d20)",border:"1px solid #31578f",borderRadius:20,padding:20,color:"#eaf2ff"};
const head:any={display:"flex",justifyContent:"space-between",gap:15};const eyebrow:any={fontSize:10,letterSpacing:2,color:"#66b5ff",fontWeight:950};const close:any={width:40,height:40,borderRadius:12,border:"1px solid #38557d",background:"#0a1831",color:"#fff",fontSize:25};const grid:any={display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:15};const card:any={padding:14,borderRadius:14,background:"#07162e",border:"1px solid #203b63",display:"grid",gap:7};const box:any={padding:14,borderRadius:14,background:"#07162e",border:"1px solid #203b63",marginTop:12};const form:any={display:"grid",gridTemplateColumns:"140px 1fr 1fr auto",gap:8};const primary:any={border:0,borderRadius:10,padding:"10px 12px",background:"linear-gradient(135deg,#1767e8,#7134ef)",color:"white",fontWeight:950};const secondary:any={border:"1px solid #38557d",borderRadius:10,padding:"10px 12px",background:"#0a1831",color:"white",fontWeight:900};const notice:any={padding:10,borderRadius:10,background:"#0b321f",color:"#8af0aa",marginTop:10};const ledger:any={display:"grid",gap:7,marginTop:14};
