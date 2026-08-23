"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";

type TournamentForm = {
  name: string;
  description: string;
  entry_fee_coins: number;
  entry_fee_gems: number;
  prize_pool_coins: number;
  prize_pool_gems: number;
  max_players: number;
  starts_at: string;
  ends_at: string;
};

type Tournament = TournamentForm & {
  id: string;
  players_count: number;
  status: string;
};

const nowPlusHours = (hours: number) => {
  const d = new Date(Date.now() + hours * 36e5);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const blankForm = (): TournamentForm => ({
  name: "",
  description: "",
  entry_fee_coins: 1000,
  entry_fee_gems: 0,
  prize_pool_coins: 100000,
  prize_pool_gems: 2000,
  max_players: 64,
  starts_at: nowPlusHours(1),
  ends_at: nowPlusHours(73),
});

export default function TournamentAdmin() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Tournament[]>([]);
  const [form, setForm] = useState<TournamentForm>(blankForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    const response = await fetch("/api/admin/tournaments", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setList(Array.isArray(data.tournaments) ? data.tournaments : []);
  };

  useEffect(() => {
    void load();
  }, []);

  const updateField = (key: keyof TournamentForm, value: string | number) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          action: editId ? "edit" : "create",
          id: editId || undefined,
          starts_at: new Date(form.starts_at).toISOString(),
          ends_at: new Date(form.ends_at).toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed.");
      setMessage(editId ? "Tournament updated." : "Tournament created.");
      setEditId(null);
      setForm(blankForm());
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = (tournament: Tournament) => {
    setEditId(tournament.id);
    setForm({
      name: tournament.name,
      description: tournament.description || "",
      entry_fee_coins: Number(tournament.entry_fee_coins),
      entry_fee_gems: Number(tournament.entry_fee_gems),
      prize_pool_coins: Number(tournament.prize_pool_coins),
      prize_pool_gems: Number(tournament.prize_pool_gems),
      max_players: Number(tournament.max_players),
      starts_at: new Date(tournament.starts_at).toISOString().slice(0, 16),
      ends_at: new Date(tournament.ends_at).toISOString().slice(0, 16),
    });
    setOpen(true);
  };

  const changeStatus = async (id: string, status: string) => {
    await fetch("/api/admin/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", id, status }),
    });
    await load();
  };

  const numberField = (key: keyof TournamentForm, label: string) => (
    <label style={fieldLabel} key={key}>
      <span>{label}</span>
      <input
        type="number"
        value={Number(form[key])}
        onChange={(event: ChangeEvent<HTMLInputElement>) => updateField(key, Number(event.target.value))}
        style={inputStyle}
      />
    </label>
  );

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} style={fabStyle}>
          🏆 Tournaments
        </button>
      )}

      {open && (
        <div style={overlayStyle}>
          <section style={panelStyle}>
            <header style={headerStyle}>
              <div>
                <small style={eyebrowStyle}>DBASE • TOURNAMENT CONTROL</small>
                <h2 style={{ margin: "4px 0" }}>🏆 Tournament Manager</h2>
                <p style={mutedStyle}>
                  Create and edit tournaments. Prize places are recalculated from the prize pool automatically.
                </p>
              </div>
              <button onClick={() => setOpen(false)} style={closeStyle} aria-label="Close">
                ×
              </button>
            </header>

            <div style={formGridStyle}>
              <label style={fieldLabel}>
                <span>Tournament name</span>
                <input value={form.name} onChange={(e) => updateField("name", e.target.value)} style={inputStyle} />
              </label>
              {numberField("entry_fee_coins", "Entry coins")}
              {numberField("entry_fee_gems", "Entry gems")}
              {numberField("prize_pool_coins", "Prize coins")}
              {numberField("prize_pool_gems", "Prize gems")}
              {numberField("max_players", "Max players")}
              <label style={fieldLabel}>
                <span>Start</span>
                <input type="datetime-local" value={form.starts_at} onChange={(e) => updateField("starts_at", e.target.value)} style={inputStyle} />
              </label>
              <label style={fieldLabel}>
                <span>End</span>
                <input type="datetime-local" value={form.ends_at} onChange={(e) => updateField("ends_at", e.target.value)} style={inputStyle} />
              </label>
            </div>

            <label style={fieldLabel}>
              <span>Description</span>
              <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} style={textareaStyle} />
            </label>

            <div style={rowStyle}>
              <button disabled={busy || !form.name.trim()} onClick={save} style={primaryStyle}>
                {busy ? "Saving…" : editId ? "SAVE CHANGES" : "CREATE TOURNAMENT"}
              </button>
              {editId && (
                <button onClick={() => { setEditId(null); setForm(blankForm()); }} style={secondaryStyle}>
                  Cancel
                </button>
              )}
            </div>

            {message && <div style={noticeStyle}>{message}</div>}

            <div style={listStyle}>
              {list.map((tournament) => (
                <article key={tournament.id} style={itemStyle}>
                  <div>
                    <b>{tournament.name}</b>
                    <small style={smallBlockStyle}>{tournament.players_count}/{tournament.max_players} • {tournament.status}</small>
                    <small style={smallBlockStyle}>
                      🪙 {Number(tournament.prize_pool_coins).toLocaleString()} • 💎 {Number(tournament.prize_pool_gems).toLocaleString()}
                    </small>
                  </div>
                  <div style={rowStyle}>
                    <button onClick={() => beginEdit(tournament)} style={secondaryStyle}>Edit</button>
                    {tournament.status !== "open" && tournament.status !== "live" && (
                      <button onClick={() => void changeStatus(tournament.id, "open")} style={primaryStyle}>Open</button>
                    )}
                    {tournament.status === "open" && (
                      <button onClick={() => void changeStatus(tournament.id, "cancelled")} style={dangerStyle}>Cancel</button>
                    )}
                    {tournament.status === "live" && (
                      <button onClick={() => void changeStatus(tournament.id, "finished")} style={dangerStyle}>Finish</button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

const overlayStyle: CSSProperties = { position: "fixed", inset: 0, zIndex: 49, background: "#020611dd", backdropFilter: "blur(10px)", padding: 16, display: "grid", placeItems: "center" };
const panelStyle: CSSProperties = { width: "min(900px,100%)", maxHeight: "92vh", overflow: "auto", background: "linear-gradient(145deg,#0b1d3d,#050d20)", border: "1px solid #31578f", borderRadius: 20, padding: 20, color: "#eaf2ff", boxShadow: "0 25px 70px #000" };
const headerStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 15 };
const eyebrowStyle: CSSProperties = { fontSize: 10, letterSpacing: 2, color: "#66b5ff", fontWeight: 950 };
const mutedStyle: CSSProperties = { color: "#8fa8ca", fontSize: 12 };
const closeStyle: CSSProperties = { width: 40, height: 40, borderRadius: 12, border: "1px solid #38557d", background: "#0a1831", color: "#fff", fontSize: 25 };
const formGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9, marginTop: 14 };
const fieldLabel: CSSProperties = { display: "grid", gap: 5, color: "#8fa8ca", fontSize: 11, fontWeight: 800, marginTop: 9 };
const inputStyle: CSSProperties = { background: "#07152d", border: "1px solid #2a466f", borderRadius: 10, padding: 11, color: "#fff", minWidth: 0 };
const textareaStyle: CSSProperties = { ...inputStyle, width: "100%", minHeight: 80, resize: "vertical" };
const rowStyle: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 };
const fabStyle: CSSProperties = { position: "fixed", right: 18, bottom: 18, zIndex: 50, border: 0, borderRadius: 14, padding: "13px 16px", background: "linear-gradient(135deg,#1767e8,#7134ef)", color: "#fff", fontWeight: 950, boxShadow: "0 10px 30px #0008" };
const primaryStyle: CSSProperties = { border: 0, borderRadius: 10, padding: "10px 13px", background: "linear-gradient(135deg,#1767e8,#7134ef)", color: "#fff", fontWeight: 950 };
const secondaryStyle: CSSProperties = { border: "1px solid #38557d", borderRadius: 10, padding: "9px 12px", background: "#0a1831", color: "#dce9ff", fontWeight: 850 };
const dangerStyle: CSSProperties = { ...secondaryStyle, background: "#681e2b", borderColor: "#b94a60" };
const listStyle: CSSProperties = { display: "grid", gap: 8, marginTop: 16 };
const itemStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: 12, borderRadius: 13, background: "#07162e", border: "1px solid #203b63" };
const smallBlockStyle: CSSProperties = { display: "block", color: "#8fa8ca", marginTop: 3 };
const noticeStyle: CSSProperties = { marginTop: 10, padding: 10, borderRadius: 10, background: "#0b321f", color: "#8af0aa", fontSize: 12 };
