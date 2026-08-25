# Ludo Live — Architecture & Product Contract

## Purpose

This is the production technical map. Read it before changing gameplay, board rendering, authentication, customization, XP/levels, Shop, Inventory, Award Room, admin, finance, tournaments, free spins, or deployment. **Do not infer product rules from screenshots or previous conversations.** If a rule changes, update this document and `DEVELOPER_HANDOFF.md` in the same change.

## Runtime / source of truth

- Next.js 14 / React 18 / TypeScript 5.6.
- PostgreSQL through `pg` is the persistent source of truth.
- Socket.IO in `server.js` owns live multiplayer room state.
- `main` is the production GitHub branch connected to Railway.
- A release is **not live** until Railway reports `SUCCESS`.
- Authenticated server APIs derive identity from the `ludo_session` cookie. Never trust a client-supplied user id for privileged operations.
- `localStorage` may support UX restoration, but it is not authoritative over server-backed account, wallet, customization, tournament, or progression state.

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

## Authentication / profile / customization

- `app/api/auth/route.ts` — registration, login, guest, logout, username changes and current user.
- `lib/auth-session.ts` — server session lookup.
- `app/api/auth/_db.ts` — auth DB schema/pool.
- `app/api/customization/route.ts` — authoritative owned/equipped board, dice, avatar and item state.

The profile exposes `username`, wallet and progression/customization data. Multiplayer should use the real profile username rather than generic player labels when available.

## Multiplayer

- `server.js` — Socket.IO room state, roster, host, dice/move events, chat/friends and match hooks.
- `app/game/MultiplayerGameCanonical.tsx` — client live multiplayer.
- `app/game-online/page.tsx` — online entry.

The **host owns the room board skin**. A joining player's personal board skin must never replace the host skin. Seat/team mapping comes from the canonical engine; do not invent another mapping in UI.

2-player and 4-player multiplayer should remain viewport-sized and non-scrollable unless a deliberate responsive redesign is requested.

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
- XP awards must be server-authoritative and protected against duplicate awards.
- Existing level progression formula is retained; do not replace it without an explicit product decision.
- `app/_components/XPLevelCelebration.tsx` provides the level-up presentation.
- A level completion animates the XP bar filling, transitions to the next level, starts the next level's progress, and shows a congratulatory celebration for roughly 4 seconds.
- XP/progression updates should dispatch/use the existing progression refresh mechanism rather than maintaining a second local progression system.

## Free Spin / Active Time Rewards

Free spins are a server-authoritative reward balance that can be consumed by the Spin Wheel.

- Every **30 minutes of active app time** grants **1 free spin**.
- Between **17:00 and 20:00 Nigeria time (`Africa/Lagos`)**, every completed 30-minute active interval grants **3 free spins** instead.
- Active time is counted while the app/document is visible. The client may send periodic heartbeats, but the server validates/caps elapsed intervals and decides when a reward is earned.
- The authoritative activity/grant endpoint is `/api/spin/activity`.
- Free-spin balance and consumption are authoritative in PostgreSQL via `ludo_spin_state` and `/api/spin`.
- Free spins are not coins or gems and must not be represented as either wallet currency.
- `/profile` displays the player's current **Free Rolls** balance.
- `/spin` displays the current free-spin balance and consumes the server-side balance when a spin is used.
- When a free-spin reward is granted, the app shows an in-app notification. Browser/OS notification is sent only when the browser notification permission/subscription capability is available; do not claim closed-app push delivery without the required push infrastructure.
- Unused earned spins persist until consumed; they do not reset daily.
- An existing `extraSpin` wheel prize adds one additional free spin to the server balance.
- The Nigeria-time window is a business rule and must use `Africa/Lagos`, never the developer/device timezone.
- Do not implement the reward as a client-only timer or localStorage balance.

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

The underlying management components may remain mounted for state continuity, but their visible triggers must be controlled by the admin hamburger. Admin authentication/authorization must remain enforced server-side.

### Finance

The Admin Finance page includes server money-bank top-up and wallet transfer tools. The Server Top Up form must remain responsive on mobile: currency, amount and reason controls should stack to full width rather than forcing a desktop multi-column row. Do not sacrifice server-side authorization or audit logging for UI changes.

## Database / financial authority

PostgreSQL is authoritative for accounts, wallets, customization ownership, tournament data, progression and financial records. Server transactions must validate balances, ownership and payment state. Never implement a financial mutation as client-only state.

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
- Do not trust client-only XP, wallet, tournament points, ownership, payment state or free-spin balance.
- Do not calculate the 17:00–20:00 reward window using local device time; use Nigeria time on the server.
- Do not claim Railway deployment success until the platform reports success.

## Do not guess

If a referenced file/path has moved, search the repository first and update this document. If an existing API already owns a piece of state, integrate with it instead of creating a competing implementation. When a product requirement is ambiguous, stop and verify rather than silently choosing an architecture that can break existing behavior.
