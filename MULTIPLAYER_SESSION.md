# Multiplayer Session & Reconnect Rules

This document is the canonical handoff for the multiplayer room lifecycle.

## Authority
The Socket.IO server is authoritative for room membership. `ludo-room` in localStorage is only a convenience cache and must never be treated as proof that a player is still in a room.

## Explicit Leave
- Clicking **Leave Room** requests `leave-room` from the server before navigation.
- If the leaving player is the only member, the server deletes the room immediately and broadcasts the updated room list.
- If other players remain and the leaver is host, the server transfers host authority to a connected remaining player.
- A stale room must never remain publicly joinable after its final member leaves.

## Unexpected disconnect
- A temporary network disconnect is reserved for up to 30 seconds.
- If the host reconnects with the same authenticated player ID, host authority is restored.
- If the host does not return, an available connected player becomes host.
- If nobody remains after the reconnect window, the room closes.

## After game start
The canonical game session remains on the server during a temporary disconnect. Rejoining with the same authenticated player ID receives the current `game-state`; players do not create a second match.

## Voice
`ChatVoice.tsx` remains the single canonical room voice implementation. It uses PeerJS/WebRTC and browser microphone permission. Do not create room-specific duplicate voice implementations.

## Regression guard
There must be exactly one Socket.IO room `disconnect` handler. Explicit Leave and unexpected disconnect are separate server events.

## Deployment repair marker
The room lifecycle repair workflow must complete before this change is considered live.
