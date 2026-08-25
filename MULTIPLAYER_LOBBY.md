# Multiplayer Lobby

## Player identity

The room lobby must display the authenticated player's profile username/nickname, never hard-coded `Player 1` placeholders. `/api/auth` is read when the room page loads and the resolved username is passed into `LiveSocial` and the multiplayer socket join payload.

The waiting-room avatar is also player-specific. `LiveSocial` resolves each roster member's public Player Showcase data through `GET /api/player/[username]` and renders that player's current `equipped.avatar` through `lib/customization-catalog.ts`. The room must never use a generic hard-coded avatar for another player when a real equipped avatar is available.

### Avatar state merge rule

The room receives both a legacy `roster` event and later canonical `game-state` updates. The canonical game-state payload may omit cosmetic fields. `LiveSocial` must therefore merge state by stable `playerId` and preserve an existing `avatar`, `board`, `dice`, and player identity when the newer state does not include those fields. A game-state update must never erase a previously resolved avatar and cause the UI to fall back to the generic icon.

Avatar enrichment is also written back into the local member record after the public showcase request resolves. This prevents a later state update or unrelated button interaction from dropping the resolved avatar back to a placeholder. If the canonical state includes a newer cosmetic value, that server value wins.

The data flow is:

`roster/showcase -> local member state -> canonical game-state merge -> preserve cosmetics unless server provides a newer value -> render equipped avatar`

## Waiting room presentation

`app/_components/LiveSocial.tsx` is the canonical waiting-room presentation. It uses a 2x2 player-seat grid, host crown, real avatar, username, Ready/Not Ready state, invite empty seats, game mode/stake summary, voice control, Ready control, host-only Start Game, and a compact chat button. Empty seats copy the room code so the player can invite someone.

The current multiplayer system has no server-backed betting/stake field, so the waiting room intentionally displays **BET AMOUNT: Free** rather than inventing a coin wager. If real stakes are introduced later, the amount must be carried by the authoritative room state and validated server-side before this UI changes.

## Chat

The waiting room does **not** render a permanent chat text area. The `💬` button is the canonical entry point and opens a chat drawer/sheet containing the existing room messages, quick messages and text composer. This keeps the room visually focused while retaining the same Socket.IO chat functionality.

Do not add a second always-visible chat composer to the waiting-room card unless the product requirement explicitly changes.

## Player inspection

Every room player avatar/name is wrapped by `PlayerIdentityLink` and opens the canonical `/player/<username>` Player Showcase. The same public showcase API supplies level, title, prestige, achievements, loadout and next milestone. The Player Showcase must not create a second player-profile implementation.

The public showcase intentionally exposes only the information needed for player identity/reputation. Private wallet balances, email, password, sessions and other private account fields are not exposed.

## Next milestone preview

When one player inspects another from the room, the Player Showcase displays **only the single next milestone** after the player's current level. It does not list all future milestones. This keeps the inspection card focused on the one thing the player is currently working toward.

The Showcase also contains a progressive Level Journey road. From Level 5 onward it shows sequential levels and marks the inspected player's exact current level. Players below Level 5 use a Level 1 starting point so their current marker remains visible. The journey uses the shared level reward plan for reward labels and does not grant anything from the client.

## Readiness

The canonical multiplayer socket layer owns readiness for the actual match. The host is initially ready (`seat === 0`). Other players can toggle Ready/Unready from the lobby. `LiveSocial` listens to the canonical `game-state` event and merges each player's `playerId`, `name`, `ready`, `seat`, and `connected` state into the lobby roster. This prevents the legacy lobby roster from becoming stale when the canonical `ready` handler intercepts the Socket.IO event.

The Start Game control remains host-only and requires the full room, every player ready, and every player connected.

## Voice chat

Room voice uses the existing canonical `ChatVoice.tsx` implementation with PeerJS/WebRTC. `LiveSocial.tsx` must not create a second room voice transport. The profile microphone preference does not itself grant browser hardware permission. The first use of Mic On must call `navigator.mediaDevices.getUserMedia({ audio: ... })`; browsers require explicit permission and secure HTTPS context.

The waiting room intentionally shows **only the microphone control**. PeerJS/WebRTC connection errors, permission errors, and connection-status notices are not rendered as a large text block beside the controls. Voice errors may still be logged for debugging and the mic state remains local to the voice control. Do not reintroduce the verbose `Voice connection is unavailable...` waiting-room message unless the product requirement explicitly changes.

## Explicit Leave Room vs accidental disconnect

These are different lifecycle events and must remain different:

- **Explicit Leave Room:** the player intentionally chooses Leave Room. The Room page raises `leaveRequested`; `LiveSocial` immediately disconnects its room socket before navigation.
- **Accidental/network disconnect:** do not convert this into an explicit leave. The server's reconnect/host-recovery rules remain responsible for restoring the same room when appropriate.
- **Last remaining participant:** when the server sees that no room members remain, the room must be deleted and `room-list` broadcast so it cannot appear as a ghost room.
- **Host with other participants:** intentional leave should transfer host authority to an eligible connected member rather than leaving a usable room with `host = null`.

## Room-to-game handoff

There are two related server responsibilities:

- `server.js` maintains the legacy room/lobby roster and room discovery.
- `multiplayer-canonical.js` is preloaded by the production start command and owns canonical multiplayer readiness, start, dice, movement and reconnect state.

A room socket disconnects when the player navigates from `/room` to `/game-online`. Once the canonical match has started, the canonical socket disconnect handler must own that lifecycle and must not forward the disconnect into the legacy room handler.

## Host theme/skin authority

The host's equipped board/skin is the authoritative visual configuration for a multiplayer room. Player-specific avatar data is separate and remains individual to each player.

Result:

`Player profile -> equipped avatar -> public Player Showcase -> waiting-room roster avatar`

and:

`Host customization -> host room member.board -> server start-game.board -> every client ludo-match-board -> MultiplayerGameCanonical`

## Files

- `app/room/page.tsx` — authenticated room/player naming, explicit Leave Room request, and navigation to the online game.
- `app/_components/LiveSocial.tsx` — canonical waiting-room layout, roster/readiness synchronization, avatar state merging/enrichment, player inspection links, chat drawer, voice integration and start handling.
- `app/_components/PlayerIdentityLink.tsx` — canonical player-to-showcase navigation wrapper.
- `app/api/player/[username]/route.ts` — server-authoritative public showcase data, including equipped avatar and the single next milestone.
- `app/player/[username]/page.tsx` — public Player Showcase, real avatar rendering and progressive Level Journey.
- `app/api/auth/route.ts` — authenticated public user payload, including the current user's equipped avatar.
- `app/_components/ChatVoice.tsx` — canonical PeerJS/WebRTC voice transport and microphone control.
- `server.js` — room discovery, roster, host ownership and authoritative `start-game.board` payload.
- `multiplayer-canonical.js` — authoritative multiplayer readiness/start/game/reconnect rules.
- `app/lobby/page.tsx` — public room discovery and capacity/occupancy display.

## Do not regress

Do not restore hard-coded `Player 1` or generic opponent avatars when a real account identity is available. Do not let canonical game-state updates erase previously resolved player cosmetics. Do not duplicate Player Showcase logic in the room. Do not invent betting values or gameplay buffs in the waiting room. Keep readiness, room membership, host authority and match start server/canonical-state authoritative. Keep the permanent chat text area out of the waiting-room layout; the `💬` button opens the chat drawer. Keep voice status text out of the waiting-room layout; the microphone control is sufficient.
