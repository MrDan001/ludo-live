# Player Hierarchy — Active Time

## Purpose

Hierarchy is a separate player-status ladder. It is **not** Level and it is **not** Prestige.

Hierarchy measures verified active game-session time recorded by the server.

## Ladder

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

The implementation selects the highest threshold reached. The ladder can be extended with additional thresholds without changing Level or Prestige.

## Active-time source

`ludo_spin_state.total_active_seconds` is the persisted total. The current `active_seconds` interval is also included when the Player Showcase calculates the player's current hierarchy position.

Only eligible game-session surfaces count toward the clock:

- `/room`
- `/game` — **Human vs Bot** (canonical Bot-vs-Human game)
- `/game-online`
- `/tournament/game`

The document must be visible and heartbeats are server-capped. Client clocks and client-provided hour totals are never authoritative.

## Rewards tied to active time

Every completed 30 minutes:

- Normal period → **1 free spin + 5 XP**
- 17:00–20:00 Africa/Lagos Rush Hour → **3 free spins + 15 XP**

The reward endpoint is `/api/spin/activity`.

## Separation from Level and Prestige

- **Hierarchy** = verified active time.
- **Level** = XP progression, scalable beyond Level 10.
- **Prestige** = `floor((Level - 1) / 10)`.

Increasing Prestige does not reset hierarchy. Hierarchy does not reset when a player levels up or prestiges.
