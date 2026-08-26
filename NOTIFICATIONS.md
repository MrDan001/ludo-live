# Ludo Live — Push Notification Contract

## Purpose

Ludo Live uses browser Web Push so supported devices can receive notifications while the app is backgrounded or closed, similar to an installed app.

## Required onboarding

For authenticated users, notification setup is a required app capability. `app/_components/NotificationGate.tsx` is mounted from `app/layout.tsx` and blocks the authenticated app until the browser/device has granted notification permission and a PushSubscription has been registered with the server.

Browsers and operating systems control permission. The application cannot silently grant OS/browser permission. If permission has previously been denied, the user must enable notifications in browser/device settings before continuing.

## Browser requirements

- Secure context (`HTTPS`).
- `Notification`, `ServiceWorker`, and `PushManager` support.
- A registered `/sw.js` service worker.
- Web Push support on the user's browser/device.
- iOS/iPadOS may require the site to be installed as a Home Screen web app before web push is available.

## Client flow

1. `ServiceWorkerRegistration` registers `/sw.js` for `/`.
2. `NotificationGate` checks the current authenticated session's subscription state.
3. If notifications are not enabled, the gate requests browser permission from the user.
4. The client fetches `/api/notifications/public-key`.
5. The browser creates a `PushSubscription` with the VAPID public key.
6. The subscription is sent to `/api/notifications/subscribe`.
7. PostgreSQL stores the subscription against the authenticated `ludo_users.id`.
8. Existing subscriptions are updated by endpoint; stale subscriptions are removed after delivery returns 404/410.

## Server authority

- `app/api/notifications/subscribe/route.ts` owns subscription registration/status/removal.
- Identity comes from the `ludo_session` cookie; never accept a client-supplied user id.
- `ludo_push_subscriptions` is the persistent subscription table.
- `lib/pushNotifications.ts` is the server-side delivery helper.
- The helper uses `web-push` and VAPID to send encrypted Web Push payloads.

### Registration reliability rule

Notification registration is a normal application request and must **not** run the global authentication/database schema initializer or perform schema migrations on every request. The subscription route should authenticate the session, validate the PushSubscription and perform only the required database read/write.

Database schema creation/migrations belong to deployment/setup. This separation is required because serverless instances can execute notification registration concurrently; per-request schema work can consume the database connection pool and cause `EMAXCONNSESSION` failures across notifications and other APIs.

The notification route uses the shared database pool with bounded connection usage and releases idle connections promptly. A successful browser permission grant is not sufficient: registration is complete only after `/api/notifications/subscribe` successfully persists the subscription.

**Incident resolved:** notification registration previously failed in production because the subscription request triggered global schema initialization and exhausted the PostgreSQL session pool. The fix moved schema work out of the request path and bounded application database connections. Do not reintroduce per-request schema initialization.

## Required Railway variables

The production `ludo-live` service must have:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — safe to expose to the browser.
- `VAPID_PUBLIC_KEY` — server copy of the public key.
- `VAPID_PRIVATE_KEY` — **secret; never commit to GitHub or expose to the browser**.
- `VAPID_SUBJECT` — normally a `mailto:` address or HTTPS contact URL.

The public-key endpoint may use `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and safely fall back to `VAPID_PUBLIC_KEY` when the browser-facing alias is absent. The private key must never be returned by an API route.

The VAPID key pair must be generated once and retained. Do not generate a new pair during every deploy, because changing the pair invalidates the relationship with existing subscriptions.

## Service worker behavior

`public/sw.js` handles:

- `push` events by displaying the notification.
- `notificationclick` by opening/focusing the supplied application URL.
- Network-only handling for API, Next.js and Socket.IO traffic.

Payload shape:

```json
{
  "title": "Ludo Live",
  "body": "Your tournament is starting.",
  "url": "/tournament",
  "tag": "tournament-start"
}
```

## Product integration

Any server-side event that should notify a player should call `sendPushToUser(userId, payload)` from `lib/pushNotifications.ts` after the authoritative database mutation succeeds.

Examples include:

- Friend request / acceptance.
- Room invitation.
- Tournament start/result.
- Mission reward available/claimed.
- Reward or free-spin grant.
- Important account/security events.

Do not send a push from client-only state. The server event remains authoritative.

## Security rules

- Never expose `VAPID_PRIVATE_KEY` to the browser.
- Never commit VAPID private keys.
- Never trust a client user id when registering or sending notifications.
- Remove expired subscriptions after 404/410 delivery responses.
- Do not bypass browser/OS notification permission controls.

## Deployment verification

After changing notification or database connection code, a release is not considered verified until the production service reports `SUCCESS` and the following flow has been tested on the production app:

`Allow Notifications` → permission granted → VAPID public key returned → PushSubscription created → `/api/notifications/subscribe` returns success → subscription persisted.

If registration returns `Could not register notifications`, inspect the subscription API/runtime logs before changing VAPID keys. A browser permission of `granted` does not prove server registration succeeded.

## Documentation rule

When notification behavior, subscription storage, required onboarding, service-worker behavior, environment variables, or registration reliability changes, update this file and the project's main architecture/handoff documentation in the same change.
