# In-Room Stake System

## Purpose

The multiplayer stake is agreed **inside the room**, after players can discuss the amount through the room's voice/chat. Creating a room does not set the final stake.

## Rules

- Minimum stake: **500 coins** per player.
- Maximum stake: **10,000 coins** per player.
- The host enters the agreed amount and presses **Set agreed stake**.
- Setting the agreement does **not** deduct coins.
- Each player then confirms their own stake.
- The room displays the live `stakedPlayers / roomSize` count.
- The match cannot lock the bet/start until every required player has staked.
- When the bet is locked, `bet-system.js` performs the transactional wallet deduction.
- The winner receives the full pot after the match finishes.

## Event flow

```text
Room join/reconnect
  -> server room is established
  -> bet projection is rehydrated
  -> bet-room-state is emitted

Host: Set agreed stake
  -> set-stake (and supported legacy aliases)
  -> bet-event-bridge.js validates 500..10000
  -> room stake is updated
  -> bet-room-state + bet-agreed emitted

Player: Stake & Confirm
  -> stake (and supported legacy aliases)
  -> player is added to stakedPlayers
  -> bet-room-state + stake-confirmed emitted

All players staked + ready + room full
  -> bet-system.lockBet()
  -> DB transaction locks player wallets
  -> stake is deducted from every player
  -> ludo_match_bets record is created
  -> game starts

Game finished
  -> bet-system.settleBet()
  -> full pot is credited to winner
  -> bet-settled is broadcast
```

## Why `bet-event-bridge.js` exists

The application contains older multiplayer modules that wrap Socket.IO event registration. That made the stake event vulnerable to listener-order changes and caused the UI to remain on `Setting <amount>-coin stake...` even though the button click itself worked.

`bet-event-bridge.js` provides an authoritative Socket.IO ingress using `socket.onAny()` for the stake-related events. It also rehydrates the betting projection on `join-room`, which is important for refresh/reconnect: the room's current stake and staking progress are sent back to the client instead of resetting the UI.

The bridge does **not** replace the wallet transaction. `bet-system.js` remains responsible for the actual coin deduction and settlement.

## Do not change casually

Do not add another Socket.IO prototype wrapper for the stake events. If the stake UI changes, keep the event names compatible with:

- `set-stake`
- `stake`
- `bet-room-state`
- `bet-agreed`
- `stake-confirmed`
- `stake-error`
- `bet-settled`

Any change to wallet deduction or payout must remain server-authoritative and transactional.
