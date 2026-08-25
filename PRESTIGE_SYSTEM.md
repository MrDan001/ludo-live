# Ludo Live — Prestige System

## Purpose

Prestige is a long-term reputation layer above normal level progression. It does not replace, reset, or cap the player's level, and it is completely separate from the hours-based Hierarchy system.

## Canonical calculation

Prestige is derived from the authoritative current level:

`prestige = floor((level - 1) / 10)`

The player's position inside the current prestige cycle is:

`prestigeLevel = ((level - 1) % 10) + 1`

Examples:

| Level | Prestige | Prestige Level |
|---:|---:|---:|
| 1 | 0 | 1 |
| 9 | 0 | 9 |
| 10 | 0 | 10 |
| 11 | 1 | 1 |
| 17 | 1 | 7 |
| 20 | 1 | 10 |
| 21 | 2 | 1 |
| 101 | 10 | 1 |

## Important boundary rule

Prestige increases **after completing each 10-level cycle**. Therefore Level 10 is the final level of Prestige 0, Level 11 starts Prestige 1, and Level 21 starts Prestige 2.

This keeps the player's Level intact while making Prestige a visible long-term progression layer.

## Authority

Prestige must never be submitted by the client. The server derives it from the canonical level returned from PostgreSQL. It is presentation/reputation state, not a wallet currency and not a gameplay advantage.

## Relationship to Hierarchy

Prestige and Hierarchy are intentionally different:

- **Level** = XP progression.
- **Prestige** = completed 10-level progression cycles.
- **Hierarchy** = verified active game-session hours.

Hierarchy does not reset when Prestige increases, and Prestige does not depend on hours, wins, tournament wins, or cosmetic ownership.

## UI

Player Showcase/Profile may display both:

- `Level N`
- `Prestige P`

The player's actual Level never resets when Prestige changes.

## Scalability

There is no maximum Prestige. Because Prestige is calculated from Level mathematically, Level 10,000 and beyond continue to work without adding another hard-coded table.

## Developer rule

Do not persist a client-provided prestige value. If a persisted prestige field exists for compatibility, it must be treated as derived/cache data and reconciled from the authoritative level before display.
