# Ludo Live — Current Project State

**Last reviewed:** 2026-09-03
**Repository:** `MrDan001/ludo-live`
**Production backend:** Railway
**Production branch:** `main`
**Web frontend:** Next.js application; Vercel deployment integration is present in the repository.

This file is the authoritative current-state ledger. It records verified implementation direction and important recent changes. Do not infer production behavior from screenshots, stale branches, or old conversation context.

## 1. Admin catalogue — canonical location

The Admin hamburger **Catalogue** section intentionally contains only:

- **Shop** → `/dbase/shop`

Do not recreate separate Boards, Dice, Avatars, or Yards catalogue pages unless explicitly requested. The Shop is the canonical catalogue-management surface.

## 2. Admin missions — Daily + Weekly

The Admin Missions page is:

- `/dbase/missions`

It now has two management tabs:

- **Daily** — existing daily missions are preserved and editable.
- **Weekly** — existing weekly missions are preserved and editable.

Both tabs use the server-backed Admin Mission APIs and persist changes. The player-facing mission system remains server-authoritative; editing a mission in Admin must not silently replace or reset the existing mission catalogue.

Relevant API surfaces include:

- `/api/admin/missions`
- `/api/admin/missions/weekly`
- `/api/missions`
- `/api/missions/weekly`

Do not restore the old single-tab-only assumption or discard existing mission records when changing the Admin UI.

## 3. Admin browser-dialog UX

Native browser dialogs are not the intended product UX.

The shared `LudoConfirmModal` is the standard branded confirmation/error surface. The Online Multiplayer leave-match confirmation and Shop/Paystack initialization errors were migrated away from native `window.confirm()` / `alert()` behavior.

Future player/admin flows should use the project's branded modal/toast patterns rather than introducing `alert`, `confirm`, or `prompt`.

## 4. Admin Avatar creation contract

The Admin Shop Add Avatar flow supports:

- **Upload** — actual image file.
- **URL** — image URL.
- one input mode at a time.
- pricing in the project's supported currencies: `coins`, `gems`, and `naira`.
- catalogue categories.

The existing Shop/avatar model is the source of truth. Do not invent a second avatar schema.

## 5. Level / XP progression

Player progression starts at **Level 1**.

Required XP from level `N` to `N + 1` remains:

`10 + (N × 5)`

Current product rule:

> **Do not carry remaining XP forward after a level-up. Reset XP to 0 for the new level.**

Level rewards remain idempotent by `(user_id, level)`. Already-owned milestone cosmetics receive their configured gem compensation rather than duplicate ownership.

The XP reward system remains server-authoritative and must not be weakened by client-side changes.

## 6. Admin Events

Admin Events is server-authoritative. The production event model requires the compatibility field `name`; event creation/editing keeps `name` synchronized with the event title.

Do not use an empty event list as proof that the API is unavailable, and do not delete/reset event data as a workaround for schema compatibility problems.

## 7. Tournament funding / Admin Finance

Tournament funding uses the platform's Admin Finance virtual treasury/money-bank source rather than an unrelated balance.

The intended relationship is:

`/dbase/finance` → platform virtual treasury → `/dbase/tournament` funding validation

Tournament lifecycle is automatic:

`UPCOMING → LIVE → ENDED`

The server must validate entry/prize funding against the same treasury source displayed by Admin Finance. Do not bypass insufficient-funds checks, create a second treasury, or fabricate currency.

## 8. Wallet audit / server-authoritative accounting

Wallet changes must remain server-authoritative and transactional. The wallet-audit path supports request metadata and player identity resolution.

The intended audit contract is to record, where available:

- source
- reason
- request / transaction identifier
- actor / resolved player identity
- balance before
- balance after
- IP address
- user agent

Older records may contain `unknown` or missing metadata because they were written before the audit improvements. Do not treat those historical records as proof that new wallet paths may omit metadata.

Relevant implementation surfaces include `app/api/lib/wallet-audit.ts`, wallet APIs, reward APIs, Paystack fulfillment, Spin rewards, mission claims, and Admin wallet operations.

## 9. Missions / Spin rewards

Mission claims and Spin rewards are server-authoritative and must be idempotent.

Spin reward handling supports the project's reward/inventory flow. Shop-item rewards can unlock inventory items without requiring a normal purchase. Free rewards must not be incorrectly blocked by Shop purchase-level rules.

## 10. Shop / pricing

The Admin Shop is `/dbase/shop`. Supported pricing currencies include:

- `coins`
- `gems`
- `naira`

Player purchase APIs consume the effective server catalogue. Naira checkout uses verified Paystack server flows; client-side claims of payment success are not authoritative.

For level-locked Shop items:

- below the required level, show the lock/unlock requirement and do not expose the protected purchase price as an unlocked price;
- at the required level, the item becomes purchasable;
- free Spin rewards bypass purchase-level locks because they are rewards, not purchases.

## 11. Multiplayer architecture

The repository contains canonical multiplayer board/authority modules and the online multiplayer page:

- `/game-online`
- `app/game-online/OnlineMultiplayerGame.tsx`
- `app/game/MultiplayerGameCanonical.tsx`
- `app/_components/CanonicalLudoBoard.tsx`
- `lib/onlineLudoAuthority.js`
- `lib/multiplayerMove.js`
- `lib/canonicalLudoBoard.ts`
- `lib/canonicalLudoBoard.invariants.ts`

Server/authority code is the source of truth for legal movement and match state. Client animation must represent authoritative state; it must not independently award currency, XP, or match outcomes.

Known multiplayer engineering concerns include correct capture sequencing, token yard/home state, turn synchronization, room membership cleanup, and animation synchronization. These areas should be regression-tested rather than patched by adding client-only state.

## 12. In-game chat, voice and avatar sync

The multiplayer UI contains dedicated communication components including `ChatVoice.tsx`, `InGameComms.tsx`, `MultiplayerChatOverlay.tsx`, and social overlays.

Voice signaling uses the active room/socket roster. Chat and unread state are persisted through the existing player/social infrastructure.

Player identity shown during multiplayer should use the player's current profile data. Equipped avatar rendering should remain synchronized with the player's currently equipped profile avatar rather than using a stale hard-coded avatar.

The intended mobile presentation is portrait-first and should preserve board visibility without making the communication controls overwhelm the game surface.

## 13. Notifications

Browser notification permission alone is not proof that registration succeeded. Notification subscription/registration remains a separate server-backed step.

Do not reintroduce global schema initialization inside request handlers. Database preparation/migration belongs in deployment/setup tooling.

## 14. Authentication and Admin shell

Admin authentication is separate from the normal player shell. Protected Admin routes remain under `/dbase` and Admin APIs.

Login/register password fields use the project's show/hide password control. The Admin hamburger/navigation should not be exposed as an authenticated management surface before the Admin gate is satisfied.

## 15. Current Admin route map

Core Admin surfaces include:

- `/dbase`
- `/dbase/players`
- `/dbase/economy`
- `/dbase/visitors`
- `/dbase/audit`
- `/dbase/shop`
- `/dbase/spin`
- `/dbase/missions`
- `/dbase/events`
- `/dbase/tournament`
- `/dbase/finance`
- `/dbase/support`
- `/dbase/players-audit`
- `/dbase/wallet-audit`

The route implementation in the repository is authoritative. A design document describing a route that is not present should be treated as specification/history, not as proof that the route is currently implemented.

## 16. Deployment discipline

Railway remains the production backend deployment. The repository also contains Vercel deployment integration for the web application.

After every production code change:

1. Build/type-check the affected code.
2. Inspect the relevant deployment.
3. Fix the exact reported build/runtime error before touching unrelated code.
4. Do not call a release successful until the deployment reports success.
5. For critical behavior, perform the actual production request/action instead of relying only on compilation.

## 17. Documentation reconciliation — 2026-09-03

The Markdown set is being maintained as a documentation system rather than a collection of isolated historical notes.

Rules:

- `CURRENT_PROJECT_STATE.md` is the current-state ledger.
- `ARCHITECTURE.md` is the technical architecture contract.
- `DEVELOPER_HANDOFF.md` explains safe production change discipline.
- Focused feature documents remain detailed contracts for their own systems.
- Historical incident documents remain useful for explaining why safeguards exist, but must not be read as current implementation claims unless they explicitly say so.
- Specifications such as `ADMIN_REBUILD_SPEC.md` preserve product/design requirements; implemented behavior must be verified against the current code.
- When a feature changes, update both its focused document and this ledger.

## 18. Do-not-regress list

Do not:

- restore native `alert`, `confirm`, or `prompt` for product UX;
- discard existing Daily/Weekly mission records while changing Admin mission UI;
- create a second Admin Shop/catalogue source of truth;
- award XP, currency, or match outcomes from client-only state;
- bypass Admin Finance treasury validation for tournaments;
- create fake currency to solve an accounting error;
- hide wallet-audit metadata by replacing unknown values with fabricated values;
- treat browser payment success as authoritative;
- reintroduce global database initialization in request handlers;
- casually refactor unrelated multiplayer implementations while fixing a specific online-game defect.

## 19. Future documentation updates

Whenever a production contract changes, update:

1. this file;
2. `ARCHITECTURE.md`;
3. `DEVELOPER_HANDOFF.md`;
4. the relevant focused feature document;
5. any incident/history document whose conclusions are no longer accurate.

Never rely on a conversation transcript as the project's only source of truth.
