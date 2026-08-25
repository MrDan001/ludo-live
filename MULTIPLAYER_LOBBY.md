# Multiplayer Lobby

## Player identity

The room lobby must display the authenticated player's profile username/nickname, never hard-coded `Player 1` placeholders. `/api/auth` is read when the room page loads and the resolved username is passed into `LiveSocial` and the multiplayer socket join payload.

## Readiness

The canonical multiplayer socket layer owns readiness for the actual match. The host is initially ready (`seat === 0`). Other players can toggle Ready/Unready from the lobby. `LiveSocial` listens to the canonical `game-state` event and merges each player's `playerId`, `name`, `ready`, `seat`, and `connected` state into the lobby roster. This prevents the legacy lobby roster from becoming stale when the canonical `ready` handler intercepts the Socket.IO event.

The Start Game control remains host-only and requires the full room, every player ready, and every player connected.

## Voice chat

Voice chat uses `public/live-social.js` with PeerJS/WebRTC. The profile microphone preference does not itself grant browser hardware permission. The first use of Mic On must call `navigator.mediaDevices.getUserMedia({ audio: ... })`; browsers require explicit permission and secure HTTPS context. The UI now reports when voice is still connecting or when microphone permission is unavailable.

Peer connections wait until the PeerJS peer is open before attempting voice calls. Voice streams are re-synchronized when the roster changes and when a microphone is enabled.

## Files

- `app/room/page.tsx` — authenticated room/player naming.
- `app/_components/LiveSocial.tsx` — roster/readiness synchronization and mic controls.
- `public/live-social.js` — PeerJS/WebRTC voice transport.
- `multiplayer-canonical.js` — authoritative game readiness/start rules.

## Do not regress

Do not restore hard-coded `Player 1` defaults for authenticated players, and do not bypass the canonical readiness handler with a second competing readiness state. Keep the server/canonical game state authoritative.
