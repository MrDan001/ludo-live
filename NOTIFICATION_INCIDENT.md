# Ludo Live — Notification Registration Incident

## Status

**Resolved.** Production notification registration was restored after users were receiving `Could not register notifications` immediately after granting browser notification permission.

## Root cause

The notification subscription request was coupled to the global authentication/database schema initializer. Every registration request could therefore perform schema setup work before saving the PushSubscription. Under concurrent/serverless traffic this consumed the PostgreSQL session pool and produced `EMAXCONNSESSION` (`max clients reached`). The failure affected notification registration and could also surface on unrelated database-backed APIs.

## Correct architecture

Notification registration must remain a lightweight authenticated request:

1. Read the authenticated `ludo_session`.
2. Validate the browser PushSubscription payload.
3. Insert/update the subscription in `ludo_push_subscriptions`.
4. Return success.

Schema creation and migrations are deployment/setup responsibilities and must not run on every notification request.

## VAPID configuration

The existing VAPID key pair must be retained. The browser-facing public-key endpoint may use `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and fall back to `VAPID_PUBLIC_KEY`. `VAPID_PRIVATE_KEY` remains server-only and must never be exposed or committed.

## Verification contract

A notification fix is only considered complete after the production flow succeeds end-to-end:

`Allow Notifications` → browser permission granted → VAPID public key returned → PushSubscription created → `/api/notifications/subscribe` succeeds → subscription persisted in PostgreSQL.

A browser permission of `granted` alone does not mean notification registration succeeded.

## Regression rule

Do not reintroduce global schema initialization into request handlers. If database migrations are required, run them through deployment/setup tooling or a controlled one-time migration path.

See `NOTIFICATIONS.md` for the canonical notification contract.
