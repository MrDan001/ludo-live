# Multiplayer Room Refresh Behavior

## Purpose

The room page is refresh-safe. A browser refresh or short network reconnect must not reset the player's room progress.

## What is preserved

When the same authenticated player reconnects to the same room code, the server restores the live room state instead of creating a fresh room entry. This includes:

- Current room membership
- Host ownership
- Ready state
- Agreed stake
- Stake confirmations already made by that player
- Current player roster
- Server-authoritative room/bet state

The client already stores the room code/name locally so the room page can restore itself after a browser refresh.

## Leave vs refresh

These are intentionally different:

- **Leave Room:** explicit `leave-room` action; cleanup remains immediate.
- **Refresh / temporary disconnect:** server gives the old socket a 5-second reconnect grace period. If the player reconnects, the replacement socket takes over the old membership/state.
- **No reconnect:** normal disconnect cleanup runs after the grace period, including empty-room deletion and host transfer behavior.

## Why this exists

A Socket.IO disconnect happens during a normal browser refresh. Treating every disconnect as a permanent leave would destroy an active room and reset stake/ready progress. `room-refresh-persistence.js` sits before the multiplayer lifecycle hooks and bridges the old socket to the refreshed socket by `playerId`.

## Scope

This layer does not modify Ludo movement, dice, board rules, winner calculation, wallet settlement, or stake limits. It only preserves the existing room/bet state across refresh/reconnect.
