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

## Title

`Tournament Champion` requires at least one actual gold tournament badge.

The remaining title ladder continues to use the existing level/win thresholds.

## Prestige

Current Showcase prestige is:

`level * 25 + wins * 5 + tournamentWins * 100 + claimedLevelMilestones * 20`

Because `tournamentWins` now means actual 1st-place championships, tournament prestige cannot be inflated by Top-10 finishes.

## Design rule

The Showcase is intended to communicate genuine player strength and accomplishment. Do not replace these counters with client-derived totals, raw event counts, or cosmetic ownership counts. Any future reputation change must update this document, `ARCHITECTURE.md`, and `DEVELOPER_HANDOFF.md` together.
