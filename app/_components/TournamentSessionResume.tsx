"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Reconnects a player to an unfinished tournament match after a hard refresh.
 * The tournament API remains authoritative; this component only restores the
 * navigation context when the server says the player still has a live match.
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
        const matches = Array.isArray(data?.matches) ? data.matches : [];
        const active = matches.find(
          (match: any) => match && match.status !== "finished" && match.room_code && match.tournament_id && match.id,
        );
        if (!active || cancelled) return;

        const current = new URL(window.location.href);
        // Don't redirect if the browser is already carrying this match context.
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
        const size = active.round_no === Math.max(1, rounds) ? 2 : 4;
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
