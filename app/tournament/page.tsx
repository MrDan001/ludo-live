"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import AppFrame from "../_components/AppFrame";

type Tournament = {
  id: string;
  name: string;
  description: string;
  status: string;
  entry_fee_coins: number;
  entry_fee_gems: number;
  prize_pool_coins: number;
  prize_pool_gems: number;
  max_players: number;
  players_count: number;
  starts_at: string;
  ends_at: string;
  prizes: any[];
  rules: any;
  joined: number;
};

type Match = {
  id: number;
  tournament_id: string;
  round_no: number;
  match_no: number;
  room_code: string;
  status: string;
  player_ids: string[];
  winner_id?: string | null;
};

const money = (value: number) => Number(value || 0).toLocaleString();

function timeLeft(ms: number) {
  if (ms <= 0) return "Ended";
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`;
}

export default function TournamentPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tab, setTab] = useState<"all" | "mine" | "finished">("all");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    try {
      const response = await fetch("/api/tournaments", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load tournaments.");
      setTournaments(data.tournaments || []);
      setMine(data.mine || []);
      setMatches(data.matches || []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load tournaments.");
    }
  };

  useEffect(() => {
    void load();
    const refresh = window.setInterval(() => void load(), 8000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, []);

  const visible = useMemo(() => {
    if (tab === "mine") {
      return tournaments.filter(
        (t) => Boolean(t.joined) || mine.some((m) => m.tournament_id === t.id),
      );
    }
    if (tab === "finished") {
      return tournaments.filter((t) => t.status === "finished");
    }
    return tournaments.filter((t) => t.status !== "finished");
  }, [tab, tournaments, mine]);

  const join = async (tournament: Tournament) => {
    setBusy(tournament.id);
    setNotice("");
    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", tournamentId: tournament.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to join tournament.");

      await load();
      setNotice(`Joined ${tournament.name}. Your bracket match is ready.`);

      if (data.roomCode && data.match?.id) {
        window.location.href = `/game?room=${encodeURIComponent(data.roomCode)}&tournament=${encodeURIComponent(tournament.id)}&match=${data.match.id}&size=4`;
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to join tournament.");
    } finally {
      setBusy("");
    }
  };

  const continueMatch = (match: Match) => {
    const tournament = tournaments.find((item) => item.id === match.tournament_id);
    const maxPlayers = Number(tournament?.max_players || 4);
    let rounds = 0;
    let players = Math.max(2, maxPlayers);
    while (players > 1) {
      players = Math.ceil(players / 4);
      rounds += 1;
    }
    const finalRound = Math.max(1, rounds);
    const size = match.round_no === finalRound ? 2 : 4;
    window.location.href = `/game?room=${encodeURIComponent(match.room_code)}&tournament=${encodeURIComponent(match.tournament_id)}&match=${match.id}&size=${size}`;
  };

  return (
    <AppFrame back="/home">
      <main style={styles.page}>
        <header style={styles.header}>
          <button type="button" onClick={() => window.history.back()} style={styles.back} aria-label="Back">
            ←
          </button>
          <div>
            <div style={styles.eyebrow}>LUDO LIVE • COMPETITIVE</div>
            <strong style={styles.headerTitle}>Tournament</strong>
          </div>
          <button
            type="button"
            style={styles.info}
            onClick={() =>
              setNotice(
                "Join a tournament, pay the entry fee, play your bracket matches, advance through the rounds and receive the configured prize automatically when the final is won.",
              )
            }
            aria-label="Tournament information"
          >
            ⓘ
          </button>
        </header>

        {matches
          .filter((match) => match.status !== "finished")
          .map((match) => {
            const tournament = tournaments.find((item) => item.id === match.tournament_id);
            return (
              <section key={match.id} style={styles.matchCard}>
                <div>
                  <small style={styles.small}>YOUR ACTIVE MATCH • ROUND {match.round_no}</small>
                  <h2 style={styles.matchTitle}>{tournament?.name || "Tournament"}</h2>
                  <p style={styles.muted}>
                    {match.status === "ready"
                      ? "Match is ready — enter the room with your bracket opponents."
                      : `Waiting for opponents • ${match.player_ids?.length || 0}/4 players`}
                  </p>
                </div>
                <button type="button" style={styles.joinButton} onClick={() => continueMatch(match)}>
                  {match.status === "ready" ? "ENTER MATCH" : "VIEW MATCH"} →
                </button>
              </section>
            );
          })}

        <section style={styles.hero}>
          <div style={styles.heroArt}>
            <span>🎲</span>
            <span>🏆</span>
            <span>🪙</span>
            <span>💎</span>
          </div>
          <div style={styles.heroTitle}>TOURNAMENTS</div>
          <div style={styles.heroSubtitle}>Compete. Advance. Win the promised prize.</div>
        </section>

        <nav style={styles.tabs} aria-label="Tournament views">
          {(
            [
              ["all", "🏆 All Tournaments"],
              ["mine", "🎯 My Tournaments"],
              ["finished", "🏅 Results"],
            ] as const
          ).map(([id, label]) => (
            <button
              type="button"
              key={id}
              onClick={() => setTab(id)}
              style={{ ...styles.tabButton, ...(tab === id ? styles.tabActive : {}) }}
            >
              {label}
            </button>
          ))}
        </nav>

        <section style={styles.programme}>
          <strong>HOW IT WORKS</strong>
          <span>1. Join & pay entry fee</span>
          <span>2. Four-player knockout rounds</span>
          <span>3. Winners advance automatically</span>
          <span>4. Final winner receives the configured prize</span>
        </section>

        {visible.map((tournament) => {
          const start = new Date(tournament.starts_at).getTime();
          const end = new Date(tournament.ends_at).getTime();
          const full = Number(tournament.players_count) >= Number(tournament.max_players);
          const joined = Boolean(tournament.joined);
          const entry = [
            tournament.entry_fee_coins > 0 ? `🪙 ${money(tournament.entry_fee_coins)}` : "",
            tournament.entry_fee_gems > 0 ? `💎 ${money(tournament.entry_fee_gems)}` : "",
          ]
            .filter(Boolean)
            .join(" + ") || "FREE";

          return (
            <article key={tournament.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div>
                  <div style={styles.status}>
                    {tournament.status === "live"
                      ? "🔴 LIVE"
                      : tournament.status === "finished"
                        ? "🏁 FINISHED"
                        : "🟢 OPEN"}
                  </div>
                  <h2 style={styles.cardTitle}>{tournament.name}</h2>
                </div>
                <div style={styles.count}>
                  {money(tournament.players_count)} / {money(tournament.max_players)}
                  <small style={styles.countLabel}>players</small>
                </div>
              </div>

              <p style={styles.description}>{tournament.description}</p>

              <div style={styles.prizeBox}>
                <div>
                  <small style={styles.small}>PRIZE POOL</small>
                  <strong>🪙 {money(tournament.prize_pool_coins)}</strong>
                  {tournament.prize_pool_gems > 0 && (
                    <strong>💎 {money(tournament.prize_pool_gems)}</strong>
                  )}
                </div>
                <div>
                  <small style={styles.small}>ENTRY</small>
                  <strong>{entry}</strong>
                </div>
              </div>

              <div style={styles.meta}>
                <span>
                  ⏱ {start > now ? `Starts in ${timeLeft(start - now)}` : `Ends in ${timeLeft(end - now)}`}
                </span>
                <span>🎲 4-player matches</span>
                <span>🏆 Top 3 prizes</span>
              </div>

              <button
                type="button"
                style={{
                  ...styles.joinButton,
                  opacity: joined || full || tournament.status !== "open" || Boolean(busy) ? 0.65 : 1,
                }}
                disabled={joined || full || tournament.status !== "open" || Boolean(busy)}
                onClick={() => void join(tournament)}
              >
                {joined
                  ? "✓ ENTERED"
                  : full
                    ? "TOURNAMENT FULL"
                    : busy === tournament.id
                      ? "JOINING…"
                      : "JOIN TOURNAMENT"}
              </button>
            </article>
          );
        })}

        {!visible.length && <section style={styles.empty}>No tournaments in this view.</section>}
        {notice && <div style={styles.notice}>{notice}</div>}
      </main>
    </AppFrame>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { maxWidth: 680, margin: "0 auto", paddingBottom: 50 },
  header: { height: 66, display: "grid", gridTemplateColumns: "44px 1fr 44px", alignItems: "center" },
  back: { border: 0, background: "transparent", color: "#fff", fontSize: 30, textAlign: "left" },
  info: { border: 0, background: "transparent", color: "#dbe7f6", fontSize: 21 },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: "#65adff", fontWeight: 950 },
  headerTitle: { fontSize: 20 },
  hero: { borderRadius: 18, padding: "18px 12px", textAlign: "center", background: "radial-gradient(circle at 50% 0%,#6a2be0,#2a115e 58%,#0b1737)", border: "1px solid #7545df", boxShadow: "0 0 35px #6d28d955", marginBottom: 10 },
  heroArt: { display: "flex", justifyContent: "center", gap: 28, fontSize: 30 },
  heroTitle: { fontSize: 25, fontWeight: 950, color: "#ffe45b", letterSpacing: 2, marginTop: 6 },
  heroSubtitle: { color: "#dbe7ff", fontSize: 12, marginTop: 4 },
  tabs: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, margin: "10px 0" },
  tabButton: { border: "1px solid #1f4274", background: "#071a35", color: "#a9c2e4", padding: "10px 5px", borderRadius: 10, fontWeight: 900, fontSize: 11 },
  tabActive: { background: "linear-gradient(135deg,#1767e8,#7034ef)", color: "#fff", borderColor: "#5d9bff" },
  programme: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6, padding: 12, borderRadius: 14, background: "#07182f", border: "1px solid #1d3b62", marginBottom: 10, fontSize: 11, color: "#b9cae2" },
  matchCard: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: 14, borderRadius: 16, background: "linear-gradient(135deg,#0d2e5d,#07172f)", border: "1px solid #3e83e7", marginBottom: 10, boxShadow: "0 0 20px #1670ff33" },
  matchTitle: { margin: "4px 0", fontSize: 18 },
  card: { padding: 14, borderRadius: 17, background: "linear-gradient(145deg,#081d3c,#061329)", border: "1px solid #244a7d", marginBottom: 10, boxShadow: "0 10px 25px #0005" },
  cardTop: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" },
  status: { fontSize: 9, color: "#ffe15b", fontWeight: 950, letterSpacing: 1 },
  cardTitle: { fontSize: 19, margin: "3px 0", color: "#fff" },
  count: { fontWeight: 950, color: "#e8f1ff", textAlign: "right" },
  countLabel: { display: "block", fontSize: 9, color: "#7693b9", fontWeight: 700 },
  description: { color: "#9eb3d0", fontSize: 12, margin: "5px 0 12px", lineHeight: 1.4 },
  prizeBox: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 10, borderRadius: 11, background: "#0b2245", border: "1px solid #1c3b63" },
  small: { display: "block", fontSize: 9, color: "#7693b9", letterSpacing: 1, fontWeight: 900 },
  meta: { display: "flex", gap: 8, flexWrap: "wrap", padding: "10px 0", fontSize: 10, color: "#a9bfde" },
  joinButton: { width: "100%", border: 0, borderRadius: 11, padding: 12, background: "linear-gradient(135deg,#1e6df0,#7134ef)", color: "#fff", fontWeight: 950, fontSize: 13 },
  muted: { color: "#91a9ca", fontSize: 12 },
  empty: { padding: 30, textAlign: "center", color: "#7891b5" },
  notice: { marginTop: 10, padding: 12, borderRadius: 12, background: "#0a2d1c", border: "1px solid #2f9e63", color: "#93f2b2", fontSize: 12, textAlign: "center" },
};
