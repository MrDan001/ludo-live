# Ludo Live Support & Disputes

## Purpose
Ludo Live Support is an authenticated two-way conversation system connecting players to the Admin Dispute & Support Desk.

## Player flow
1. Player opens `/support`.
2. Player creates a case with subject, category and description.
3. The server stores the case in `ludo_disputes` and the initial message in `ludo_dispute_messages`.
4. Player can reopen an individual case and continue the conversation.
5. Player sees Admin replies in the same thread.
6. Resolved cases are read-only until the player explicitly reopens them.
7. The page polls every 8 seconds while open so new Admin replies appear without a manual refresh.

## Admin flow
1. Admin authentication is enforced by the existing `/api/admin` session guard.
2. DBASE includes the existing Disputes tab and a separate floating **Support Inbox**.
3. Support Inbox lists cases, player identity, category, status, latest message and message count.
4. Admin can open a case, read the complete message thread, reply, or resolve the case.
5. Admin replies are stored as `sender_type='admin'` messages and change the case to `pending`.
6. Resolve writes the final admin note/message and records `resolved_at`.
7. Admin actions are written to `ludo_admin_actions` for auditability.

## Database
- `ludo_disputes`: case metadata, owner, title, status, category, priority and timestamps.
- `ludo_dispute_messages`: immutable chronological conversation messages.
- Existing disputes remain compatible; the schema adds `category`, `priority` and `updated_at` with safe defaults.

## API
- `GET /api/support` — authenticated player's cases.
- `GET /api/support?id=<id>` — authenticated player's selected case and messages.
- `POST /api/support` with `action=create` — create case.
- `POST /api/support` with `action=reply` — player reply.
- `POST /api/support` with `action=reopen` — reopen resolved case.
- `GET /api/admin` — admin cases include message count and latest message.
- `POST /api/admin` with `action=get_dispute` — admin thread.
- `POST /api/admin` with `action=reply_dispute` — admin reply.
- `POST /api/admin` with `action=resolve_dispute` — resolve case and optionally append a final message.

## Security rules
- Player queries are scoped to the authenticated user's ID; a player cannot read another player's case by changing the URL ID.
- Admin endpoints require the existing configured admin email allow-list and authenticated session.
- Messages are persisted server-side; the browser is never treated as the source of truth.
- Internal admin audit records do not expose other players' cases to ordinary users.

## Status model
- `open` — active conversation / player needs support.
- `pending` — Admin has replied and is waiting for the player.
- `resolved` — Admin has closed the case; player can reopen it.

## Design decision
Support is separate from Friends/Game chat. It is a controlled support conversation so disputes, payments, game problems, events and account issues keep their own durable case history. This follows the common support pattern of a case/ticket containing a chronological message thread rather than putting the whole conversation into one mutable field. citeturn2search5turn2search7

## Future extensions
- Push notification when Admin replies.
- Admin assignment and priority filters.
- Attachments/screenshots.
- SLA/response-time reporting.
- Search and archived case reporting.
