# Multiplayer Coin Bet System

## Purpose

The multiplayer lobby supports a virtual-coin stake for the existing 2-player and 4-player multiplayer modes. This is **game currency only**. It has no real-money cash-out or payment flow.

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

Betting does **not** replace or duplicate the Ludo rules. The existing multiplayer server determines the winner first; the bet layer only locks coins before the match and settles the pot after the authoritative winner state is emitted.

## Lobby flow

1. Host opens Create Game.
2. Host chooses 2 or 4 players.
3. Host chooses a stake from 500–10,000 coins.
4. The room appears in the public multiplayer lobby with its stake and calculated pot.
5. Players join the room.
6. The server broadcasts the authoritative stake to every room client.
7. Players ready up as before.
8. When the host starts, the bet system verifies every active player has enough coins.
9. All player coin rows are locked in one PostgreSQL transaction.
10. The stake is deducted from every player and recorded in the bet tables.
11. The existing Ludo match starts.
12. The existing multiplayer game reaches `status: 'finished'` with an authoritative `winnerId`.
13. The bet layer settles that exact winner and credits the complete pot in one transaction.

## Canonical winner wiring

Settlement is intentionally **not** inferred from client movement events or token positions.

The existing multiplayer server emits:

`game-state { status: 'finished', winnerId: '<player id>' }`

when its canonical game rules determine that a player has won. `bet-system.js` intercepts the server-side room broadcast of that event and calls `settleBet(room, winnerId)`.

This means:

- Clients cannot choose the winner.
- A fabricated client `game-moved` event cannot award the pot.
- The existing Ludo winner calculation remains the single gameplay authority.
- Bet settlement is only possible while the corresponding escrow record is `locked`.

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

Bet locking uses a PostgreSQL transaction and `FOR UPDATE` row locks on every player wallet before deduction. A match cannot partially lock the pot: either every required player has enough coins and all deductions/records commit, or the transaction rolls back.

Settlement locks the bet record and winner wallet row. The bet status is checked before crediting the winner, so duplicate settlement attempts cannot pay the pot twice.

## Client/server events

### `bet-room-state`

Broadcast to the room with the current authoritative stake, limits, pot, lock state and status.

### `bet-settled`

Broadcast after successful settlement with the winner ID, stake, room size and total pot.

The client only displays these values. It never decides how many coins to deduct or award.

## Failure behaviour

- Invalid stake is rejected.
- A player without enough coins prevents the match from starting.
- A room that has not started has no coins deducted.
- Duplicate lock/settlement attempts are guarded by the bet status and database transaction.
- If settlement fails, the bet remains `locked` rather than silently losing the pot; it must be reconciled from the recorded bet.
- The existing multiplayer host/forfeit lifecycle remains outside the betting layer unless an explicit refund/forfeit rule is later added.

## Files wired

- `bet-system.js` — server-side escrow, wallet locking, canonical winner settlement and Socket.IO bet events.
- `app/room/page.tsx` — host stake selection and 500–10,000 validation.
- `app/_components/LiveSocial.tsx` — displays authoritative stake/pot and sends the selected stake with room join.
- `app/lobby/page.tsx` — displays stake and calculated pot for public rooms.
- `package.json` — preloads `bet-system.js` in the production start command.
- `MULTIPLAYER_LOBBY.md` — lobby behaviour and betting contract.

## Developer safety rules

1. Do not move coin deduction or winnings into React/client code.
2. Do not trust a client-provided winner.
3. Do not settle from `game-moved`; settlement must follow the canonical finished game state.
4. Do not bypass the PostgreSQL transaction boundary.
5. Preserve the existing Ludo movement/rule engine when changing betting.
6. If stake rules, refunds, forfeits or administrative bet controls change, update this document and the multiplayer documentation together.
