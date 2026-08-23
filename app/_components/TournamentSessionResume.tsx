"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Reconnects a player to an unfinished tournament match after a hard refresh.
 * When more than one tournament match is active, the dashboard must not guess
 * which board to resume. The player chooses the exact match, preserving
 * tournament/match isolation.
 */
export default function TournamentSessionResume() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/tournament") return;

    let cancelled = false;
    const restore = async () => {
      try {
        const response = await fetch("/api/tournaments", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const matches = (Array.isArray(data?.matches) ? data.matches : []).filter(
          (match: any) => match && match.status !== "finished" && match.room_code && match.tournament_id && match.id,
        );
        if (cancelled || matches.length !== 1) return;

        const active = matches[0];
        const current = new URL(window.location.href);
        if (
          current.searchParams.get("tournament") === String(active.tournament_id) &&
          current.searchParams.get("match") === String(active.id)
        ) return;

        const tournaments = Array.isArray(data?.tournaments) ? data.tournaments : [];
        const tournament = tournaments.find((item: any) => String(item?.id) === String(active.tournament_id));
        const maxPlayers = Number(tournament?.max_players || 4);
        let players = Math.max(2, maxPlayers);
        let rounds = 0;
        while (players > 1) {
          players = Math.ceil(players / 4);
          rounds += 1;
        }
        const size = Number(active.round_no) === Math.max(1, rounds) ? 2 : 4;
        window.location.replace(
          `/game?room=${encodeURIComponent(active.room_code)}&tournament=${encodeURIComponent(active.tournament_id)}&match=${encodeURIComponent(active.id)}&size=${size}`,
        );
      } catch {
        // A failed resume check must never prevent the tournament page from rendering.
      }
    };

    void restore();
    return () => { cancelled = true; };
  }, [pathname]);

  return null;
}
