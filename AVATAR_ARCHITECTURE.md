# Ludo Live — Avatar Architecture

## Purpose

This document defines the production avatar contract. All avatar surfaces must resolve the same authoritative avatar record and render the same processed artwork. Do not create page-specific avatar catalogues, hard-coded avatar paths, or alternate image-processing pipelines.

## Single source of truth

The authoritative avatar catalogue is the server-backed customization/avatar system. The equipped avatar ID belongs to the player's customization state. UI components may cache data for display, but they must not invent or permanently override the equipped avatar.

The same resolved avatar must drive:

- Admin Avatar Management preview
- Shop avatar cards
- Inventory / owned avatars
- Profile
- Player Showcase
- Online Game waiting room
- Online Game player identity cards
- Online Game full Profile / Statistics panel
- In-game/social player identity surfaces

If a multiplayer payload contains a stale or generic avatar while authoritative player data contains a real equipped catalogue avatar, the authoritative equipped avatar wins.

## Artwork pipeline

Uploaded artwork follows this lifecycle:

`Upload → validate → background processing → normalize → store → database URL → render`

The production processor is implemented in `lib/avatar-background.ts` using Sharp.

### Background removal contract

Background removal must be conservative. The processor must preserve the subject's internal colors, outlines, clothing, skin tones, facial details and accessories.

The current strategy:

1. Preserve existing meaningful transparency instead of reinterpreting an already-transparent asset.
2. Estimate the background from border samples.
3. Remove only border-connected pixels that are sufficiently close to the estimated border background.
4. Do not globally delete a color merely because it resembles the background.
5. Trim only transparent outer whitespace after processing.
6. Normalize the resulting artwork onto a transparent square canvas.
7. Output PNG with alpha transparency.

A failed or low-confidence processing result must never silently destroy the source artwork. The original upload should remain recoverable until the processed asset has been successfully validated and stored.

## Image requirements

Avatar uploads should be validated before processing and storage:

- Supported raster image formats only.
- Enforce a server-side file-size limit.
- Enforce reasonable pixel/dimension limits to prevent oversized processing jobs.
- Generate safe storage names; never use an arbitrary user-supplied filename as a storage path.
- Store processed artwork as a stable URL/reference rather than embedding image data in React components.
- Permanently deleting an avatar must also clean up its stored processed asset when that asset is no longer referenced.

## Rendering contract

Avatar artwork is transparent. The UI renderer is responsible for the circular presentation.

Use the canonical avatar renderer for player/avatar identity surfaces whenever the component supports it. Do not duplicate `object-fit`, border-radius, clipping, padding, sizing, or fallback logic in individual pages.

The avatar image must remain visually circular at every supported size. The artwork itself must not be forced into a circular crop that cuts off the subject; the transparent square canvas is the normalization boundary, while the UI circle is the presentation boundary.

### Important surface

The Online Game flow contains a full player Profile / Statistics panel opened by selecting the player's profile. This panel is an avatar surface and must use the same canonical avatar source and renderer as Profile, Player Showcase and the waiting-room identity cards. It must not maintain a separate profile-picture URL, placeholder, crop rule or avatar catalogue.

## Admin Avatar Manager

Admin Avatar Management controls the catalogue record:

- image upload/replacement
- avatar name
- category
- description
- rarity
- price
- currency (`naira`, `coins`, `gems`)
- publish/unpublish
- preview
- edit
- hide/show
- delete
- reorder

Categories are data-driven and may include Classic, Heroes, Royal, Fantasy, Sports, Animals, Funny, Seasonal and Limited. The player Shop filters from the same category records.

## Purchase and equip flow

The complete authoritative flow is:

`Admin → Avatar catalogue → Shop → purchase → ownership → equip → customization state → Profile/Showcase/Game`

Purchase mutations remain server-authoritative. The client must not credit wallet balances or create ownership records locally.

## Adding a new avatar

A developer should not add a new avatar by editing a React component or adding a hard-coded image path.

1. Open Admin Avatar Management.
2. Create the avatar record.
3. Upload the artwork.
4. Let the server validate/process/normalize the image.
5. Set name, category, description, rarity, price and currency.
6. Preview the processed transparent artwork.
7. Publish it.
8. Confirm it appears in Shop and can be purchased.
9. Confirm ownership and Equip update the authoritative customization state.
10. Confirm the same artwork appears in Profile, Player Showcase, Online Game waiting room and the Online Game full Profile / Statistics panel.

## Verification checklist

For every avatar-rendering change, verify:

- [ ] Artwork background is transparent without removing subject details.
- [ ] Artwork is centered and not excessively padded.
- [ ] Circle renderer remains perfectly round.
- [ ] Shop displays the same authoritative avatar.
- [ ] Profile displays the same authoritative avatar.
- [ ] Player Showcase displays the same authoritative avatar.
- [ ] Online waiting room displays the same authoritative avatar.
- [ ] Online Game identity cards display the same authoritative avatar.
- [ ] Online Game full Profile / Statistics panel displays the same authoritative avatar.
- [ ] Stale multiplayer cosmetic fields cannot overwrite an authoritative equipped avatar.
- [ ] Existing six/current avatars remain functional.
- [ ] No deleted legacy atlas/30-avatar assets are reintroduced.
- [ ] Avatar changes do not alter Ludo board geometry or gameplay rules.
- [ ] Railway reports `SUCCESS` before a release is considered live.
