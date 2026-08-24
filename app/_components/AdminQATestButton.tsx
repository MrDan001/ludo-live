"use client";
import { useEffect, useState } from "react";

export default function AdminQATestButton() {
  const [admin, setAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin", { cache: "no-store" })
      .then(r => setAdmin(r.ok))
      .catch(() => setAdmin(false));
  }, []);

  if (!admin) return null;

  async function runTests() {
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch("/api/qa", { cache: "no-store" });
      setResult(await r.json());
    } catch {
      setResult({ error: "Could not run QA tests." });
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button
      type="button"
      onClick={() => setOpen(v => !v)}
      aria-label="Open Ludo Live QA tests"
      style={{ position:"fixed", right:12, bottom:12, zIndex:9999, border:0, borderRadius:999, padding:"10px 14px", background:"#111827", color:"#fff", fontWeight:800, boxShadow:"0 8px 30px rgba(0,0,0,.3)" }}
    >🧪 QA TEST</button>
    {open && <div style={{ position:"fixed", right:12, bottom:60, width:"min(360px,calc(100vw - 24px))", maxHeight:"70vh", overflow:"auto", zIndex:9998, borderRadius:18, padding:16, background:"rgba(10,14,24,.97)", color:"#fff", boxShadow:"0 20px 60px rgba(0,0,0,.45)", fontFamily:"system-ui" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:900 }}>Ludo Live — Board QA</div>
          <div style={{ fontSize:12, opacity:.7, margin:"4px 0 12px" }}>Canonical engine tests • admin only</div>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close QA panel" style={{ border:0, background:"transparent", color:"#fff", fontSize:20, cursor:"pointer" }}>×</button>
      </div>
      <button type="button" onClick={runTests} disabled={busy} style={{ width:"100%", border:0, borderRadius:12, padding:12, fontWeight:900, cursor:"pointer" }}>{busy ? "Running tests…" : "▶ Run All Tests"}</button>
      {result && (result.error ? <div style={{ marginTop:12, color:"#ff9b9b" }}>{result.error}</div> : <><div style={{ marginTop:12, fontWeight:900 }}>{result.passed}/{result.total} TESTS PASSED</div><div style={{ marginTop:8, display:"grid", gap:5 }}>{result.tests.map((t:any)=><div key={t.name} style={{ fontSize:12, padding:"7px 8px", borderRadius:8, background:t.passed?"rgba(34,197,94,.16)":"rgba(239,68,68,.16)", color:t.passed?"#86efac":"#fca5a5" }}>{t.passed?"✓":"✗"} {t.name}</div>)}</div></>)}
    </div>}
  </>;
}
