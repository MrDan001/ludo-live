# Ludo Live — Prestige System

## Purpose

Prestige is a long-term reputation layer above normal level progression. It does not replace, reset, or cap the player's level.

## Canonical calculation

Prestige is derived from the authoritative current level:

`prestige = floor((level - 1) / 100)`

The player's position inside the current prestige cycle is:

`prestigeLevel = ((level - 1) % 100) + 1`

Examples:

| Level | Prestige | Prestige Level |
|---:|---:|---:|
| 1 | 0 | 1 |
| 99 | 0 | 99 |
| 100 | 0 | 100 |
| 101 | 1 | 1 |
| 137 | 1 | 37 |
| 199 | 1 | 99 |
| 200 | 1 | 100 |
| 201 | 2 | 1 |
| 1001 | 10 | 1 |

## Important boundary rule

Prestige increases **after completing each 100-level cycle**. Therefore Level 100 is the final level of Prestige 0, Level 101 starts Prestige 1, and Level 201 starts Prestige 2.

This avoids a discontinuity where the player would appear to have completed Prestige 1 before actually completing the first 100-level cycle.

## Authority

Prestige must never be submitted by the client. The server derives it from the canonical level returned from PostgreSQL. It is presentation/reputation state, not a wallet currency and not a gameplay advantage.

## UI

Player Showcase/Profile may display both:

- `Level N`
- `Prestige P`

The player's actual Level never resets when Prestige changes.

## Scalability

There is no maximum Prestige. Because Prestige is calculated from Level mathematically, Level 10,000 and beyond continue to work without adding another hard-coded table.

## Developer rule

Do not persist a client-provided prestige value. If a persisted prestige field exists for compatibility, it must be treated as derived/cache data and reconciled from the authoritative level before display.
