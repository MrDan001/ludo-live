# Ludo Live — Developer Handoff

## Read this first

Before changing production behavior, read `ARCHITECTURE.md` and this file. The project has several protected contracts. **Do not guess from screenshots, old code, or previous conversation context. Trace the current implementation first.**

## Non-negotiable engineering rules

1. Inspect the current code path before editing.
2. Identify the authoritative server/API/database source of truth.
3. Reuse canonical engines/components/APIs instead of creating parallel implementations.
4. Keep financial, wallet, ownership, tournament and progression mutations server-authoritative.
5. Keep `/game` Bot-vs-Human as the protected known-good reference unless explicitly asked to change it.
6. Keep multiplayer/tournament viewport behavior intact unless a responsive redesign is explicitly requested.
7. After code changes, build and inspect Railway deployment logs.
8. Never call a change live until Railway reports `SUCCESS`.
9. When a deployment fails, fix the exact reported error before touching unrelated code.
10. When a product rule changes, update both `ARCHITECTURE.md` and this handoff document.

## Gameplay contracts

### Canonical board/rules

Use `lib/ludoRules.ts`, `lib/ludoEngine.ts`, `lib/canonicalLudoBoard.ts` and `CanonicalLudoBoard` rather than inventing another movement/geometry system.

Human team = Red + Yellow. Bot team = Green + Blue. Teammates cannot capture teammates.

Legal tokens are determined by canonical legal-move checks and passed as `legalTokenKeys`; do not make every token clickable and reject illegal moves afterward.

### Dice/audio

`DemoDice` owns the player roll-start event. `LudoAudio` is the canonical sound system.

One player `dice` sound per roll, at roll start. Do not trigger another player dice sound when the result appears. Bot paths may emit their own roll-start sound because bots do not click `DemoDice`.

Supported audio events: `dice`, `move`, `capture`, `safe`, `home`, `win`.

### Protected reference

`app/game/GameBoardContent.tsx` / `/game` is the Bot-vs-Human reference. Do not casually modify it while fixing multiplayer, tournament, Shop, Inventory, admin, or other pages.

## Multiplayer contracts

- `server.js` owns live Socket.IO room state.
- The multiplayer room uses the **host's equipped board skin**. A joining player's skin must not replace it.
- Player identity comes from the authenticated profile username, not generic labels when the profile exists.
- Seat/color mapping comes from the canonical engine.
- 2-player and 4-player views are designed to fit the device viewport without document scrolling.

## Tournament contracts

- Tournament intentionally uses the `classic` board skin unless explicitly changed by product requirements.
- Board state is isolated per tournament/player and restored from server-backed `ludo_tournament_board_sessions` using a private `board_token`.
- Server transaction is authoritative for wins/points; never award points only in React state.
- Tournament win recording is idempotent for a board session.
- Tournament game is intentionally viewport-locked/non-scrollable.
- Tournament medals/badges are earned rewards and are eligible for display in the Inventory Award Room.

## XP / progression contract

- Every game win in **any game mode** = **+7 XP**.
- Every successful diamond purchase = **+15 XP**.
- XP awards are server-authoritative and duplicate-protected.
- Level-up animation fills the current XP bar, transitions to the next level, begins the new level's progress, and shows a congratulatory celebration for about 4 seconds.
- Use the existing progression refresh/event flow; do not create a second XP store.

## Shop contract

### Player Shop

Player Shop categories are:

- Coins
- Gems
- Items
- Avatars
- Boards
- Dice

### Admin Shop

Admin Shop is accessed **only from the admin hamburger menu**. No floating/global Shop button belongs outside the admin page.

Admin can change **price only**. Supported payment currencies are:

- Coins
- Gems
- Naira

The Admin Shop must show and manage **Coin purchase packages and Gem purchase packages**, as well as customization items. Pricing changes must be server-backed and must be reflected by the player Shop and actual purchase flow.

Naira purchase credit must only occur after the existing payment provider verification succeeds.

Do not confuse the customization catalogue with currency packages. Both require authoritative pricing, but their purchase/fulfilment logic is different.

## Inventory contract

Home has a two-way split card with exactly these visible labels:

- **Friend** → `/friends`
- **Inventory** → `/inventory`

Do not add the previous explanatory copy or `OPEN` buttons back unless explicitly requested.

### My Items tab

Inventory/My Items shows **only items the authenticated player owns/acquired**. Use the existing customization ownership API. Do not show unowned Shop catalogue entries as owned inventory.

Owned/equipped state is server-backed. Equip actions must use the authoritative customization endpoint.

### Award Room tab

Award Room is inside Inventory and is strictly for **earned rewards**.

Examples:

- Tournament medals
- Tournament badges
- Achievement badges
- Earned event/competition rewards

Rules:

- Store purchases are **not** awards.
- Do not display store-purchase entries in Award Room.
- Read tournament awards from server-backed tournament/medal data.
- Do not fabricate awards in client state.
- Award Room uses a **responsive grid**, not a list.
- Earned awards are treated as permanent history unless a future product requirement explicitly changes that.

## Home navigation contract

Bottom navigation stays:

- Home
- Missions
- Chat
- Profile

Quick-access row stays Daily Reward / Shop / Events / Spin Wheel unless explicitly redesigned. Inventory is accessed through the Friend/Inventory split instead of adding another bottom-nav item.

## Admin contract

Admin management controls belong inside **one hamburger menu**. They must not appear as scattered floating buttons outside the admin page.

### Dashboard section

- Overview
- Players
- Economy
- Visitors
- Disputes
- Audit

### Management section

- Shop
- Missions
- Tournament Control
- Finance

Existing management components may stay mounted for state continuity, but their visible triggers are controlled by the hamburger. Server authorization must remain intact.

### Finance mobile rule

The Finance Server Top Up form must be mobile responsive. Do not force Currency / Amount / Reason / Top Up into a desktop-only row on narrow screens. Stack controls vertically/full-width on mobile while preserving validation, authorization and audit behavior.

## Authentication / server authority

Session cookie: `ludo_session`.

Server identity lookup: `lib/auth-session.ts`.

Never accept a client-supplied user id for privileged admin, wallet, purchase, XP, ownership or tournament mutations.

## Database authority

PostgreSQL is authoritative for accounts, wallets, customization ownership, progression, tournament stats/sessions and financial records. Socket.IO is authoritative for active multiplayer room state.

Do not use localStorage as the final authority for any server-owned financial, progression, ownership or tournament result.

## Responsive/UI discipline

- Avoid fixed desktop grids for mobile forms.
- Keep intended viewport game pages non-scrollable.
- Do not introduce duplicate navigation systems.
- Do not mount floating admin controls outside the admin shell.
- Preserve existing design language and API contracts unless the requested feature requires a deliberate redesign.

## Deployment discipline

The production source is `main` → Railway.

Before reporting a release as complete:

- [ ] Affected code was inspected before editing.
- [ ] `npm run build` / equivalent build passes.
- [ ] No protected `/game` regression was introduced.
- [ ] Financial and ownership mutations remain server-authoritative.
- [ ] Railway deployment reaches `SUCCESS`.
- [ ] If Railway fails, the actual build/deploy log was inspected.

## Historical mistakes to avoid

- Do not add fixed/floating admin buttons for Shop, Finance, Missions or Tournament Control; these belong in the hamburger.
- Do not omit Coin/Gem purchase packages from Admin Shop.
- Do not treat the Shop catalogue as the currency-package catalogue.
- Do not put purchases in Award Room.
- Do not render Award Room as a list; use the agreed grid.
- Do not use client-only XP or tournament scoring.
- Do not claim deployment success while Railway is building, queued, failed, or otherwise not successful.
- Do not fix one TypeScript error by suppressing type checking; fix the type at its source.

## Handoff rule

A future developer should be able to implement the next requested change from the repository documentation without needing a private conversation or screenshot. If the product changes, update the documentation in the same commit. If an implementation is unclear, inspect the repository/API/database first; **never guess**.
