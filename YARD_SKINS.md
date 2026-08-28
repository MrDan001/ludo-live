# Yard Skins

Yard skins are cosmetic shop items that cover the four token-yard areas of the Ludo board.

## Shop

Yards are exposed by `app/api/shop/catalog.ts` as `type: "item"` entries with IDs beginning `yard-`.
This intentionally reuses the existing item purchase/equip pipeline, so the existing admin shop can price them with the same coins/gems/naira override system used by other shop items.

Current built-ins:

- `yard-classic`
- `yard-inferno`
- `yard-galaxy`
- `yard-royal`
- `yard-ocean`
- `yard-sakura`
- `yard-shadow`
- `yard-neon`

Players purchase a yard like any other item and equip it. The equipped yard is stored in the existing `equipped_items` JSONB field; only the first equipped `yard-*` item is used as the active yard skin.

## Board rendering

`app/_components/YardSkinOverlay.tsx` reads `/api/customization` and resolves the player's equipped `yard-*` item. It renders a non-interactive overlay beneath the token layers.

The overlay is wired into:

- `LudoBoardGame.tsx` — local/bot-style board rendering.
- `LudoBoardMultiplayer.tsx` — 2-player/4-player multiplayer board rendering.

Because bot-vs-human and tournament boards use the local board renderer, the human player's equipped yard is used there instead of a hard-coded bot/tournament yard.

## Important design rule

Yard skins are presentation-only. They do not modify token positions, movement rules, capture logic, turn state, or board geometry.
