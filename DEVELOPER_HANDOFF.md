# Ludo Live — Developer Handoff

## Read this first

Before changing production behavior, read `ARCHITECTURE.md`, `LEVEL_REWARDS.md` and this file. The project has several protected contracts. **Do not guess from screenshots, old code, or previous conversation context. Trace the current implementation first.**

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
10. When a product rule changes, update both `ARCHITECTURE.md` and this handoff document, plus the focused feature MD when one exists.

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

## Shared room voice / microphone

- `app/_components/ChatVoice.tsx` is the shared microphone/voice component. Do not create separate mic implementations per room unless a room has a proven different contract.
- Voice uses browser WebRTC through PeerJS `1.5.4`; Socket.IO remains the gameplay/room-state transport.
- The room owner is the voice roster hub. Non-owner peers announce themselves to the owner; the owner distributes discovered peer ids so direct audio calls can be established.
- Microphone access starts only from the player's Mic button and requires browser `getUserMedia()` permission. The component requires a secure context (`HTTPS`).
- A critical lifecycle rule is implemented: if a WebRTC call arrives before the local player enables the microphone, the call is stored as pending and answered when the local stream becomes available. Do not regress this by answering an incoming call with no stream.
- Remote streams are attached to hidden autoplay/playsinline audio elements and `play()` is attempted after the stream arrives.
- Turning the mic off stops local audio tracks. Component teardown closes connections, pending calls, the peer and remote audio elements.
- Mic/voice failures must surface a useful message instead of silently doing nothing.
- A green Mic button only means the local stream was acquired. It is **not** proof that a remote peer received audio; WebRTC/network/autoplay conditions are separate.
- Browser permission, HTTPS, NAT/firewall and autoplay policy can still prevent voice. Do not change gameplay code to compensate for a voice transport problem without tracing the actual voice path first.

## Tournament contracts

- Tournament intentionally uses the `classic` board skin unless explicitly changed by product requirements.
- Board state is isolated per tournament/player and restored from server-backed `ludo_tournament_board_sessions` using a private `board_token`.
- Server transaction is authoritative for wins/points; never award points only in React state.
- Tournament win recording is idempotent for a board session.
- Tournament game is intentionally viewport-locked/non-scrollable.
- Tournament medals/badges are earned rewards and are eligible for display in the Inventory Award Room.

## XP / progression contract

Read `LEVEL_REWARDS.md` for the complete reward ladder and implementation details.

- Every game win in **any game mode** = **+7 XP**.
- Every successful diamond purchase = **+15 XP**.
- XP awards are server-authoritative and duplicate-protected.
- Level-up animation fills the current XP bar, transitions to the next level, begins the new level's progress, and shows a congratulatory celebration for about 4 seconds.
- Use the existing progression refresh/event flow; do not create a second XP store.
- XP requirements continue without a hard-coded maximum level: `10 + (level × 5)`.
- Every level grants coins; every fifth level grants gems; every tenth level grants a real usable cosmetic plus a milestone badge.
- Milestone cosmetics come only from `lib/customization-catalog.ts` through the canonical shared table in `lib/levelRewards.ts`.
- A milestone cosmetic that the player already owns is never duplicated. The server instead grants its configured fallback gem compensation and records it in `ludo_level_rewards.compensation_gems`.
- Level reward grants and ownership/wallet mutations occur in the same PostgreSQL transaction and are idempotent on `(user_id, level)`.
- `app/_components/XPLevelCelebration.tsx` displays the actual unlock or already-owned compensation.
- `app/profile/page.tsx` displays the next meaningful milestone using `getNextMilestone()`.
- Do not claim a feature such as VIP, Ranked, Elite Rooms or Tournament qualification is unlocked unless there is a real server-side entitlement check for that feature.

## Level reward implementation map

- `lib/levelRewards.ts` — canonical milestone table and reward calculation shared by server/UI.
- `app/api/progress/route.ts` — authoritative XP calculation, level transition, reward ledger, wallet grant and customization ownership grant/compensation.
- `app/_components/XPLevelCelebration.tsx` — level-up reward presentation.
- `app/profile/page.tsx` — next-milestone preview.
- `app/api/customization/route.ts` — authoritative equip/ownership API used after a level cosmetic is granted.
- `lib/customization-catalog.ts` — authoritative catalogue containing the real board/dice/avatar IDs.
- `LEVEL_REWARDS.md` — full developer contract, ladder and duplicate/compensation rules.

## Free Spin / Active Time contract

Free spins are a server-authoritative player reward balance and are usable on the Spin Wheel.

- Every **30 minutes of active app time** grants **1 free spin**.
- Between **17:00 and 20:00 Nigeria time (`Africa/Lagos`)**, every completed 30-minute active interval grants **3 free spins** instead.
- Active time is accumulated only while the browser document is visible. The client sends a heartbeat approximately every 60 seconds; the server caps heartbeat deltas to prevent a long inactive gap from becoming active time.
- The authoritative activity/grant endpoint is `/api/spin/activity`.
- Spin balance and spin consumption are authoritative in PostgreSQL via `ludo_spin_state` and `/api/spin`.
- Free spins are not a wallet currency and must not be represented as coins or gems.
- `/profile` displays the current earned **Free Rolls** balance.
- `/spin` displays the current free-spin balance and lets the player consume it.
- When a grant occurs, the app shows an in-app congratulatory notification. If browser Notification permission is already granted, a browser notification is also sent.
- Do not treat a client timer as authoritative. The server decides when an interval is complete and how many spins are granted.
- Do not reset earned spins daily. Unused earned spins persist until consumed.
- The existing `extraSpin` wheel prize adds one additional spin to the server balance.
- Nigeria-time window logic must use `Africa/Lagos`; never use the developer/device timezone.

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

Main home cards are ordered:

1. Play Online
2. Tournaments
3. Play Solo
4. Friends

Inventory is a separate full-width card below the quick-access row. Do not duplicate Friends there.

Bottom navigation stays:

- Home
- Missions
- Chat
- Profile

Quick-access row stays Daily Reward / Shop / Events / Spin Wheel unless explicitly redesigned. Inventory is accessed through its full-width card instead of adding another bottom-nav item.

## Event contract

The Event system is server-authoritative. See `EVENTS.md` for the full lifecycle and implementation details.

### Player Event page

The player Event page intentionally has only:

- **Live Events**
- **Upcoming**

It must not expose History or Expired tabs unless product requirements explicitly change. Expired events remain server-side for Admin settlement/history but are not shown to players.

The page owns its single top Back button and passes `hideBack` to `AppFrame` so the shared shell does not render a duplicate Back control.

### Event lifecycle and authority

Admin-defined `startsAt` and `endsAt` are authoritative. Client countdowns are presentation only.

- Upcoming: start time is in the future.
- Live: start time has arrived and end time has not passed.
- Ended/settled: end time has passed and server settlement has completed.
- Cancelled: Admin cancelled the event.

Players may join only while the server evaluates the event as live.

### Event progress and rewards

Joined gameplay activity is evaluated server-side against the event's `mission_kind` and `mission_target`. Progress is capped at the target. Reaching the target records completion and `completed_at`.

At expiry, the settlement path locks the event, marks it ended, finds completed entries, inserts an idempotent reward ledger row, credits the configured coins/gems, marks `reward_claimed`, and records `settled_at`. The same event/player reward cannot be paid twice.

The production event-settler worker runs independently of the player Event page, so expiry and settlement do not depend on a user opening the page.

### Event UI progress bar

The progress fill must be a block-level element with explicit height and percentage width. Do not use a plain inline `<span>` for the fill. The current implementation uses `progressFill` with `display: block` and `height: 100%`, preventing a completed value such as `1/1` from displaying an empty bar.

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

Never accept a client-supplied user id for privileged admin, wallet, purchase, XP, ownership, tournament result or event reward mutations.

## Database authority

PostgreSQL is authoritative for accounts, wallets, customization ownership, progression, tournament stats/sessions, financial records, earned free-spin balances, event definitions, event participation and event reward settlement.

Do not use localStorage as the final authority for any server-owned financial, progression, ownership, tournament result, free-spin balance, event progress or event reward balance.

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
- [ ] Free-spin activity/grants remain server-authoritative.
- [ ] Event expiry/reward settlement remains server-authoritative and idempotent.
- [ ] Level reward grants remain server-authoritative and idempotent.
- [ ] Every level milestone points to a real usable catalogue item or a real configured future entitlement.
- [ ] Railway deployment reaches `SUCCESS`.
- [ ] If Railway fails, the actual build/deploy log was inspected.

## Historical mistakes to avoid

- Do not add fixed/floating admin buttons for Shop, Finance, Missions or Tournament Control; these belong in the hamburger.
- Do not omit Coin/Gem purchase packages from Admin Shop.
- Do not treat the Shop catalogue as the currency-package catalogue.
- Do not put purchases in Award Room.
- Do not render Award Room as a list; use the agreed grid.
- Do not use client-only XP, tournament scoring, free-spin balances or event rewards.
- Do not reset earned free spins every day.
- Do not calculate the 17:00–20:00 reward window using local device time; use Nigeria time on the server.
- Do not expose History/Expired tabs on the player Event page unless explicitly requested.
- Do not render an Event progress fill as an inline-only span; percentage width needs a block-level fill element.
- Do not claim deployment success while Railway is building, queued, failed, or otherwise not successful.
- Do not fix one TypeScript error by suppressing type checking; fix the type at its source.
- Do not treat a green Mic button as proof of remote audio delivery.
- Do not discard an incoming WebRTC call because the microphone is currently off; queue it and answer once the local stream exists.
- Do not add a level reward that is only a mock label. If it says unlocked, the player must own/use the real asset or the server must enforce the corresponding entitlement.

## Handoff rule

A future developer should be able to implement the next requested change from the repository documentation without needing a private conversation or screenshot. If the product changes, update the documentation in the same commit. If an implementation is unclear, inspect the repository/API/database first; **never guess**.
