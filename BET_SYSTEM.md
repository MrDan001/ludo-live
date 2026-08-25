# Multiplayer Coin Bet System

## Purpose

The multiplayer room supports a virtual-coin stake for the existing 2-player and 4-player multiplayer modes. This is **game currency only**. It has no real-money cash-out or payment flow.

## Limits

- Minimum stake: **500 coins per player**.
- Maximum stake: **10,000 coins per player**.
- **Stake is agreed inside the room, not during room creation.**
- Players first negotiate the amount through the existing room voice/chat.
- The host then enters the agreed amount in the room and broadcasts it as the authoritative stake.
- Every player must confirm the agreed stake before the match can start.
- The winner receives the complete pot: `stake × number of players`.

Examples:

- 2 players × 500 = 1,000 coin pot.
- 2 players × 10,000 = 20,000 coin pot.
- 4 players × 500 = 2,000 coin pot.
- 4 players × 10,000 = 40,000 coin pot.

## Architecture

The existing multiplayer room/game implementation remains authoritative for room membership, readiness, host ownership, dice, movement and winner detection. Betting is layered around that lifecycle through `bet-system.js`, which is preloaded by the production Node start command.

`package.json` starts the server with:

`node -r ./empty-room-cleanup.js -r ./bet-system.js -r ./multiplayer-canonical.js -r ./mission-rules.js -r ./forfeit-rules.js -r ./event-settler.js server.js`

Betting does **not** replace or duplicate the Ludo rules. The existing multiplayer server determines the winner first; the bet layer manages agreement/confirmation, locks coins atomically before the match and settles the pot after the authoritative winner state is emitted.

## Room betting flow

1. Host creates a 2-player or 4-player room **without selecting a stake**.
2. Players join the room.
3. Players discuss and agree on the stake using the existing room voice/chat.
4. Host enters the agreed amount in the **Stake agreement** panel.
5. Server validates that the amount is 500–10,000 and broadcasts `bet-agreed` / `bet-room-state`.
6. Every player, including the host, clicks **Stake & Confirm**.
7. Server tracks those confirmations in `stakedPlayers` and reports `allStaked` only when every room seat has confirmed.
8. Players use the existing Ready control.
9. Host can start only when the room is full, every player is connected and Ready, and every player has confirmed the agreed stake.
10. At start, the server checks every player's balance and locks all wallet rows with `FOR UPDATE` in one PostgreSQL transaction.
11. The stake is deducted from every player and recorded in `ludo_match_bets` / `ludo_match_bet_players`.
12. The existing Ludo match starts.
13. The existing multiplayer game reaches `status: 'finished'` with an authoritative `winnerId`.
14. The bet layer settles that exact winner and credits the complete pot in one transaction.

The important distinction is that the UI **confirmation** happens in the room after agreement, while the actual coin deduction is performed atomically at match start. This prevents partial wallet deductions if one player confirms but another never does or cannot afford the stake.

## Stake changes

- Before any player confirms, the host may set/change the agreed amount.
- Setting a new amount clears previous stake confirmations because those confirmations were for a different amount.
- Once any player has confirmed, the host cannot change the stake.
- Once the bet is locked, the stake cannot change.
- Clients cannot bypass the 500–10,000 validation.

## Canonical winner wiring

Settlement is intentionally **not** inferred from client movement events or token positions.

The existing multiplayer server emits:

`game-state { status: 'finished', winnerId: '<player id>' }`

when its canonical game rules determine that a player has won. `bet-system.js` intercepts the server-side room broadcast of that event and calls `settleBet(room, winnerId)`.

## Database

`bet-system.js` creates:

### `ludo_match_bets`

One escrow record per match, containing room code, 2/4 player mode, stake, pot, status, winner and timestamps.

### `ludo_match_bet_players`

The players whose wallets funded the locked pot and their individual stake.

## Atomic wallet handling

At match start, PostgreSQL row locks are acquired for every participating wallet before any deduction. If any player has insufficient coins, the entire transaction rolls back and no player's balance changes.

Settlement locks the bet record and winner wallet row. The bet status is checked before crediting the winner, so duplicate settlement attempts cannot pay the pot twice.

## Client/server events

### `bet-room-state`

Authoritative room state: agreed stake (or zero before agreement), limits, pot, lock status, status, number of confirmed stakers and `allStaked`.

### `bet-agreed`

Broadcast when the host successfully sets the agreed stake.

### `stake-confirmed`

Sent to the player whose stake confirmation was accepted.

### `stake-error`

Sent when stake confirmation is rejected because no agreement exists, the match is locked, or another server-side condition fails.

### `bet-settled`

Broadcast after successful settlement with winner ID, stake, room size and total pot.

The client only displays these values. It never deducts or awards coins.

## Empty rooms

If the last member leaves before the match starts, the room's betting state is discarded and the server room registry is removed by the empty-room cleanup path. No stake is locked and the old room code cannot resurrect the abandoned room.

## Failure behaviour

- Invalid stake is rejected.
- A player cannot confirm before the host sets an agreed stake.
- A player without enough coins prevents the final atomic lock from succeeding.
- No coins are deducted merely because someone clicked **Stake & Confirm**.
- Duplicate lock/settlement attempts are guarded by room/bet status and database transactions.
- If settlement fails, the bet remains `locked` rather than silently losing the pot; it must be reconciled from the recorded bet.
- Existing multiplayer host/forfeit behaviour remains outside the betting layer unless an explicit refund/forfeit rule is added.

## Files wired

- `bet-system.js` — server-side stake agreement, confirmations, atomic escrow lock, canonical winner settlement and Socket.IO bet events.
- `app/room/page.tsx` — room creation/joining only; no stake collection.
- `app/_components/LiveSocial.tsx` — in-room agreement panel, stake confirmation, chat/voice negotiation, readiness and start controls.
- `app/lobby/page.tsx` — room discovery only; no stake selection.
- `empty-room-cleanup.js` — empty room deletion.
- `MULTIPLAYER_LOBBY.md` — lobby/room contract and developer flow.

## Developer safety rules

1. Do not put stake selection back on Create Game or Join Game.
2. Do not move final coin deduction or winnings into React/client code.
3. Do not trust a client-provided winner.
4. Do not settle from `game-moved`; settlement must follow the canonical finished game state.
5. Do not bypass the PostgreSQL transaction boundary.
6. Preserve the existing Ludo movement/rule engine when changing betting.
7. Do not remove empty-room cleanup.
8. If stake rules, refunds, forfeits or administrative bet controls change, update this document and `MULTIPLAYER_LOBBY.md` together.
