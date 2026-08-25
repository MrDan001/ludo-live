# Ludo Live — Scalable Level Progression

## Contract

Player progression starts at **Level 1** and has **no hard-coded maximum level**.

The server is authoritative. XP is awarded through `POST /api/progress`, and level rewards are calculated by `lib/levelRewards.ts`.

## XP formula

The XP required to move from Level `N` to Level `N + 1` is:

`10 + (N × 5)`

Examples:

- Level 1 → 2: 15 XP
- Level 10 → 11: 60 XP
- Level 20 → 21: 110 XP
- Level 100 → 101: 510 XP

Because the formula is calculated from the current level, it continues indefinitely.

## Reward formula

Every level grants coins:

`250 + ((level - 1) × 50)`

Every fifth level grants gems.

Every tenth level is a milestone and receives a generated badge ID (`level-N`) plus a real catalogue unlock.

Milestone cosmetics reuse the authoritative `MILESTONE_UNLOCKS` catalogue cyclically after the initial catalogue entries are exhausted. This means Level 110, 120, 130, and beyond remain valid milestones without adding another hard-coded level table.

Already-owned cosmetics receive their configured gem compensation and the reward ledger remains idempotent on `(user_id, level)`.

## Player Showcase journey

The Showcase does not attempt to render an infinite road.

It renders a **10-level moving segment**:

- Levels 1–10 while the player is in the first segment.
- Levels 11–20 while the player is in the second segment.
- Levels 21–30 while the player is in the third segment.
- And so on indefinitely.

The current level receives the 📍 marker and `CURRENT LEVEL` label. The current row also shows the exact XP in the level, the required XP, a progress bar, and the XP remaining to the next level.

The separate `YOU ARE HERE` text and explanatory road paragraph are intentionally not used.

## Next milestone

The API uses the canonical `getNextMilestone(level)` helper. For example:

- Level 1–9 → next milestone Level 10
- Level 10–19 → next milestone Level 20
- Level 20–29 → next milestone Level 30
- Level 100–109 → next milestone Level 110

There is no Level 100 stop.

## Design rule

Do not create future milestone tables such as `10–100` as the source of truth. The formula and reusable catalogue are authoritative. A new milestone reward should be added to the catalogue list, not by introducing a maximum level.
