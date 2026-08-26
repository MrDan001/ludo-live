# Avatar Performance & Loadout Fix

## Goals
- Show the administrator-provided avatar `name` in Loadout while retaining the canonical avatar ID internally.
- Avoid repeated avatar-catalogue requests across avatar surfaces.
- Preload the equipped avatar artwork after customization data is resolved.
- Keep avatar changes responsive when a player equips another store avatar.
- Preserve artwork quality and conservative background-removal behavior.

## Implementation contract
The avatar catalogue remains the source of truth. Renderers must receive canonical avatar metadata or a resolved canonical record; internal IDs, slugs, and filenames must never be used as player-facing names.

Image processing occurs at upload time. Rendering must only fetch the stored optimized artwork URL; it must not perform background removal or other expensive processing.

After an equip operation, the canonical equipped avatar ID is persisted server-side and the client should update its local canonical avatar state immediately, then preload the new artwork. Other surfaces consume that state rather than initiating independent catalogue fetches.

## Verification
- Loadout displays admin name.
- A/B/C avatar switching updates immediately.
- Profile, social, online-game profile/statistics, and game identity converge on the same avatar.
- Cached artwork is reused after the first successful load.
- No board/gameplay logic is changed.
