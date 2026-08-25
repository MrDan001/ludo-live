# Multiplayer Lobby

## Player identity

The room lobby must display the authenticated player's profile username/nickname, never hard-coded `Player 1` placeholders. `/api/auth` is read when the room page loads and the resolved username is passed into `LiveSocial` and the multiplayer socket join payload.

The waiting-room avatar is also player-specific. `LiveSocial` resolves each roster member's public Player Showcase data through `GET /api/player/[username]` and renders that player's current `equipped.avatar` through `lib/customization-catalog`. The room must never use a generic hard-coded avatar for another player when a real equipped avatar is available.

### Avatar state merge rule

The room receives both a legacy `roster` event and later canonical `game-state` updates. The canonical game-state payload may omit cosmetic fields. `LiveSocial` must therefore merge state by stable `playerId` and preserve an existing `avatar`, `board`, `dice` and player identity when the newer state does not include those fields. A game-state update must never erase a previously resolved avatar and cause the UI to fall back to the generic icon.

Avatar enrichment is also written back into the local member record after the public showcase request resolves. This prevents a later state update or unrelated button interaction from dropping the resolved avatar back to a placeholder. If the canonical state includes a newer cosmetic value, that server value wins.

## Waiting room presentation

`app/_components/LiveSocial.tsx` is the canonical waiting-room presentation. It uses a 2x2 player-seat grid, host crown, real avatar, username, Ready/Not Ready state, invite empty seats, game mode/stake summary, voice control, Ready control, host-only Start Game, stake agreement panel and compact chat button. Empty seats copy the room code so the player can invite someone.

## Coin betting and in-room stake agreement

**Stake is intentionally NOT selected on Create Game or Join Game.** Creating/joining a room only establishes the room and player count. The players must first agree on the stake through the room's existing voice/chat. Only then does the host enter the agreed amount in the waiting room.

Supported multiplayer sizes are **2 players** and **4 players**.

- Minimum stake: **500 coins** per player.
- Maximum stake: **10,000 coins** per player.
- Create Game does not ask for a stake.
- Join Game does not ask for a stake.
- The public lobby does not invent or display a stake before agreement.
- Players can use the room voice/chat to agree on the amount.
- The host then enters the agreed amount in the **Stake agreement** panel and clicks **Set agreed stake**.
- The server validates the host's amount and broadcasts it to every room member.
- Every player, including the host, must then click **Stake & Confirm**.
- The server tracks the confirmations by socket/player membership.
- The game cannot start until all room members have confirmed the agreed stake and all players are Ready.
- The actual coin deduction happens atomically when the host starts the fully confirmed match; this prevents partial coin deductions when only some players have agreed/staked.
- The pot is `stake × roomSize`.
- When the existing authoritative Ludo game produces a winner, that winner receives the complete pot.

Examples:

`2 × 500 = 1,000 coins`

`4 × 10,000 = 40,000 coins`

Betting is game currency only. It does not use Paystack or real-money balances.

### Betting implementation

`bet-system.js` is preloaded before `server.js` in the production start command. It wraps the existing Socket.IO room/start/game lifecycle without replacing the existing Ludo movement rules.

The server-side room bet state contains:

- `stake` — zero until the host sets the agreed amount.
- `stakedPlayers` — socket members who confirmed the agreed stake.
- `allStaked` — true only when every room seat has confirmed.
- `locked` — true only after the atomic wallet transaction has completed and the match is entering the game.

The system creates:

- `ludo_match_bets` — one escrow record per match.
- `ludo_match_bet_players` — the players who funded the escrow.

The lock transaction uses PostgreSQL row locks on every player's wallet. If any player lacks the required coins, the whole lock transaction rolls back and the match does not start. Settlement is also transactional and checks the bet status so the same pot cannot be paid twice.

The client receives `bet-room-state`, `bet-agreed`, `stake-confirmed`, `stake-error` and `bet-settled` events for display. Clients never perform the authoritative coin deduction or award themselves winnings.

See `BET_SYSTEM.md` for the complete betting contract and database/event details.

## Chat

The waiting room does **not** render a permanent chat text area. The `💬` button is the canonical entry point and opens a chat drawer/sheet containing the existing room messages, quick messages and text composer. This is also the intended place for players to agree on the stake before the host sets it.

Do not add a second always-visible chat composer to the waiting-room card unless the product requirement explicitly changes.

## Player inspection

Every room player avatar/name is wrapped by `PlayerIdentityLink` and opens the canonical `/player/<username>` Player Showcase. The same public showcase API supplies level, title, prestige, achievements, loadout and next milestone. The Player Showcase must not create a second player-profile implementation.

## Readiness

The canonical multiplayer socket layer owns readiness for the actual match. The host is initially ready (`seat === 0`). Other players can toggle Ready/Unready from the room. `LiveSocial` listens to the canonical `game-state` event and merges each player's `playerId`, `name`, `ready`, `seat`, and `connected` state into the lobby roster.

The Start Game control remains host-only and requires the full room, every player ready, every player connected, an agreed stake, and every player having confirmed that stake.

## Voice chat

Room voice uses the existing canonical `ChatVoice.tsx` implementation with PeerJS/WebRTC. `LiveSocial.tsx` must not create a second room voice transport. The voice control is intentionally reused as the first place for stake negotiation.

## Empty-room cleanup and Leave Room

An empty multiplayer room must **cease to exist immediately** when its last member leaves or disconnects before the match has started. It must not remain visible in the public lobby, remain joinable by room code, or appear as a ghost room with `0` players.

The `empty-room-cleanup.js` preload provides this narrowly-scoped server-side cleanup. It tracks the actual `server.js` room registry and each room's member map. When the last member is removed, the parent room entry is deleted immediately.

The betting layer also removes its own room state when the last member disconnects. No stake is locked for an empty/unstarted room.

## Room-to-game handoff

There are four related server responsibilities:

- `server.js` maintains the legacy room/lobby roster and room discovery.
- `multiplayer-canonical.js` owns canonical multiplayer readiness, start, dice, movement and reconnect state.
- `bet-system.js` owns the in-room stake agreement, stake confirmations, atomic wallet lock and winner settlement around the existing match lifecycle.
- `empty-room-cleanup.js` removes the room registry entry when its last member disconnects.

The lifecycle is:

`Create/Join room -> players negotiate stake via voice/chat -> host sets agreed stake -> all players confirm stake -> all players Ready -> atomic wallet lock -> existing Ludo game -> authoritative winner -> full pot settlement`

## Files

- `app/room/page.tsx` — room creation/joining and player identity. It intentionally does not collect a stake.
- `app/_components/LiveSocial.tsx` — waiting-room UI, chat/voice access, host stake agreement input, player stake confirmation, readiness and start controls.
- `app/lobby/page.tsx` — public room discovery; it does not invent a stake before players agree inside the room.
- `server.js` — room discovery, roster, host ownership and authoritative `start-game.board` payload.
- `bet-system.js` — server-side stake agreement, confirmations, escrow lock, canonical winner settlement and bet Socket.IO events.
- `empty-room-cleanup.js` — isolated automatic deletion of empty multiplayer room registry entries.
- `BET_SYSTEM.md` — detailed betting contract.

## Do not regress

Do not put stake selection back on Create Game or Join Game. Do not allow a client to choose the final stake outside the host's server-validated in-room agreement. Do not deduct coins from React when a player clicks Stake; the server must perform the final atomic wallet lock. Do not trust a client-provided winner. Do not settle from `game-moved`; settlement must follow the canonical finished game state. Preserve the existing Ludo movement/rule engine. Never allow an empty room to remain visible or joinable after its last member has left.
