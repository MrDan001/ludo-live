import BoardPage from "../board/page";

export default function GamePage(){
  return (
    <div style={{position:"relative",minHeight:"100vh"}}>
      <a
        href="/mood"
        aria-label="Back to game mode"
        style={{
          position:"fixed",
          top:14,
          left:14,
          zIndex:100,
          display:"inline-flex",
          alignItems:"center",
          gap:7,
          padding:"9px 14px",
          borderRadius:12,
          background:"rgba(7,26,54,.92)",
          border:"1px solid rgba(96,165,250,.55)",
          color:"#fff",
          textDecoration:"none",
          fontWeight:850,
          fontSize:14,
          boxShadow:"0 8px 20px rgba(0,0,0,.2)"
        }}
      >
        ← Back
      </a>
      <BoardPage />
    </div>
  );
}
