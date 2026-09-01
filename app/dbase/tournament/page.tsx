"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import "../dbase.css";

type Tournament = Record<string, any>;
type Phase = "draft" | "upcoming" | "live" | "finished" | "cancelled";

const meta: Record<Phase, [string, string]> = {
  draft: ["DRAFT", "📝"],
  upcoming: ["UPCOMING", "🟢"],
  live: ["LIVE", "🔴"],
  finished: ["ENDED", "🏁"],
  cancelled: ["CANCELLED", "⛔"],
};

function phaseOf(tournament: Tournament, now: number): Phase {
  if (tournament.status === "draft") return "draft";
  if (tournament.status === "cancelled") return "cancelled";

  const start = new Date(tournament.starts_at).getTime();
  const end = new Date(tournament.ends_at).getTime();

  if (Number.isFinite(end) && now >= end) return "finished";
  if (Number.isFinite(start) && now >= start) return "live";
  return "upcoming";
}

function formatDate(value: any) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function localDateTime(value: any) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function TournamentAdmin() {
  const [rows, setRows] = useState<Tournament[]>([]);
  const [edit, setEdit] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/tournaments", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load tournaments");
      setRows(data.tournaments || []);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Unable to load tournaments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const counts = useMemo(() => {
    const result: Record<Phase, number> = {
      draft: 0,
      upcoming: 0,
      live: 0,
      finished: 0,
      cancelled: 0,
    };
    for (const tournament of rows) {
      result[phaseOf(tournament, now)] += 1;
    }
    return result;
  }, [rows, now]);

  const startNew = () => {
    const start = new Date();
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    setError("");
    setNotice("");
    setEdit({
      name: "New tournament",
      description: "",
      entry_fee_coins: 0,
      entry_fee_gems: 0,
      prize_pool_coins: 0,
      prize_pool_gems: 0,
      max_players: 16,
      participation_reward_coins: 1000,
      participation_reward_gems: 0,
      prize_multiplier: 0.2,
      startsAtLocal: localDateTime(start),
      endsAtLocal: localDateTime(end),
      status: "open",
    });
  };

  const save = async () => {
    if (!edit) return;

    setError("");
    setNotice("");

    const current = phaseOf(edit, now);
    const storedStatus = current === "draft" ? "draft" : current === "cancelled" ? "cancelled" : "open";

    const payload = {
      ...edit,
      action: edit.id ? "edit" : "create",
      status: storedStatus,
      starts_at: edit.startsAtLocal ? new Date(edit.startsAtLocal).toISOString() : "",
      ends_at: edit.endsAtLocal ? new Date(edit.endsAtLocal).toISOString() : "",
    };

    try {
      const response = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save tournament");

      setEdit(null);
      setNotice("Tournament saved. Its phase will change automatically from the schedule.");
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to save tournament");
    }
  };

  const removeTournament = async (tournament: Tournament) => {
    const name = String(tournament.name || "this tournament");
    if (!window.confirm(`Delete tournament “${name}”? This cannot be undone.`)) return;

    setError("");
    setNotice("");
    setDeletingId(String(tournament.id));

    try {
      const response = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: tournament.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete tournament");

      if (String(edit?.id || "") === String(tournament.id)) setEdit(null);
      setNotice(`Tournament “${name}” was deleted successfully.`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to delete tournament");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <main className="dbase-app">
      <aside className="dbase-sidebar">
        <div className="brand">
          <div className="brand-mark">♛</div>
          <div>
            <b>LUDO LIVE</b>
            <span>ADMIN CONTROL</span>
          </div>
        </div>
        <nav>
          <div className="nav-wrap">
            <small>Live Ops</small>
            <Link href="/dbase">◈ Dashboard</Link>
            <Link href="/dbase/missions">✓ Missions</Link>
            <Link href="/dbase/events">◇ Events</Link>
            <Link className="active" href="/dbase/tournament">♛ Tournament</Link>
          </div>
        </nav>
      </aside>

      <section className="dbase-main">
        <header className="dbase-header">
          <div className="header-title">
            <span>LIVE OPS</span>
            <h1>Tournament</h1>
          </div>
          <div className="admin-user">
            <div className="user-avatar">A</div>
            <div className="user-copy">
              <b>Administrator</b>
              <span>Tournament control</span>
            </div>
          </div>
        </header>

        <div className="dbase-content">
          <div className="page-intro">
            <div>
              <span className="eyebrow">TOURNAMENT CONTROL</span>
              <h2>Current tournaments</h2>
              <p>
                Status is automatic from the schedule: <b>Upcoming</b> before start,
                <b> Live</b> between start and end, and <b>Ended</b> after end.
              </p>
            </div>
            <button className="admin-btn primary-btn" onClick={startNew}>
              ＋ Add tournament
            </button>
          </div>

          <div className="panel">
            <div className="case-row">
              <div className="row-main">
                <b>AUTOMATIC STATUS</b>
                <span>
                  🟢 Upcoming {counts.upcoming} · 🔴 Live {counts.live} · 🏁 Ended {counts.finished} · 📝 Draft {counts.draft} · ⛔ Cancelled {counts.cancelled}
                </span>
              </div>
            </div>
          </div>

          {notice && (
            <div className="panel">
              <div className="empty good">✓ {notice}</div>
            </div>
          )}

          {error && (
            <div className="panel">
              <div className="empty bad">{error}</div>
            </div>
          )}

          {loading ? (
            <div className="dbase-loading">
              <div>
                <div className="loader-ring" />
                <p>Loading tournaments…</p>
              </div>
            </div>
          ) : (
            <div className="panel">
              {rows.length === 0 ? (
                <div className="empty">No tournaments configured.</div>
              ) : (
                rows.map((tournament) => {
                  const current = phaseOf(tournament, now);
                  const status = meta[current];
                  const isDeleting = deletingId === String(tournament.id);

                  return (
                    <div className="case-row" key={tournament.id}>
                      <div className="mini-avatar">{status[1]}</div>
                      <div className="row-main">
                        <b>{tournament.name}</b>
                        <span>
                          {tournament.description || "No description"} · {tournament.players_count || 0}/{tournament.max_players || 0} players
                        </span>
                        <span>
                          🗓 {formatDate(tournament.starts_at)} → {formatDate(tournament.ends_at)}
                        </span>
                      </div>
                      <div className="row-meta">
                        <b>{status[1]} {status[0]}</b>
                        <span>
                          🪙 {Number(tournament.prize_pool_coins || 0).toLocaleString()} · 💎 {Number(tournament.prize_pool_gems || 0).toLocaleString()}
                        </span>
                      </div>
                      <button
                        className="admin-btn"
                        disabled={isDeleting}
                        onClick={() =>
                          setEdit({
                            ...tournament,
                            startsAtLocal: localDateTime(tournament.starts_at),
                            endsAtLocal: localDateTime(tournament.ends_at),
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="admin-btn"
                        disabled={isDeleting}
                        onClick={() => void removeTournament(tournament)}
                      >
                        {isDeleting ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {edit && (
            <div className="editor-card">
              <div className="editor-head">
                <b>{edit.id ? "Edit tournament" : "Add tournament"}</b>
                <button className="admin-btn" onClick={() => setEdit(null)}>✕</button>
              </div>

              <div className="empty">
                <b>Automatic phase:</b> {meta[phaseOf(edit, now)][1]} {meta[phaseOf(edit, now)][0]}
                <br />
                <small>
                  Set the Start and End date/time. Ludo Live automatically moves the tournament through Upcoming → Live → Ended.
                </small>
              </div>

              <Field label="Tournament name" value={edit.name} onChange={(value) => setEdit({ ...edit, name: value })} />
              <Field label="Description" value={edit.description} onChange={(value) => setEdit({ ...edit, description: value })} />

              <div className="form-grid">
                <Field label="Entry coins" type="number" value={edit.entry_fee_coins} onChange={(value) => setEdit({ ...edit, entry_fee_coins: Number(value) })} />
                <Field label="Entry gems" type="number" value={edit.entry_fee_gems} onChange={(value) => setEdit({ ...edit, entry_fee_gems: Number(value) })} />
                <Field label="Prize pool coins" type="number" value={edit.prize_pool_coins} onChange={(value) => setEdit({ ...edit, prize_pool_coins: Number(value) })} />
                <Field label="Prize pool gems" type="number" value={edit.prize_pool_gems} onChange={(value) => setEdit({ ...edit, prize_pool_gems: Number(value) })} />
                <Field label="Maximum players" type="number" value={edit.max_players} onChange={(value) => setEdit({ ...edit, max_players: Number(value) })} />
                <Field label="Participation coins" type="number" value={edit.participation_reward_coins} onChange={(value) => setEdit({ ...edit, participation_reward_coins: Number(value) })} />
                <Field label="Prize multiplier" type="number" value={edit.prize_multiplier} onChange={(value) => setEdit({ ...edit, prize_multiplier: Number(value) })} />
                <Field label="Start date & time" type="datetime-local" value={edit.startsAtLocal} onChange={(value) => setEdit({ ...edit, startsAtLocal: value })} />
                <Field label="End date & time" type="datetime-local" value={edit.endsAtLocal} onChange={(value) => setEdit({ ...edit, endsAtLocal: value })} />
              </div>

              <div className="empty">
                Schedule: <b>{formatDate(edit.startsAtLocal)}</b> → <b>{formatDate(edit.endsAtLocal)}</b>
              </div>

              <button className="admin-btn primary-btn full" onClick={save}>
                Save tournament
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
