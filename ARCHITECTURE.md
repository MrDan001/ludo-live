# Ludo Live — Architecture & Product Contract

## Purpose

This is the production technical map. Read it before changing gameplay, board rendering, authentication, customization, XP/levels, Shop, Inventory, Award Room, admin, finance, tournaments, free spins, voice, events, or deployment. **Do not infer product rules from screenshots or previous conversations.** If a rule changes, update this document and `DEVELOPER_HANDOFF.md` in the same change.

## Runtime / source of truth

- Next.js 14 / React 18 / TypeScript 5.6.
- PostgreSQL through `pg` is the persistent source of truth.
- Socket.IO in `server.js` owns live multiplayer room state.
- `main` is the production GitHub branch connected to Railway.
- A release is **not live** until Railway reports `SUCCESS`.
- Authenticated server APIs derive identity from the `ludo_session` cookie. Never trust a client-supplied user id for privileged operations.
- `localStorage` may support UX restoration, but it is not authoritative over server-backed account, wallet, customization, tournament, progression, or event state.

## Canonical gameplay architecture

### Board / rules

- `app/_components/LudoBoard.tsx` — base 15×15 board, themes, palettes, geometry and token rendering.
- `app/_components/CanonicalLudoBoard.tsx` — canonical interactive board adapter; legal tokens are supplied through `legalTokenKeys` and receive the breathing/pulse animation.
- `app/_components/LudoBoardFixed.tsx` — framed/fixed board wrapper.
- `app/_components/LudoBoardMultiplayer.tsx` — multiplayer renderer.
- `lib/ludoRules.ts` — underlying rules.
- `lib/ludoEngine.ts` — public movement/capture/winner/seat adapter.
- `lib/canonicalLudoBoard.ts` — canonical geometry/state helpers.

Current team model: Human = `red` + `yellow`; Bot = `green` + `blue`. Teammates cannot capture each other.

**Do not create a second board geometry or parallel rule engine.** Reuse the canonical implementation.

### Protected Bot-vs-Human reference

`app/game/GameBoardContent.tsx` and `/game` are the known-good gameplay reference. Do not casually refactor or alter them while fixing another mode. Port only the smallest required behavior and preserve the reference behavior unless the user explicitly asks for a Bot-vs-Human change.

### Dice/audio

- `app/_components/DemoDice.tsx` — player dice interaction and roll-start event.
- `app/_components/LudoDice.tsx` — dice skins/rendering.
- `app/_components/LudoAudio.tsx` — canonical audio system.
- Audio events: `dice`, `move`, `capture`, `safe`, `home`, `win`.
- Exactly one player `dice` event occurs at roll start. Do not add another when the result appears. Bot paths may emit their own start-of-roll event because bots do not click `DemoDice`.

## Voice / room microphone

- `app/_components/ChatVoice.tsx` is the shared microphone/voice component used by room surfaces.
- Voice transport is browser WebRTC through PeerJS (`peerjs@1.5.4`) with PeerJS signaling. It is separate from the Socket.IO gameplay state.
- The room owner acts as the roster hub: non-owner peers announce themselves to the owner's peer id, and the owner distributes the discovered peer ids so participants can establish direct audio calls.
- A microphone stream is obtained only after the player presses the Mic button and grants browser permission. The component checks that the page is running in a secure context (`HTTPS`) and that `getUserMedia` is available.
- **Important call lifecycle rule:** a remote WebRTC call can arrive before the local player has enabled the microphone. `ChatVoice` stores that pending call and answers it as soon as the local microphone is enabled. This prevents the common race where one player turns on the mic before the other and the first audio call is permanently unanswered.
- Remote streams are attached to hidden autoplay/playsinline audio elements. The component also attempts `audio.play()` after receiving a stream so remote audio is actually rendered by the browser.
- Mic off stops the local audio tracks; room teardown closes peer connections and removes remote audio elements.
- Voice failures are reported in the mic control rather than silently failing.
- Do not create separate voice implementations for individual rooms. Fix shared voice lifecycle issues in `ChatVoice.tsx` unless a room has a demonstrably different voice contract.
- Browser permission, HTTPS, network/NAT restrictions, and autoplay policies remain external prerequisites for WebRTC. Do not treat the mic button's green state alone as proof that another player received audio.

## Authentication / profile / customization

- `app/api/auth/route.ts` — registration, login, guest, logout, username changes and current user.
- `lib/auth-session.ts` — server session lookup.
- `app/api/customization/route.ts` — authoritative owned/equipped board, dice, avatar and item state.

The profile exposes `username`, wallet and progression/customization data. Multiplayer should use the real profile username rather than generic player labels when available.

## Multiplayer

- `server.js` — Socket.IO room state, roster, host, dice/move events, chat/friends and match hooks.
- `app/game/MultiplayerGameCanonical.tsx` — client live multiplayer.
- `app/game-online/page.tsx` — online entry.
- `app/_components/LiveSocial.tsx` — canonical multiplayer waiting-room presentation.

The **host owns the room board skin**. A joining player's personal board skin must never replace the host skin. Seat/team mapping comes from the canonical engine; do not invent another mapping in UI.

2-player and 4-player multiplayer should remain viewport-sized and non-scrollable unless a deliberate responsive redesign is requested.

### Waiting-room identity contract

Player names and avatars in the waiting room use `PlayerIdentityLink` and the authoritative `/api/player/[username]` profile data. If a Socket.IO roster/game-state update contains a stale/default avatar, the authoritative equipped avatar from the player endpoint wins. The canonical `AVATARS` catalogue is the only avatar icon source, including the shared `🧑🏽‍🎮` default representation.

Cosmetic state is merged by stable player identity so a later game-state update cannot make an already-resolved avatar disappear. The waiting room must not create a second avatar catalogue or hard-coded player identities.

## Player Showcase / reputation identity

- `/player/<username>` is the canonical public player inspection route.
- `app/player/[username]/page.tsx` consumes `GET /api/player/[username]` and renders server-derived public identity/progression data.
- `app/_components/PlayerIdentityLink.tsx` is the shared navigation contract from player names/avatars to the Showcase.
- The Showcase exposes public hierarchy title, level, prestige, achievements, loadout and the single next milestone, but not private wallet, email, password or session data.
- The Showcase avatar resolves from the same `AVATARS` catalogue and the same `🧑🏽‍🎮` default representation as Profile.
- The Level Journey is a progressive road that starts publicly at **Level 1**. Level 0 is never rendered as a public journey node. Legacy Level 0 records are visually normalized to Level 1 for the journey.
- The current visible level receives a 📍 node and `CURRENT LEVEL` pill. The separate `YOU ARE HERE` label and the explanatory paragraph above the road are intentionally absent.
- The current row displays current-level XP, a progress bar and exact XP remaining to the next level using canonical `xpRequiredForLevel()`.
- The road renders a useful current-level window rather than enumerating unlimited future levels.
- Hierarchy is independent of Level and Prestige and is derived from verified active game-session hours. The ladder is: On Your Way (<1h), Rookie (1h), Dabbler (3h), Hobbyist (10h), Enthusiast (20h), Devotee (40h), Fanatic (60h), Expert (100h), Prodigy (300h), Champion (500h), Mastermind (750h), Legend (1,000h), Grandmaster (1,500h), Immortal (2,000h).

## Tournament

- `app/tournament/page.tsx` — tournament list/details/standings.
- `app/tournament/game/page.tsx` — tournament viewport shell.
- `app/game/TournamentBotGame.tsx` — tournament Bot-vs-Human game.
- `app/api/tournaments/route.ts` — tournament listing, join/leave, board persistence, win recording and leaderboard.
- `app/api/tournaments/board-state/route.ts` — authenticated board-session restore.
- `app/api/tournaments/_schema.ts` — schema helpers.
- `app/_components/TournamentSessionResume.tsx` — resume helper.

Tournament intentionally uses the `classic` board skin unless product requirements explicitly change this. Tournament state is isolated per `(tournament_id, user_id)` with a private `board_token`. The server is authoritative for wins/points and the win transaction is idempotent. Never award tournament points from client state alone.

Tournament game is intentionally viewport-locked/non-scrollable.

## XP / levels

Progression is server-backed.

- A **game win in any game mode** awards **+7 XP**.
- A **successful diamond purchase** awards **+15 XP**.
- Every completed **30 minutes of verified active game-session time** awards **+5 XP** during normal hours or **+15 XP** during Rush Hour.
- XP awards must be server-authoritative and protected against duplicate awards.
- Existing scalable level progression formula is retained; do not replace it without an explicit product decision.
- `app/_components/XPLevelCelebration.tsx` provides the level-up presentation.
- A level completion animates the XP bar filling, transitions to the next level, starts the next level's progress, and shows a congratulatory celebration for roughly 4 seconds.
- XP/progression updates should dispatch/use the existing progression refresh mechanism rather than maintaining a second local progression system.

## Free Spin / Active Time Rewards

Free spins are a server-authoritative reward balance that can be consumed by the Spin Wheel.

- Only active game-session surfaces count toward the engagement timer: `/room`, `/game`, `/game-online`, and `/tournament/game`.
- The document must be visible. `app/_components/ActiveSpinRewards.tsx` sends periodic heartbeats only while an eligible game-session surface is visible.
- Every completed **30 minutes** grants **1 free spin + 5 XP** during normal hours.
- Between **17:00 and 20:00 Nigeria time (`Africa/Lagos`)**, every completed 30-minute interval grants **3 free spins + 15 XP** instead.
- `/api/spin/activity` is authoritative for elapsed active time, spin grants, XP grants and persistent active-time totals. The server caps heartbeat elapsed time and uses a database transaction/row lock so concurrent heartbeats cannot double-award an interval.
- `ludo_spin_state.active_seconds` stores the current unawarded remainder; `ludo_spin_state.total_active_seconds` stores the cumulative active-session time used by the hierarchy system.
- Free-spin balance and consumption are authoritative in PostgreSQL via `ludo_spin_state` and `/api/spin`.
- Free spins are not coins or gems and must not be represented as either wallet currency.
- `/profile` displays the player's current **Free Rolls** balance.
- `/spin` displays the current free-spin balance and consumes the server-side balance when a spin is used.
- When an active-time reward is granted, the app shows an in-game notification with the spin and XP award. Browser/OS notification is sent only when notification permission is available; do not claim closed-app push delivery without the required push infrastructure.
- Unused earned spins persist until consumed; they do not reset daily.
- An existing `extraSpin` wheel prize adds one additional free spin to the server balance.
- The Nigeria-time window is a business rule and must use `Africa/Lagos`, never the developer/device timezone.
- Do not implement the reward as a client-only timer or localStorage balance.

## Event architecture

The Event system is a server-authoritative layer over existing gameplay/missions. It does not create a parallel Ludo rules engine.

### Event source of truth

- Event definitions, schedule and rewards are stored in PostgreSQL `ludo_events`.
- Per-player participation/progress is stored in `ludo_event_entries`.
- Settled reward payments are protected by the `ludo_event_rewards` ledger.
- `/api/events` derives the authenticated player from the `ludo_session` cookie.
- Admin configuration is the source of event schedule, objectives, supported modes/boards and rewards.

### Player Event UI contract

The player Event page has only two tabs:

- **Live Events**
- **Upcoming**

There is intentionally **no History tab and no Expired tab** for players. Expired records remain in the database for Admin review/settlement.

The Event page renders its own single top Back button and passes `hideBack` to `AppFrame` to prevent a duplicate shell Back button.

### Lifecycle

The server evaluates the stored timestamps:

- `starts_at > NOW()` → upcoming
- `starts_at <= NOW() < ends_at` → live
- `ends_at <= NOW()` → ended/settlement eligible

Players can join only while the server evaluates the event as live. Client countdowns are visual only and are never authoritative.

### Progress

`POST /api/events` with `action=activity` evaluates active joined entries by `mission_kind`. Progress is capped to `mission_target`; reaching the target sets `completed=TRUE` and records `completed_at`.

Game/missions integrations should feed the canonical event activity path rather than writing event progress directly from React.

### Expiry and settlement

The expiry/settlement path is transactional and idempotent:

1. Find published events whose `ends_at <= NOW()`.
2. Lock the event transaction.
3. Mark the event ended.
4. Find completed player entries.
5. Insert one `ludo_event_rewards` ledger row per `(event_id,user_id)` with conflict protection.
6. Credit configured coins/gems only for a newly inserted ledger row.
7. Mark the entry `reward_claimed=TRUE`.
8. Record `settled_at`.

The production event-settler worker runs independently of the player page. API reads/actions also invoke settlement defensively.

### Progress-bar rendering rule

The Event UI percentage fill must be a block-level element with explicit height and width. A plain inline `<span>` can leave a completed `1/1` progress bar visually empty because percentage width does not produce the intended fill on an inline element. The current implementation uses `progressFill` with `display: block`, `height: 100%`, a calculated percentage width and a width transition.

See `EVENTS.md` for the complete Event developer handoff.

## Shop / pricing architecture

The Shop has two responsibilities: catalogue availability and purchase pricing. The **server is authoritative** for price/currency and the player Shop must consume the same server-backed pricing that Admin manages.

### Player Shop categories

The player Shop has:

- Coins
- Gems
- Items
- Avatars
- Boards
- Dice

### Admin Shop rules

Admin Shop belongs **inside the admin hamburger menu**. It must not expose a floating/global button outside the admin page.

Admin can change **price only**; admin must not change ownership data or item definitions from this screen.

Supported price currencies:

- `coins`
- `gems`
- `naira`

The Admin Shop must include both **Coin purchase packages and Gem purchase packages**, in addition to customization items. Changing a package/item from Coins to Gems or Naira is a pricing configuration change and must flow through the same authoritative purchase path.

Naira purchases must use the existing verified payment flow; never credit a Naira purchase merely because a client says payment succeeded.

Admin Shop endpoint: `app/api/admin/shop/route.ts`. Player customization ownership remains under `app/api/customization/route.ts`.

## Inventory / Award Room

The home page has a split card with exactly two labels:

- **Friend** → `/friends`
- **Inventory** → `/inventory`

Do not add explanatory subtitles or `OPEN` labels back to these two buttons unless explicitly requested.

Inventory is strictly the player's acquired/owned collection.

### My Items

Shows only items the authenticated player owns/acquired from the Shop/customization system. It may include boards, dice, avatars and other owned shop items. Equip actions must use the authoritative customization API.

### Award Room

Award Room is a second tab **inside Inventory**. It is for earned rewards only, such as tournament medals/badges and achievement rewards.

- Store purchases do **not** belong in Award Room.
- Tournament awards are read from the existing server-backed tournament/medal data; do not fabricate awards client-side.
- Awards are displayed in a **responsive grid**, not a list.
- Awards are permanent historical achievements unless a future product rule explicitly says otherwise.
- Do not mix purchased inventory with earned awards.

## Home navigation contract

Main home cards are ordered:

1. Play Online
2. Tournaments
3. Play Solo
4. Friends

Inventory is a separate full-width card below the quick-access row. Do not duplicate Friends there.

Home bottom navigation remains:

- Home
- Missions
- Chat
- Profile

The quick-access row retains the existing Daily Reward, Shop, Events and Spin Wheel functions unless explicitly redesigned. Inventory is intentionally accessed through its separate full-width card rather than adding another bottom-nav item.

## Admin architecture

All admin management controls belong inside the **admin hamburger menu**. Do not add floating/fixed admin trigger buttons that can be accessed outside the admin page.

Current menu structure:

### Dashboard

- Overview
- Players
- Economy
- Visitors
- Disputes
- Audit

### Management

- Shop
- Missions
- Tournament Control
- Finance
- Events

The underlying management components may remain mounted for state continuity, but their visible triggers must be controlled by the admin hamburger. Admin authentication/authorization must remain enforced server-side.

### Finance

The Admin Finance page includes server money-bank top-up and wallet transfer tools. The Server Top Up form must remain responsive on mobile: currency, amount and reason controls should stack to full width rather than forcing a desktop multi-column row. Do not sacrifice server-side authorization or audit logging for UI changes.

## Database / financial authority

PostgreSQL is authoritative for accounts, wallets, customization ownership, tournament data, progression, events and financial records. Server transactions must validate balances, ownership and payment state. Never implement a financial mutation as client-only state.

## UI / responsive rules

- Mobile layouts must not depend on desktop-only fixed-width grids.
- Game pages that are designed as viewport experiences should remain `overflow:hidden` / `100dvh` where appropriate.
- Admin controls should not float over unrelated pages.
- Reuse existing design language/components where practical; do not introduce competing navigation systems.

## Deployment / debugging discipline

1. Inspect the current implementation before editing.
2. Trace the exact code path and identify the authoritative source of truth.
3. Reuse canonical APIs/components instead of creating parallel systems.
4. Make the smallest isolated change.
5. Run/build-check the affected code.
6. Push to `main`.
7. Inspect Railway deployment status and logs.
8. If deployment fails, fix the **actual reported error** before changing unrelated code.
9. Only call a release live after Railway reports `SUCCESS`.

## Known traps / lessons

- Do not use screenshots as the sole source of truth for architecture.
- Do not add a fixed admin button simply because a component needs a trigger; the trigger belongs in the admin hamburger.
- Do not treat the Shop catalogue as equivalent to Coin/Gem purchase packages; they are distinct product types but must share authoritative pricing configuration.
- Do not put purchased items into Award Room.
- Do not make Award Room a list when the product contract calls for a grid.
- Do not trust client-only XP, wallet, tournament points, ownership, payment state, free-spin balance or event rewards.
- Do not calculate the 17:00–20:00 reward window using local device time; use Nigeria time on the server.
- Do not expose History/Expired tabs on the player Event page unless explicitly requested.
- Do not render an Event progress fill as an inline-only span; percentage width needs a block-level fill element.
- Do not claim Railway deployment success until the platform reports success.
- Do not treat a successful `getUserMedia()` call or a green Mic button as proof that remote peers received audio. WebRTC call/stream state must be considered separately.
- Do not answer an incoming WebRTC call with `undefined` just because the player has not enabled their mic yet; preserve the call and answer when the local audio stream becomes available.
- Do not count backgrounded/non-game pages toward hierarchy hours or active-time rewards.
- Do not award active-time spins or XP from the client. The server must validate elapsed heartbeat time and apply the reward transactionally.

## Do not guess

If a referenced file/path has moved, search the repository first and update this document. If an existing API already owns a piece of state, integrate with it instead of creating a competing implementation. When a product requirement is ambiguous, stop and verify rather than silently choosing an architecture that can break existing behavior.
