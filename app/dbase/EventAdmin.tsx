"use client";
import { useEffect, useMemo, useState } from "react";

type Form = { id?: string; title: string; description: string; icon: string; color: string; rewardCoins: number; rewardGems: number; missionKind: string; missionTarget: number; modes: string[]; boards: string[]; startsAt: string; endsAt: string };
const modes = [{ id: "bot", label: "Bot vs Human" }, { id: "2p", label: "2 Player" }, { id: "4p", label: "4 Player" }, { id: "tournament", label: "Tournament" }];
const boards = [{ id: "classic", label: "Classic" }, { id: "midnight", label: "Midnight Live" }, { id: "royal", label: "Royal" }, { id: "jungle", label: "Jungle" }, { id: "fire-ice", label: "Fire & Ice" }];
const kinds = [{ id: "win_games", label: "Games won" }, { id: "play_games", label: "Games played" }, { id: "roll_dice", label: "Dice rolls" }, { id: "move_tokens", label: "Token moves" }, { id: "complete_games", label: "Games finished" }, { id: "roll_sixes", label: "Sixes rolled" }, { id: "move_home", label: "Tokens home" }];
const empty = (): Form => ({ title: "", description: "", icon: "🎉", color: "purple", rewardCoins: 2500, rewardGems: 0, missionKind: "win_games", missionTarget: 3, modes: ["bot", "2p", "4p"], boards: ["classic", "midnight", "royal", "jungle", "fire-ice"], startsAt: localDateTime(new Date(Date.now() + 20 * 60000)), endsAt: localDateTime(new Date(Date.now() + 140 * 60000)) });
function localDateTime(d: Date) { const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return x.toISOString().slice(0, 16); }
function formFrom(x: any): Form { return { id: x.id, title: x.title, description: x.description || "", icon: x.icon || "🎉", color: x.color || "purple", rewardCoins: Number(x.rewardCoins || 0), rewardGems: Number(x.rewardGems || 0), missionKind: x.missionKind || "win_games", missionTarget: Number(x.missionTarget || 1), modes: x.modes || [], boards: x.boards || [], startsAt: localDateTime(new Date(x.startsAt)), endsAt: localDateTime(new Date(x.endsAt)) }; }
function iso(v: string) { return new Date(v).toISOString(); }

export default function EventAdmin() {
  const [open, setOpen] = useState(false), [events, setEvents] = useState<any[]>([]), [form, setForm] = useState<Form>(empty()), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const load = async () => { try { const r = await fetch("/api/admin/events", { cache: "no-store" }); const x = await r.json(); if (!r.ok) throw Error(x.error); setEvents(x.events || []); } catch (e) { setMsg(e instanceof Error ? e.message : "Event admin unavailable."); } };
  useEffect(() => { void load(); }, []);
  const live = useMemo(() => events.filter(x => x.state === "live").length, [events]);
  const upcoming = useMemo(() => events.filter(x => x.state === "upcoming").length, [events]);
  const set = (key: keyof Form, value: any) => setForm(x => ({ ...x, [key]: value }));
  const toggle = (key: "modes" | "boards", id: string) => setForm(x => ({ ...x, [key]: x[key].includes(id) ? x[key].filter(v => v !== id) : [...x[key], id] }));
  const save = async () => {
    if (!form.title.trim() || !form.startsAt || !form.endsAt) return setMsg("Title, start and end time are required.");
    if (new Date(form.endsAt).getTime() <= new Date(form.startsAt).getTime()) return setMsg("End time must be after start time.");
    if (!form.modes.length || !form.boards.length) return setMsg("Select at least one game mode and one board.");
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/admin/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: form.id ? "edit" : "create", ...form, startsAt: iso(form.startsAt), endsAt: iso(form.endsAt) }) });
      const x = await r.json(); if (!r.ok) throw Error(x.error || "Save failed.");
      setMsg(form.id ? "Event updated." : "Event created and published."); setForm(empty()); await load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Save failed."); } finally { setBusy(false); }
  };
  const status = async (id: string, value: string) => { await fetch("/api/admin/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_status", id, status: value }) }); await load(); };
  const remove = async (id: string) => { if (!confirm("Delete this event?")) return; await fetch("/api/admin/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) }); await load(); };

  return <>
    {!open && <button onClick={() => setOpen(true)} style={fab}>🎉 Events</button>}
    {open && <div style={overlay}><section style={panel}>
      <header style={head}><div><small style={eyebrow}>DBASE • EVENT CONTROL</small><h2 style={{ margin: "4px 0" }}>🎉 Event Manager</h2><p style={muted}>One server-side event source for the player Event page. Dates decide Upcoming, Live and Expired automatically.</p></div><button onClick={() => { setOpen(false); setForm(empty()); }} style={close}>×</button></header>
      <div style={stats}><div><b>{live}</b><small>Live</small></div><div><b>{upcoming}</b><small>Upcoming</small></div><div><b>{events.length}</b><small>Total</small></div></div>
      <section style={card}><div style={sectionTitle}><div><b>{form.id ? "✏️ Edit event" : "＋ Create event"}</b><small>Admin-selected start/end times are authoritative. A published event automatically becomes Live at start and Expired at end.</small></div></div>
        <div style={grid}>
          <label style={field}><span>Title</span><input value={form.title} onChange={e => set("title", e.target.value)} style={input} placeholder="Event name" /></label>
          <label style={field}><span>Icon</span><input value={form.icon} onChange={e => set("icon", e.target.value)} style={input} maxLength={8} /></label>
          <label style={field}><span>Reward coins</span><input type="number" min="0" value={form.rewardCoins} onChange={e => set("rewardCoins", Number(e.target.value))} style={input} /></label>
          <label style={field}><span>Reward gems</span><input type="number" min="0" value={form.rewardGems} onChange={e => set("rewardGems", Number(e.target.value))} style={input} /></label>
          <label style={field}><span>Objective</span><select value={form.missionKind} onChange={e => set("missionKind", e.target.value)} style={input}>{kinds.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
          <label style={field}><span>Target</span><input type="number" min="1" value={form.missionTarget} onChange={e => set("missionTarget", Number(e.target.value))} style={input} /></label>
          <label style={field}><span>Starts</span><input type="datetime-local" value={form.startsAt} onChange={e => set("startsAt", e.target.value)} style={input} /></label>
          <label style={field}><span>Ends</span><input type="datetime-local" value={form.endsAt} onChange={e => set("endsAt", e.target.value)} style={input} /></label>
        </div>
        <label style={field}><span>Description</span><textarea value={form.description} onChange={e => set("description", e.target.value)} style={textarea} placeholder="Tell players what to do." /></label>
        <div style={choiceGrid}><div><b style={choiceTitle}>Game modes</b><div style={chips}>{modes.map(x => <button type="button" key={x.id} onClick={() => toggle("modes", x.id)} style={{ ...chip, ...(form.modes.includes(x.id) ? chipOn : {}) }}>{form.modes.includes(x.id) ? "✓ " : ""}{x.label}</button>)}</div></div><div><b style={choiceTitle}>Boards / moods</b><div style={chips}>{boards.map(x => <button type="button" key={x.id} onClick={() => toggle("boards", x.id)} style={{ ...chip, ...(form.boards.includes(x.id) ? chipOn : {}) }}>{form.boards.includes(x.id) ? "✓ " : ""}{x.label}</button>)}</div></div></div>
        {msg && <p style={message}>{msg}</p>}
        <div style={row}><button disabled={busy} onClick={save} style={primary}>{busy ? "Saving…" : form.id ? "SAVE EVENT" : "PUBLISH EVENT"}</button>{form.id && <button onClick={() => setForm(empty())} style={secondary}>Cancel edit</button>}</div>
      </section>
      <div style={list}>{events.map(x => <article key={x.id} style={item}><div style={{ minWidth: 0 }}><b>{x.icon} {x.title}</b><small>{x.description}</small><small>{x.state.toUpperCase()} · {new Date(x.startsAt).toLocaleString()} → {new Date(x.endsAt).toLocaleString()}</small><small>🎯 {x.missionKind} × {x.missionTarget} · {x.participants} joined · {x.completed} completed</small></div><div style={row}><span style={pill}>{x.state}</span><button style={secondary} onClick={() => setForm(formFrom(x))}>Edit</button>{x.state === "live" && <button style={warn} onClick={() => void status(x.id, "ended")}>End</button>}{x.state === "upcoming" && <button style={danger} onClick={() => void status(x.id, "cancelled")}>Cancel</button>}<button style={danger} onClick={() => void remove(x.id)}>Delete</button></div></article>)}</div>
    </section></div>}
  </>;
}

const fab: any = { border: "1px solid #355b8f", background: "#0b1935", color: "#fff", borderRadius: 12, padding: "10px 14px", fontWeight: 900, cursor: "pointer" };
const overlay: any = { position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.72)", backdropFilter: "blur(5px)", display: "grid", placeItems: "center", padding: 12 };
const panel: any = { width: "min(1100px,96vw)", maxHeight: "94vh", overflow: "auto", background: "#061127", color: "#e8f0ff", border: "1px solid #2a4b77", borderRadius: 20, padding: 18, boxShadow: "0 25px 90px rgba(0,0,0,.6)" };
const head: any = { display: "flex", justifyContent: "space-between", gap: 15, alignItems: "flex-start" }; const eyebrow: any = { color: "#69a8ff", fontSize: 10, fontWeight: 950, letterSpacing: 1.5 }; const close: any = { border: "1px solid #315078", background: "#0b1935", color: "white", width: 40, height: 40, borderRadius: 10, fontSize: 24, cursor: "pointer" }; const muted: any = { color: "#8fa5c5", fontSize: 13, lineHeight: 1.45 }; const card: any = { marginTop: 14, padding: 15, border: "1px solid #20375d", borderRadius: 16, background: "#08172e" }; const sectionTitle: any = { display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12 }; const grid: any = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }; const field: any = { display: "grid", gap: 6, color: "#9db4d4", fontSize: 12, fontWeight: 800, marginBottom: 10 }; const input: any = { width: "100%", background: "#071024", color: "white", border: "1px solid #2b466f", borderRadius: 10, padding: "10px 11px" }; const textarea: any = { ...input, minHeight: 70, resize: "vertical" }; const choiceGrid: any = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginTop: 5 }; const choiceTitle: any = { display: "block", marginBottom: 8 }; const chips: any = { display: "flex", flexWrap: "wrap", gap: 7 }; const chip: any = { border: "1px solid #29476f", background: "#091a35", color: "#bcd0ee", borderRadius: 999, padding: "8px 10px", cursor: "pointer", fontWeight: 800 }; const chipOn: any = { background: "#1657b8", color: "white", borderColor: "#4e93ff" }; const row: any = { display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }; const primary: any = { border: 0, background: "linear-gradient(180deg,#277cf0,#145ec8)", color: "white", borderRadius: 10, padding: "10px 14px", fontWeight: 900, cursor: "pointer" }; const secondary: any = { border: "1px solid #35527f", background: "#0a1731", color: "#dce9ff", padding: "8px 10px", borderRadius: 9, fontWeight: 850, cursor: "pointer" }; const warn: any = { ...secondary, background: "#765411", borderColor: "#c69b2e" }; const danger: any = { ...secondary, background: "#6d1d2b", borderColor: "#d65a6d", color: "white" }; const message: any = { color: "#9fe8c0", fontWeight: 800 }; const list: any = { display: "grid", gap: 8, marginTop: 14 }; const item: any = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", padding: 13, border: "1px solid #1c3458", borderRadius: 14, background: "#07152b" }; const pill: any = { padding: "6px 9px", borderRadius: 999, background: "#102b50", color: "#bcd5f5", fontSize: 11, fontWeight: 900 }; const stats: any = { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 12 }; const statsCard: any = {};