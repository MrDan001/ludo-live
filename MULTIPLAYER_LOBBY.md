# Multiplayer Lobby

## Player identity

The room lobby must display the authenticated player's profile username/nickname, never hard-coded `Player 1` placeholders. `/api/auth` is read when the room page loads and the resolved username is passed into `LiveSocial` and the multiplayer socket join payload.

## Readiness

The canonical multiplayer socket layer owns readiness for the actual match. The host is initially ready (`seat === 0`). Other players can toggle Ready/Unready from the lobby. `LiveSocial` listens to the canonical `game-state` event and merges each player's `playerId`, `name`, `ready`, `seat`, and `connected` state into the lobby roster. This prevents the legacy lobby roster from becoming stale when the canonical `ready` handler intercepts the Socket.IO event.

The Start Game control remains host-only and requires the full room, every player ready, and every player connected.

## Voice chat

Room voice uses the existing canonical `ChatVoice.tsx` implementation with PeerJS/WebRTC. `LiveSocial.tsx` must not create a second room voice transport. The profile microphone preference does not itself grant browser hardware permission. The first use of Mic On must call `navigator.mediaDevices.getUserMedia({ audio: ... })`; browsers require explicit permission and secure HTTPS context.

`ChatVoice` preserves incoming WebRTC calls when the receiving player has not enabled their microphone yet, then answers those pending calls when the local microphone stream becomes available. Remote streams are attached to autoplay/playsinline audio elements.

## Room-to-game handoff

There are two related server responsibilities:

- `server.js` maintains the legacy room/lobby roster and room discovery.
- `multiplayer-canonical.js` is preloaded by the production start command and owns canonical multiplayer readiness, start, dice, movement and reconnect state.

A room socket disconnects when the player navigates from `/room` to `/game-online`. Once the canonical match has started, the canonical socket disconnect handler must own that lifecycle and must not forward the disconnect into the legacy room handler. The legacy 2-player room handler closes the room and emits `kicked` when it believes the host permanently left; forwarding the normal navigation disconnect during a game transition therefore incorrectly kicked the other player back to `/lobby`.

`multiplayer-canonical.js` now returns after handling a canonical disconnect, preventing the legacy room teardown from firing during the room-to-game transition.

## Files

- `app/room/page.tsx` — authenticated room/player naming and navigation to the online game.
- `app/_components/LiveSocial.tsx` — roster/readiness synchronization, chat and integration with `ChatVoice`.
- `app/_components/ChatVoice.tsx` — canonical PeerJS/WebRTC voice transport and pending-call handling.
- `multiplayer-canonical.js` — authoritative multiplayer readiness/start/game/reconnect rules and canonical disconnect ownership.
- `app/game-online/page.tsx` — online game entry.
- `app/game/MultiplayerGameCanonical.tsx` — canonical multiplayer board client.

## Do not regress

Do not restore hard-coded `Player 1` defaults for authenticated players, create a second voice implementation, or bypass the canonical readiness handler with a competing readiness state. Keep the server/canonical game state authoritative.

Do not forward a canonical multiplayer disconnect to the legacy lobby disconnect handler after a match has started; doing so can trigger the legacy 2-player host-left cleanup and kick the remaining player during navigation.
