# Ludo Live — Current Project State

**Last reviewed:** 2026-09-01
**Repository:** `MrDan001/ludo-live`
**Production:** Railway
**Production branch:** `main`

This file is the current developer-facing change ledger. It exists so future developers can see the latest verified direction without relying on screenshots, old conversation context, or guessing from duplicate/obsolete routes.

## 1. Admin Catalogue — canonical location

The Admin hamburger **Catalogue** section now intentionally contains only:

- **Shop** → `/dbase/shop`

The previously listed Catalogue links for `/dbase/boards`, `/dbase/dice`, `/dbase/avatars`, and `/dbase/yards` were removed from the Admin hamburger because the repository's current `main` tree does not contain those dedicated `page.tsx` routes. They were navigation entries, not four confirmed independent management implementations.

**Do not recreate separate Admin catalogue management pages unless explicitly requested.** The canonical Admin catalogue management surface is `/dbase/shop`.

The existing Shop screen already manages the catalogue groups and includes Add Avatar / yard-related management actions. Do not create a second Admin source of truth.

## 2. Admin Avatar creation contract

The Admin Shop's Add Avatar flow already supports the intended image input model:

- **Upload** — actual image file.
- **URL** — image URL.
- The admin chooses one mode at a time; Upload and URL are not submitted simultaneously.
- The existing Player Shop avatar structure/categories should remain the reference rather than inventing a second avatar schema.
- Avatar pricing supports the project's existing payment currencies: `coins`, `gems`, and `naira`.
- Avatar categories are part of the catalogue model.

**Important boundary:** this avatar pricing requirement does not change the purchase system of other Shop stock. Other products retain their existing purchase behavior.

## 3. Level / XP progression — current product rule

Player progression starts at **Level 1**.

Required XP from level `N` to `N + 1` remains:

`10 + (N × 5)`

The explicit product rule now is:

> **Do not carry remaining XP forward after a level-up. Reset XP to 0 for the new level.**

Therefore, if a player reaches or exceeds the current level's threshold, the server advances the level and starts the next level at `0 XP` rather than carrying the excess into the next level.

XP reward values must not be truncated or reduced to make this work. The existing server-authoritative XP reward system remains intact.

The level reward ledger remains idempotent by `(user_id, level)`, and already-owned milestone cosmetics continue to receive their configured gem compensation rather than duplicate ownership.

Recent progression commits:

- `91736553f9883cd609b33a5e053b17d5881a88f4` — reset XP at each level threshold.
- `3c09d626c1e55575dae96dd328563511a52934e4` — reset XP at each level threshold.
- `e9cd387ffd4899ef423f477c53f8c01d0194daad` — normalize over-limit XP before display.
- `5c3b8912e51d7bddb49b7ddca55b9dd92f9390a2` — normalize over-limit XP when the profile reads the account.
- `4d54e3561b374d4806d0fb0b1abc7d09f6abf3c9` — fix XP progress TypeScript build error.

The final successful XP deployment was confirmed by the user after the build-error correction.

## 4. Admin Events — current state

Admin Events is server-authoritative. `ludo_events.name` is required in the production schema while the Admin creation flow primarily works with the event title.

The creation path was corrected so new event records keep the compatibility fields synchronized:

- `name = title`
- editing keeps `name` synchronized with `title`

The event seed compatibility was also corrected so seed definitions provide the required `name` field.

Recent commits:

- `76fcea4b2b9dfa1cf8a0c9fba0935ecc44eb284e` — fix Admin event creation name compatibility.
- `1a999106e655b780cf4e50c403f4f6d4fd26de13` — fix event seed compatibility with required `name` column.

The red **Event admin unavailable** message was traced to the Admin Events GET path failing because an existing event row had `name = NULL` while `ludo_events.name` is NOT NULL. Do not treat an empty event list as an API failure.

Do not add fake events, delete event records, or reset event data as a workaround.

## 5. Tournament funding — Admin Finance is the source

Tournament funding was changed so the tournament funding logic uses the platform's virtual Admin Finance treasury/money-bank source rather than a separate or invented balance source.

The product requirement is:

> `/dbase/tournament` must use the funds represented by `/dbase/finance` for platform virtual in-game currency.

Coins/Gems are non-redeemable game currency. Do not reset balances, add fake currency, bypass insufficient-funds checks, or create a second platform wallet source.

Recent commits:

- `2e5f1f215ab390d9eb4c6a58995cfd8a3261e93f` — use Admin Finance virtual treasury for tournament funding.
- `ad311d993b151694ca7c126749fb94f8d949628e` — return unused tournament reserves to Money Bank.

The platform wallet source must remain aligned between Admin Finance display and tournament funding validation.

## 6. Wallet audit / server-authoritative accounting

Recent work added request metadata and identity resolution around wallet audit records. Wallet-changing operations remain server-authoritative and transactional.

Relevant recent commits include:

- `fdbd865102ffbd4efc133b5ec8157395f8c0800b` — shared wallet request metadata helper.
- `458f0cc0209ced35d8ae?` — weekly wallet audit request metadata fix. *(Historical commit reference should be checked against Git history before using it in tooling.)*
- `e61bf3015d8866302b7248067138f17c5849430a` — capture wallet IP/User-Agent for Spin rewards.
- `c37c2d639d91685e1c1d87c71d2995f4d53ef90e` — capture request metadata for daily wallet rewards.
- `8731bbfbf00fa4f92748e316b4c826266a6a9842` — capture request metadata for progress wallet rewards.
- `412ba0c8cca044295f721918bef5b2fbdd593374` — expose player identity in wallet audit records.
- `bb0b52924adb30aed67771ed1f5eda271a2552c2` — show resolved player identity in wallet audit.
- `9ef17ff16a5b79ad93b134944ac4c920293455ec` — complete wallet audit identity resolution.

**Note:** the weekly-audit SHA above is intentionally flagged because the repository history should be used as the authoritative value; do not copy a possibly mistyped SHA from documentation.

## 7. XP event idempotency

The XP event system was safely migrated/aligned around a composite idempotency key so repeated reward requests cannot duplicate XP.

Relevant commits:

- `64051b2b9f49cb2cfde650e389bf13be52438e18` — verify live `ludo_xp_events` constraints before migration.
- `d6ef34735647052caaa1049dcc86974cdadffc06` — align game-win XP events with composite idempotency key.
- `0fad49bf6672345a06fe6c2d6a6cc6e449b08032` — safely migrate `ludo_xp_events` to composite idempotency key.

## 8. Missions / Spin Wheel

Recent server-authoritative reward work includes:

- `5b17a44cc544eec957f03ca13eacba3a1bd1d8a6` — weekly mission claim persistence and server-side completion validation.
- `1d2a7c077e4f20a34b786e7bc3622c95baeec161` — Spin Wheel reward catalogue seeding.
- `e7ccfa750cff5b92c76d1f7f18cb02012c25923d` — Spin route build syntax correction.

Mission claims and wheel rewards must remain server-authoritative and idempotent. Do not truncate the XP reward system when changing progression.

## 9. Multiplayer / game-online recent state

Recent multiplayer work restored and aligned player metadata, turn state, room cleanup, chat and voice behavior.

Key recent commits:

- `e7ab069b46be989493594cf227fbf149c1093446` — sync turns and real player balances.
- `e420624afd644311a239adbf7d2f7fcb900cc948` — sync player metadata and turn state.
- `359e94317749799f9bcede994fb099f3a19e0d1a` — release stale room membership before switching rooms.
- `75c8840f36bd40a3b46a5c27f9d1e95f09a3e558` — synchronize voice peer IDs through room roster.
- `a82cab6b19d03ea27a1de05d62909bec0b1f4880` — use active room socket for voice signaling.
- `9df2d3efbe84f65cef511b10438a2325f5119fcf` — sync profile data and unread chat.
- `84290bc254ed828db564e1295579989ee7b3fac3` — use player avatar and level.
- `962d34bcef18dd72fa8f4199b434321f23c260b5` — show actual player names in header.
- `cddf757ca21ec6854cc58db2c47524137e8fb77b` — persist sent chat and enlarge board.
- `f56bb38b55bb992d45aaced56ed8aefb606db358` — fix game-online board positioning and quick-chat behavior.
- `1e5d421dfd00c719808b45da1ee45531692c243c` — restore last successful multiplayer page build.
- `6b83c6470128fd6ab6f55264de7d8fc473ad00d7` — keep ChatVoice socket backward-compatible.
- `ef796f11901c5f7ed0f8dce5f899b71c0a0ec2ce` — correct server metadata contract.

Do not casually refactor `/game` Bot-vs-Human while fixing multiplayer.

## 10. Admin Shop source of truth

The Admin Shop is `/dbase/shop` with server authority in the Admin Shop API and the shared PostgreSQL catalogue overrides.

Supported pricing currencies are:

- `coins`
- `gems`
- `naira`

The Player Shop and purchase APIs must consume the effective server catalogue. Naira purchases must use verified Paystack checkout; browser claims of successful payment are not authoritative.

Avatar management is part of this shared Shop surface. Other Shop stock must keep its existing purchase behavior even when avatar pricing supports multiple payment modes.

## 11. Current Admin navigation rule

The Admin hamburger Catalogue is intentionally:

```text
CATALOGUE
└── Shop → /dbase/shop
```

Do not restore Boards/Dice/Avatars/Yards as separate Catalogue navigation entries unless a future product decision explicitly creates independent management pages.

## 12. Deployment discipline

Railway is production. `main` is the production branch.

After every production code change:

1. Build/type-check the affected code.
2. Inspect the Railway deployment.
3. If the build fails, fix the exact reported error before touching unrelated code.
4. Do not call a release successful until Railway reports `SUCCESS`.
5. For critical behavior, perform the actual production request/action rather than relying only on compilation.

## 13. Documentation rule for future developers

When a product rule or architecture contract changes, update:

- `ARCHITECTURE.md`
- `DEVELOPER_HANDOFF.md`
- the focused feature document (`LEVEL_REWARDS.md`, `EVENTS.md`, `SHOP_PRICING.md`, etc.) when applicable
- this `CURRENT_PROJECT_STATE.md` ledger

Never rely on a conversation transcript as the project's only source of truth.
