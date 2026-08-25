# Multiplayer Coin Bet System

## Purpose

The multiplayer lobby now supports a virtual-coin stake for the existing 2-player and 4-player multiplayer modes. This is **game currency only**. It has no real-money cash-out or payment flow.

## Limits

- Minimum stake: **500 coins per player**.
- Maximum stake: **10,000 coins per player**.
- The room host chooses the stake when creating the room.
- A joining player cannot change the room stake.
- Every player in a match uses the same stake.
- The winner receives the complete pot: `stake × number of players`.

Examples:

- 2 players × 500 = 1,000 coin pot.
- 2 players × 10,000 = 20,000 coin pot.
- 4 players × 500 = 2,000 coin pot.
- 4 players × 10,000 = 40,000 coin pot.

## Architecture

The existing multiplayer room/game implementation remains authoritative for room membership, readiness, host ownership, dice, movement and winner detection. Betting is layered around that lifecycle through `bet-system.js`, which is preloaded by the production Node start command.

`package.json` starts the server with:

`node -r ./bet-system.js -r ./multiplayer-canonical.js -r ./mission-rules.js -r ./forfeit-rules.js -r ./event-settler.js server.js`

This keeps betting isolated from the existing `server.js` game rules instead of duplicating or rewriting the Ludo engine.

## Lobby flow

1. Host opens Create Game.
2. Host chooses 2 or 4 players.
3. Host chooses a stake from 500–10,000 coins.
4. The room appears in the public multiplayer lobby with its stake and calculated pot.
5. Players join the room.
6. The server broadcasts the authoritative stake to every room client.
7. Players ready up as before.
8. When the host starts, the bet system verifies every active player has enough coins.
9. All player coin rows are locked in one database transaction.
10. The stake is deducted from every player and recorded in the bet tables.
11. The existing Ludo match starts.
12. When the authoritative game reaches a winner, the bet system credits the entire pot to that winner in one transaction.

## Database

`bet-system.js` creates these tables when production starts:

### `ludo_match_bets`

Stores one escrow/bet record per room/match:

- `room_code` — unique match identifier.
- `mode_players` — 2 or 4.
- `stake_per_player` — 500–10,000.
- `pot` — total coins locked for the match.
- `status` — `locked`, `settled`, `refunded` or `cancelled`.
- `winner_id` — winning player after settlement.
- timestamps for creation/settlement.

### `ludo_match_bet_players`

Stores which users funded each bet and their individual stake.

## Atomic wallet handling

Bet locking uses PostgreSQL transactions and `FOR UPDATE` row locks on every player wallet before deduction. A match cannot partially lock the pot: either every required player has enough coins and all deductions/records commit, or the transaction rolls back.

Settlement also locks the bet record and winner wallet row. The bet status is checked before crediting the winner, so a duplicate settlement request cannot pay the pot twice.

## Client/server events

### `bet-room-state`

Broadcast to the room with the current authoritative stake, limits, pot, lock state and status.

### `bet-settled`

Broadcast after successful settlement with the winner ID, stake and total pot.

The client only displays these values. It never decides how many coins to deduct or award.

## Important implementation rule

Do not move coin deduction or winnings into React/client code. Do not trust a client-provided winner. The database transaction in `bet-system.js` is the financial authority, while the existing multiplayer server remains the gameplay authority.

## Failure behaviour

- Invalid stake is rejected.
- A player without enough coins prevents the match from starting.
- A room that has not started has no coins deducted.
- Duplicate lock/settlement attempts are guarded by the bet status and database transaction.
- If settlement fails, the bet remains locked rather than silently losing the pot; it must be reconciled from the recorded bet.

## Files wired

- `bet-system.js` — server-side escrow, wallet locking, settlement and Socket.IO bet events.
- `app/room/page.tsx` — host stake selection and 500–10,000 validation.
- `app/_components/LiveSocial.tsx` — displays authoritative stake/pot and sends the selected stake with room join.
- `app/lobby/page.tsx` — displays stake and calculated pot for public rooms.
- `package.json` — preloads `bet-system.js` in the production start command.
- `MULTIPLAYER_LOBBY.md` — lobby behaviour and betting contract.

## Future changes

If stake rules, refunds, forfeits or administrative bet controls are changed, update this document and the relevant multiplayer documentation together. Keep the wallet transaction boundary server-side and preserve the existing Ludo movement/rule engine.
