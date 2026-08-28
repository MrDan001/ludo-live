# Ludo Live — Admin Dashboard Fresh-Rebuild Specification

## Purpose

Rebuild the Admin area from a clean foundation without losing any existing Admin functionality, configuration, data, or business rules. The new Admin area must be a true full-page responsive dashboard, not a collection of floating/modal management panels.

The Admin rebuild is a **UI/architecture rebuild**, not a reset of the underlying game, Shop, player, economy, rewards, support, tournament, mission, event, or audit information.

---

# 1. Non-Negotiable Requirements

1. Preserve all existing Admin capabilities and information.
2. Do not delete or reset existing Shop catalogue data.
3. Do not delete or reset existing player data, balances, inventory, levels, XP, or history.
4. Do not delete or reset Spin Wheel configuration or Spin Reward history.
5. Do not delete or reset Boards, Dice, Avatars, Yards, or Backgroundless artwork.
6. Do not delete missions, events, tournaments, disputes, finance records, support records, visitor/analytics information, or audit information.
7. Keep existing APIs/database contracts where possible; improve them only when required for correctness/security.
8. Admin-only operations must remain protected server-side. Hiding a button is not security.
9. The Admin UI must be responsive from small mobile screens upward.
10. No horizontal scrolling caused by the Admin UI.
11. No management component may appear as an unrelated floating panel over another Admin page.
12. Every management section must have its own real Admin route/page.
13. The global Admin shell must contain navigation only; management content belongs to the active page.
14. The hamburger must never appear before Admin authentication has been positively established.
15. The hamburger must belong visually to the authenticated Admin dashboard/header, not float outside the application shell.
16. Support must be a dedicated Admin page.
17. Login and Register password fields must have a show/hide eye control.

---

# 2. Authentication & Admin Shell

## Admin authentication flow

```text
Admin URL
   ↓
Authentication check
   ↓
Loading state only
   ↓
Is authenticated and authorized as Admin?
   ├── No → Admin login / redirect
   └── Yes
        ↓
   Mount Admin shell
        ↓
   Show navigation + dashboard
```

### Before authentication completes

Show only a clean loading/authentication state.

Do **not** render:
- hamburger
- Admin navigation
- Support navigation
- management controls
- Admin dashboard content
- Admin-only floating buttons

### After authentication succeeds

Mount the complete Admin shell.

### Authorization

Admin authorization must be checked server-side for every protected API/action. Client-side role checks are for presentation only.

---

# 3. Admin Shell / Layout

The shell should be consistent across all Admin pages.

## Desktop

```text
┌──────────────────────────────────────────────────────┐
│ 🛡️ LUDO LIVE ADMIN                 Admin • Logout    │
├───────────────┬──────────────────────────────────────┤
│ Dashboard     │                                      │
│ Players       │                                      │
│ Economy       │          ACTIVE PAGE CONTENT         │
│ Shop          │                                      │
│ Spin Wheel    │                                      │
│ Yards         │                                      │
│ Avatars       │                                      │
│ Boards        │                                      │
│ Dice          │                                      │
│ Missions      │                                      │
│ Events        │                                      │
│ Tournament    │                                      │
│ Finance       │                                      │
│ Support       │                                      │
│ Disputes      │                                      │
│ Visitors      │                                      │
│ Audit         │                                      │
└───────────────┴──────────────────────────────────────┘
```

## Mobile

Use a compact header and a drawer/navigation sheet that is part of the authenticated Admin shell.

```text
┌──────────────────────────────┐
│ ☰  ADMIN        👤           │
├──────────────────────────────┤
│                              │
│       ACTIVE PAGE            │
│                              │
└──────────────────────────────┘
```

The hamburger is inside the header, not `position: fixed` outside the dashboard experience.

Navigation closes after selecting a page.

---

# 4. Admin Routes

Every section is a dedicated full page.

- `/dbase` — Admin Dashboard / Overview
- `/dbase/players` — Players
- `/dbase/economy` — Economy
- `/dbase/visitors` — Visitors / Analytics
- `/dbase/disputes` — Disputes
- `/dbase/audit` — Audit Log
- `/dbase/shop` — Shop Management
- `/dbase/boards` — Board Management
- `/dbase/dice` — Dice Management
- `/dbase/avatars` — Avatar Management
- `/dbase/yards` — Yard Management
- `/dbase/spin` — Spin Wheel Management
- `/dbase/missions` — Mission Management
- `/dbase/events` — Event Management
- `/dbase/tournament` — Tournament Control
- `/dbase/finance` — Finance
- `/dbase/support` — Support

No route should mount every management component at the same time.

---

# 5. Admin Dashboard / Overview

Provide a clean summary, not a wall of controls.

## Summary cards

- Total players
- Online players
- New players
- Total coins in circulation
- Total gems in circulation
- Shop sales / purchases
- Active tournaments
- Active events
- Open support tickets
- Open disputes

## Operational panels

- Recent players
- Recent purchases
- Recent Spin rewards
- Recent support activity
- Recent admin/audit activity
- Low-stock / unavailable Shop assets where applicable
- Important system alerts

Each summary card should link to its dedicated page.

---

# 6. Players

Admin can view and manage player accounts without exposing unrelated controls.

## Information

- Player name / username
- Email where available
- Account status
- Level
- XP
- Coins
- Gems
- Inventory
- Purchased items
- Spin rewards
- Spin reward history
- Account creation date
- Last activity
- Relevant gameplay/account statistics

## Management

- Search
- Filter
- Sort
- Open player details
- Review inventory
- Review transaction/economy history
- Review reward history
- Appropriate account-management actions already supported by the system

Dangerous actions require confirmation.

---

# 7. Economy

Provide a dedicated economy overview and controls.

Track:
- Coins
- Gems
- Rewards
- Purchases
- Spending
- Grants where supported
- Economy activity

Do not expose destructive controls without confirmation and audit logging.

---

# 8. Shop Management

Admin must manage the complete Shop catalogue.

## Item fields

- Item name
- Item type
- Description where supported
- Image/artwork
- Price
- Currency
- Rarity
- Published/unpublished status
- Level requirement
- Require level to unlock
- Unlock level
- Ownership/availability state where supported

## Supported item categories

- Boards
- Dice
- Avatars
- Yard backgrounds
- Backgroundless yard artwork
- Other Shop items

## Actions

- Add
- Edit
- Publish
- Unpublish
- Delete where supported
- Configure price
- Configure currency
- Configure rarity
- Configure level requirement

---

# 9. Level-Locked Shop Items

Level locking is a **purchase restriction**, not a restriction on receiving an item as a Spin reward.

## Admin controls

Every applicable Shop item must support:

```text
Require level to unlock: ☑
Unlock at Level: 10
```

## Player below required level

Example: item requires Level 10, player is Level 7.

Show:

```text
🔒 Locked
Unlocks at Level 10
```

Do not show the actual price.

Player cannot:
- purchase it
- submit a purchase through the UI
- bypass the restriction through a direct API request

The server must validate the level before purchase.

## Player reaches required level

At Level 10:

```text
🔓 Unlocked
Price visible
Purchase available
```

## Level-up notification

When a level-up causes new Shop items to become purchasable:

```text
🎉 New Items Unlocked!
You've reached Level 10!
🔓 3 new Shop items are now available.
View Shop
```

If five items unlock at the same level, report five.

Do not show the notification repeatedly for the same unlock event.

---

# 10. Spin Wheel Management

The Admin must have complete control of the Spin Wheel.

## Reward types

- Coins
- Gems
- Extra spins
- Shop items
- Any other supported reward type

## Admin actions

- Add reward
- Edit reward
- Delete reward
- Enable reward
- Disable reward
- Change label
- Change icon
- Change amount
- Change probability/weight
- Change linked Shop item
- Configure active/inactive status

## Shop item rewards

Admin can select any eligible published Shop catalogue item as a Spin reward, including:

- Board
- Dice
- Avatar
- Yard background
- Backgroundless artwork
- Other Shop item

The wheel should use configured probability/weight values when selecting rewards.

## Important

Spin configuration must not be append-only. Existing rewards must be editable and deletable.

---

# 11. Spin Rewards — Player System

When a player wins a Shop item from the Spin Wheel:

```text
🎡 Spin
   ↓
Shop item won
   ↓
🔓 Automatically unlocked / free
   ↓
🎁 Spin Rewards
   ↓
Claim
   ↓
🎒 Inventory
```

The player does not pay.

The item does not require the player's Shop level requirement to be met.

Level locking applies to normal purchasing only.

Do not add a `🆕` Shop tag for Spin winnings.

The item is simply:

```text
🔓 Unlocked
Free / Owned
```

---

# 12. Spin Rewards — Claim Tab

Show all Spin Shop items won but not yet claimed.

Each reward should show:

- Item image/icon
- Item name
- Item type
- Date won
- Claim button

Button:

```text
CLAIM
```

On claim:

1. Add item to player Inventory.
2. Remove it from the pending Claim list.
3. Permanently record the claim.
4. Add it to Spin Reward History.
5. Prevent duplicate claiming.

The operation should be transactional/idempotent server-side.

---

# 13. Spin Reward History

Dedicated second tab on the player's Spin Rewards page.

Record permanently:

- Item name
- Item type
- Item identifier where applicable
- Date won
- Date claimed
- Relevant reward/spin identifier where available

History must survive refresh, logout/login, and future sessions.

---

# 14. Boards

Dedicated Admin page for board catalogue management.

Support existing board information and actions, including:

- Upload artwork
- Preview
- Name
- Description
- Price
- Currency
- Rarity
- Published status
- Level requirement
- Edit
- Delete

Do not lose existing board records while rebuilding the UI.

---

# 15. Dice

Dedicated Admin page.

Support:

- Upload/manage dice artwork
- Name
- Description
- Price
- Currency
- Rarity
- Published status
- Level requirement
- Edit
- Delete
- Preview

---

# 16. Avatars

Dedicated Admin page.

Support:

- Avatar artwork
- Name
- Description
- Price
- Currency
- Rarity
- Published status
- Level requirement
- Edit
- Delete
- Preview

---

# 17. Yards

Dedicated Admin page.

Support both:

- Yard background artwork
- Backgroundless yard artwork

Admin must be able to see uploaded assets in the catalogue and manage them.

Support:

- Upload
- Preview
- Name
- Description
- Price
- Currency
- Rarity
- Published status
- Level requirement
- Edit
- Delete

Uploaded artwork must persist correctly and be available to the Shop system.

---

# 18. Missions

Dedicated Admin page.

Admin should be able to manage existing Mission functionality without losing data.

Where supported:

- Create
- Edit
- Enable/disable
- Delete
- Configure objectives
- Configure rewards
- Configure duration/status
- View progress/claim state where applicable

---

# 19. Events

Dedicated Admin page.

Manage existing event functionality.

Where supported:

- Create
- Edit
- Publish/unpublish
- Start/end configuration
- Rewards
- Requirements
- Status
- Delete

---

# 20. Tournament Control

Dedicated Admin page.

Preserve existing tournament administration.

Where supported:

- Tournament creation
- Configuration
- Entry settings
- Rewards
- Scheduling
- Status
- Participant information
- Start/end/control actions

---

# 21. Finance

Dedicated Admin page.

Preserve existing finance information and controls.

Include, where already supported:

- Purchases
- Revenue
- Expenses
- Transactions
- Currency movement
- Filters
- Date ranges
- Player references
- Transaction status
- Audit information

Do not destroy historical transaction records during the UI rebuild.

---

# 22. Support

Support must be a **real Admin page**, not a floating panel.

Route:

`/dbase/support`

Include existing support functionality and information, such as:

- Open tickets/conversations
- Closed tickets/conversations
- Player identity
- Ticket subject
- Message history
- Status
- Priority where supported
- Created date
- Updated date
- Admin replies
- Resolve/close actions

Support navigation belongs inside the authenticated Admin navigation.

---

# 23. Disputes

Dedicated page for existing dispute information.

Include:

- Open disputes
- Resolved disputes
- Player information
- Related transaction/game information
- Evidence/details where supported
- Status
- Resolution
- Dates
- Audit trail

---

# 24. Visitors / Analytics

Dedicated page for existing visitor/analytics information.

Where supported include:

- Visitors
- Active users
- New users
- Traffic/activity trends
- Date filters
- Relevant device/platform information
- Other existing analytics

Use responsive charts/tables that do not overflow on mobile.

---

# 25. Audit Log

Dedicated Admin audit page.

Record sensitive Admin actions, including where applicable:

- Shop changes
- Price changes
- Level requirement changes
- Spin Wheel changes
- Reward deletion
- Reward enable/disable
- Asset deletion
- Finance/admin actions
- Support actions
- Player account actions

Include:

- Admin identity
- Action
- Target
- Timestamp
- Relevant before/after information where supported

---

# 26. Login / Register

The account authentication pages must remain separate from the Admin shell.

Password fields must include:

```text
Password        ••••••••  👁️
```

Tapping the eye toggles:

- hidden password
- visible password

Register must support the same for:

- Password
- Confirm password

The Admin hamburger must never appear on Login/Register.

---

# 27. Mobile-First UI Rules

The Admin system must be designed for mobile first.

## Required behavior

- No horizontal page scrolling.
- No clipped buttons.
- No overflowing tables.
- Cards stack vertically when needed.
- Forms use one column on small screens.
- Buttons remain tappable.
- Inputs fit the viewport.
- Navigation drawer fits the viewport.
- Modals, if any are genuinely necessary, fit the viewport.
- Long content can scroll inside the page naturally.
- Tables should become cards or use controlled horizontal scrolling only where unavoidable.
- Text must wrap rather than force the page wider.
- Images use responsive sizing.
- Controls have adequate touch targets.

## Mobile layout principle

```text
Header
  ↓
Page title
  ↓
Short description
  ↓
Primary action
  ↓
Filters/search
  ↓
Content cards/list
  ↓
Pagination / continuation
```

Do not cram multiple unrelated forms into one screen.

---

# 28. Desktop UI Rules

Use the available width without making the page visually crowded.

- Consistent content max-width
- Clear page header
- Consistent card components
- Consistent spacing
- Clear section hierarchy
- Consistent button styles
- Consistent form controls
- Tables only where they improve usability

Avoid huge walls of controls.

---

# 29. Navigation Rules

Primary navigation should contain:

### Dashboard
- Overview
- Players
- Economy
- Visitors
- Disputes
- Audit

### Game / Shop Management
- Shop
- Boards
- Dice
- Avatars
- Yards
- Spin Wheel

### Engagement
- Missions
- Events
- Tournament

### Operations
- Finance
- Support

Navigation may be grouped/collapsible on mobile, but every destination remains a separate page.

---

# 30. Floating UI Prohibition

The following must **not** be mounted globally as floating management components:

- Shop Manager
- Yard Manager
- Avatar Manager
- Spin Manager
- Mission Manager
- Event Manager
- Tournament Manager
- Finance Manager
- Support Manager

The Admin layout must not instantiate all of these simultaneously.

Instead:

```text
Admin Shell
   ├── Navigation
   └── Active route
        └── One management page
```

This prevents one management screen from visually floating over another page.

---

# 31. Data Preservation

A fresh Admin UI does **not** mean a fresh database.

Before removing/replacing existing Admin components:

- Keep database tables/collections.
- Keep API endpoints unless replacement is fully compatible.
- Keep Shop item IDs.
- Keep player IDs.
- Keep inventory records.
- Keep Spin reward IDs/history.
- Keep transactions.
- Keep support records.
- Keep mission/event/tournament records.
- Keep asset references.
- Keep upload/storage references.
- Keep audit records.

Only replace presentation and routing where possible.

---

# 32. Server-Side Security

Every Admin API must independently verify Admin authorization.

Every purchase endpoint must independently verify:

```text
Published?
Correct item?
Player authenticated?
Level requirement satisfied?
Sufficient currency?
Already owned?
```

Spin reward claiming must independently verify:

```text
Authenticated player?
Reward belongs to player?
Reward is pending?
Not already claimed?
```

Never trust client-provided:

- Price
- Currency amount
- Player level
- Ownership
- Reward ownership
- Admin role
- Claim status

---

# 33. Level Lock + Spin Reward Interaction

This behavior is mandatory.

### Example

Player Level 5.

Board requires Level 10.

Normal Shop:

```text
🔒 Locked
Unlocks at Level 10
Price hidden
Cannot buy
```

Player spins and wins the same board:

```text
🎡 Spin
↓
🎨 Board won
↓
🔓 Unlocked / Free
↓
🎁 Spin Rewards
↓
CLAIM
↓
🎒 Inventory
```

The player does **not** need Level 10.

The player does **not** pay.

The level requirement remains a restriction on normal Shop purchase.

---

# 34. Visual Design Direction

The new Admin should feel like one polished product.

Use:

- Consistent dark dashboard styling matching Ludo Live.
- Clear hierarchy.
- Generous spacing.
- Rounded cards used intentionally.
- Consistent icons.
- Consistent typography.
- Clear primary/secondary/danger actions.
- Strong mobile alignment.

Avoid:

- Random floating windows.
- Excessive borders.
- Huge forms.
- Multiple unrelated panels visible simultaneously.
- Controls positioned outside their page.
- Navigation overlapping content.
- Desktop layouts squeezed onto mobile.

---

# 35. Recommended Page Pattern

Every Admin page should follow this structure:

```text
┌────────────────────────────────────────┐
│ Page title                    Action   │
│ Short description                     │
├────────────────────────────────────────┤
│ Search / Filters / Tabs                │
├────────────────────────────────────────┤
│                                        │
│ Main content                           │
│                                        │
│ Cards / table / editor                 │
│                                        │
└────────────────────────────────────────┘
```

On mobile:

```text
┌──────────────────────┐
│ Page title            │
│ Description           │
│ Primary action        │
├──────────────────────┤
│ Search                │
│ Filters               │
├──────────────────────┤
│ Card                  │
│ Card                  │
│ Card                  │
└──────────────────────┘
```

---

# 36. Spin Manager Page Pattern

```text
SPIN WHEEL
Configure the rewards players can win.

[ + Add Reward ]

Current rewards

┌──────────────────────────────────────────┐
│ 🪙 1,000 Coins                           │
│ Coins • Weight 20 • Active               │
│                              Edit Delete │
├──────────────────────────────────────────┤
│ 💎 10 Gems                               │
│ Gems • Weight 10 • Active                │
│                              Edit Delete │
├──────────────────────────────────────────┤
│ 🎨 Golden Board                          │
│ Shop Item • Weight 3 • Disabled          │
│                         Edit Enable Delete│
└──────────────────────────────────────────┘
```

The editor should be a page section or dedicated edit state, not an unrelated floating modal unless a modal is specifically needed and properly contained.

---

# 37. Shop Item Editor Pattern

```text
SHOP ITEM

Basic information
- Name
- Type
- Description
- Artwork

Commerce
- Price
- Currency
- Rarity

Unlocking
- Require level to unlock
- Unlock at level

Publishing
- Published

[ Save ] [ Cancel ]
```

---

# 38. Acceptance Checklist

## Authentication

- [ ] Admin authentication completes before Admin UI mounts.
- [ ] Hamburger hidden during authentication.
- [ ] Hamburger hidden on Login/Register.
- [ ] Non-admin users cannot access Admin APIs.

## Layout

- [ ] Admin is a full-page dashboard.
- [ ] No management component floats over unrelated pages.
- [ ] Every management section has its own route.
- [ ] Support is its own page.
- [ ] Hamburger is inside the authenticated Admin shell.
- [ ] Desktop layout is aligned.
- [ ] Mobile layout is aligned.
- [ ] No horizontal overflow.

## Shop

- [ ] Shop catalogue preserved.
- [ ] Boards preserved.
- [ ] Dice preserved.
- [ ] Avatars preserved.
- [ ] Yards preserved.
- [ ] Backgroundless artwork preserved.
- [ ] Prices preserved.
- [ ] Currency preserved.
- [ ] Rarity preserved.
- [ ] Publishing state preserved.
- [ ] Level requirements supported.

## Level locking

- [ ] Admin can enable/disable level requirement.
- [ ] Admin can set unlock level.
- [ ] Locked players see Locked.
- [ ] Locked players see unlock level.
- [ ] Locked players do not see price.
- [ ] Locked players cannot purchase.
- [ ] Server rejects bypass attempts.
- [ ] Reaching level unlocks purchase.
- [ ] Unlock notification appears.
- [ ] Multiple newly unlocked items are counted correctly.

## Spin Wheel

- [ ] Admin can add rewards.
- [ ] Admin can edit rewards.
- [ ] Admin can delete rewards.
- [ ] Admin can enable rewards.
- [ ] Admin can disable rewards.
- [ ] Admin can edit probability/weight.
- [ ] Admin can edit amount.
- [ ] Admin can edit label/icon.
- [ ] Admin can link Shop items.
- [ ] Shop item rewards work for all supported categories.

## Spin Rewards

- [ ] Won Shop item is immediately recorded as free/owned for the player.
- [ ] Level requirement does not block Spin receipt.
- [ ] Pending Claim list is persistent.
- [ ] Claim adds the item to Inventory.
- [ ] Claim removes it from pending list.
- [ ] Claim is permanently recorded.
- [ ] History contains item name/type/date won/date claimed.
- [ ] Duplicate claiming is impossible.
- [ ] No 🆕 Shop tag is used.

## Authentication forms

- [ ] Login password eye works.
- [ ] Register password eye works.
- [ ] Register confirm-password eye works.
- [ ] Admin hamburger never leaks onto auth screens.

## Data safety

- [ ] Existing Admin information preserved.
- [ ] Existing player information preserved.
- [ ] Existing Shop information preserved.
- [ ] Existing inventory preserved.
- [ ] Existing transaction information preserved.
- [ ] Existing support information preserved.
- [ ] Existing tournament/event/mission information preserved.
- [ ] Existing audit information preserved.

---

# 39. Final Architecture

The target architecture is:

```text
                         LUDO LIVE
                            │
                     Admin Authentication
                            │
                   ┌────────┴────────┐
                   │                 │
                Loading          Authorized
                   │                 │
             No Admin UI       Admin Shell
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                Navigation                       Active Page
                    │                                 │
        ┌───────────┼───────────────┐                 │
        │           │               │                 │
     Dashboard    Shop          Spin Wheel          ...
                                  │
                           Add/Edit/Delete
                                  │
                         Configure probability
                                  │
                         Configure Shop reward

Player side:

Shop → Level requirement check → Purchase

Spin → Reward selection → Shop item won
                         ↓
                  Free / Unlocked
                         ↓
                  Spin Rewards
                    ┌────┴────┐
                  Claim    History
                    │
                Inventory
```

This architecture is the source of truth for the fresh Admin rebuild. The visual layer can be replaced completely while preserving the underlying Ludo Live data and game systems.
