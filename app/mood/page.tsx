"use client";

export default function MoodPage(){
  return (
    <main style={{minHeight:"100vh",background:"#06162f",color:"#fff",padding:"28px 18px",boxSizing:"border-box",display:"grid",placeItems:"center"}}>
      <section style={{width:"100%",maxWidth:520,textAlign:"center"}}>
        <div style={{fontSize:12,fontWeight:950,letterSpacing:4,color:"#62b4ff",marginBottom:10}}>GAME MODE</div>
        <h1 style={{fontSize:"clamp(30px,8vw,48px)",margin:"0 0 28px",fontWeight:950}}>Choose your game</h1>
        <a href="/game" style={{display:"block",padding:"22px 18px",borderRadius:20,background:"linear-gradient(135deg,#0b2b55,#0a1d3b)",border:"1px solid #2d78dc",color:"#fff",textDecoration:"none",boxShadow:"0 12px 30px rgba(0,0,0,.25)"}}>
          <strong style={{display:"block",fontSize:24}}>Player vs Bot</strong>
          <span style={{display:"block",marginTop:6,color:"#a9c0e5"}}>Play a local game against the bot</span>
        </a>
      </section>
    </main>
  );
}
