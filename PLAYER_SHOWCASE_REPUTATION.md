# Player Showcase Reputation & Statistics

## Source of truth

`app/api/player/[username]/route.ts` is the single server-authoritative calculation used by the Player Showcase.

## Showcase counters

### Games

`Games` is the total number of completed rows in `ludo_match_history` for the player.

### Wins

`Wins` is the number of `ludo_match_history` rows where `result='win'`.

Therefore, for normal completed match history:

`Games = Wins + Losses`

The history table's unique `(user_id, match_key)` constraint prevents the same recorded match from being counted twice.

### Tournament Wins

`Tournament Wins` is **not** calculated from `ludo_tournament_entries.status='winner'`.

Tournament settlement uses these authoritative badges:

- `participation` — entered/participated.
- `top10` — finished in the eligible Top 10.
- `gold` — **1st place**.
- `silver` — 2nd place.
- `bronze` — 3rd place.

The Showcase counts only `badge_type='gold'` as a Tournament Win. This means a Top-10 finisher is not incorrectly presented as a tournament champion.

The tournament-entry `winner` status may continue to represent the prize-eligible Top-10 group for tournament settlement/business logic; it is not the Showcase championship metric.

### Achievements

The Showcase `Achievements` number represents **unique earned achievements/badges**, not raw activity totals.

It is calculated as:

`claimed level milestone rewards`
`+ reached win-achievement thresholds`
`+ earned tournament badges`

Win thresholds are:

`1, 10, 25, 50, 100, 250, 500`

Each threshold contributes at most one achievement. For example, a player with 100 wins has unlocked all seven win achievements, not 100 achievements.

Tournament badges are stored uniquely per tournament/player/type, so one badge cannot be counted twice.

Mission achievement/reward history remains a separate history surface and is not added to this Showcase number simply because a player claimed a mission reward.

## Hierarchy

Hierarchy is **independent of Level and Prestige**. It measures verified active app/game time from `ludo_spin_state.total_active_seconds` plus the current accumulated active interval.

The hierarchy ladder is:

| Verified active time | Hierarchy |
|---:|---|
| 0–<1 hour | On Your Way |
| 1 hour | Rookie |
| 3 hours | Dabbler |
| 10 hours | Hobbyist |
| 20 hours | Enthusiast |
| 40 hours | Devotee |
| 60 hours | Fanatic |
| 100 hours | Expert |
| 300 hours | Prodigy |
| 500 hours | Champion |
| 750 hours | Mastermind |
| 1,000 hours | Legend |
| 1,500 hours | Grandmaster |
| 2,000 hours | Immortal |

Hierarchy is selected by the highest threshold reached. It does not reset when Prestige increases and does not depend on wins, tournament wins, cosmetic ownership, or level.

## Level and Prestige

**Level** is the XP progression system and is scalable beyond Level 10.

**Prestige is separate from hierarchy.** The current Prestige cycle is one Prestige for every 100 completed levels:

`Prestige = floor((Level - 1) / 100)`

Therefore:

- Levels 1–100 → Prestige 0
- Levels 101–200 → Prestige 1
- Levels 201–300 → Prestige 2
- and so on indefinitely.

A player can therefore be, for example, `Legend · Level 103 · Prestige 1` without the three systems being conflated.

## Active-time rewards

The same server-authoritative active-time tracker powers engagement rewards:

- Every completed 30 minutes of active time → **1 free spin + 5 XP**.
- During **17:00–20:00 Africa/Lagos time** → **3 free spins + 15 XP** per completed 30-minute interval.
- The server caps heartbeat elapsed time and only counts visible active app time; the client cannot directly award spins or XP.
- Unused free spins persist until consumed.

## Design rule

The Showcase is intended to communicate genuine player progression and accomplishment. Do not replace these counters with client-derived totals, raw event counts, or cosmetic ownership counts. Any future reputation/progression change must update this document, `ARCHITECTURE.md`, and `DEVELOPER_HANDOFF.md` together.
