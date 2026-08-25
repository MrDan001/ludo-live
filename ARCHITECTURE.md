# Ludo Live — Architecture & Product Contract

## Purpose

This is the production technical map. Read it before changing gameplay, board rendering, authentication, customization, XP/levels, Shop, Inventory, Award Room, admin, finance, tournaments, free spins, voice, events, or deployment. **Do not infer product rules from screenshots or previous conversations.** If a rule changes, update this document and `DEVELOPER_HANDOFF.md` in the same change.

## Runtime / source of truth

- Next.js 14 / React 18 / TypeScript 5.6.
- PostgreSQL through `pg` is the persistent source of truth.
- Socket.IO in `server.js` owns live multiplayer room state.
- `main` is the production GitHub branch connected to Railway.
- A release is **not live** until Railway reports `SUCCESS`.
- Authenticated server APIs derive identity from the `ludo_session` cookie. Never trust a client-supplied user id for privileged operations.
- `localStorage` may support UX restoration, but it is not authoritative over server-backed account, wallet, customization, tournament, progression, or event state.

## Player Showcase / reputation identity

- `/player/<username>` is the canonical public player inspection route.
- `app/api/player/[username]/route.ts` is the authoritative server calculation for Showcase stats/title/prestige.
- **Games** = completed records in `ludo_match_history` for that player. Wins and losses are counted from those records.
- **Wins** = `ludo_match_history` rows whose result is `win`.
- **Tournament Wins** = `ludo_tournament_badges` rows with `badge_type='gold'`. Gold is awarded only to tournament position 1 during settlement. A Top-10 finish is not a Tournament Win.
- Tournament settlement may still mark the eligible Top-10 group as `ludo_tournament_entries.status='winner'` because that status represents tournament prize eligibility. Showcase `Tournament Wins` must not use that status as a championship count.
- **Achievements** = unique earned achievement/badge unlocks, not raw event counts. The Showcase count is: claimed level milestone rewards + reached win-achievement thresholds (1, 10, 25, 50, 100, 250, 500 wins, each counted once) + earned tournament badges (participation, Top-10, gold, silver or bronze, each stored uniquely).
- Individual match wins are therefore shown in **Wins** and do not add one achievement per win.
- Mission achievement history remains a separate reward-history surface and is not used to inflate the Showcase achievement count.
- The title `Tournament Champion` is based on at least one gold tournament badge, so it cannot be granted merely for a Top-10 finish.
- Prestige uses the corrected championship count: `level * 25 + wins * 5 + tournamentWins * 100 + claimedLevelMilestones * 20`.
- `PlayerIdentityLink` is the shared navigation contract from player names/avatars to the Showcase.
- The Showcase exposes public progression, title, prestige, achievements, loadout and the single next milestone, but not private wallet, email, password or session data.

## Multiplayer identity

Waiting-room names and avatars use authoritative player profile data and preserve resolved cosmetic state across Socket.IO updates. A stale/default socket avatar must not overwrite an equipped profile avatar.

## Level rewards

Progression and milestone rewards are server-authoritative and idempotent by `(user_id, level)`. Already-owned milestone cosmetics convert to configured gem compensation rather than duplicate ownership.

## Tournament

Tournament settlement creates authoritative badges in `ludo_tournament_badges`:

- `participation` — every participant.
- `top10` — each eligible Top-10 finisher.
- `gold` — 1st place only.
- `silver` — 2nd place only.
- `bronze` — 3rd place only.

Do not calculate championship statistics from the broad `winner` entry status; use the gold badge. The gold badge is idempotent per tournament/player and is the canonical evidence of an actual tournament championship.

## Deployment discipline

After production changes, build/inspect the affected route and Railway deployment. Do not call the release live until Railway reports `SUCCESS`.

## Full feature contracts

The remaining gameplay, multiplayer, event, Shop, admin, finance, spin and UI contracts continue in the existing sections/history of this document and must remain intact unless the user explicitly requests a change.
