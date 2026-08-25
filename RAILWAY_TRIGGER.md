# Railway Deployment Contract

This file is documentation only. It does not contain Ludo application code.

## Production flow

`main` → GitHub → connected Railway service.

A commit being pushed to GitHub does **not** mean the application is live.

## Required verification

For every production change:

1. Confirm the intended commit is on `main`.
2. Confirm Railway picked up that commit.
3. Inspect build/deploy logs.
4. If the deployment fails, fix the exact reported error and redeploy.
5. Only report the feature as live after Railway reports `SUCCESS`.

## Failure discipline

- Do not guess the cause of a Railway failure.
- Do not make unrelated code changes while debugging a failed build.
- Do not suppress TypeScript/build checks to force a deployment through.
- Treat the last known successful deployment as the safe production baseline while debugging.

## Product documentation

The complete architecture and product contracts live in:

- `ARCHITECTURE.md`
- `DEVELOPER_HANDOFF.md`

Those documents are the source of developer-facing product rules for gameplay, XP, Shop, Inventory/Award Room, active-time free spins, admin navigation, finance responsiveness, authentication, server authority and deployment discipline.

## Free Spin deployment rule

The active-time free-spin system is a production gameplay/reward feature and must be verified like any other server-authoritative feature.

- Every 30 minutes of server-validated active app time grants 1 free spin.
- From 17:00 to 20:00 Nigeria time (`Africa/Lagos`), every completed 30-minute interval grants 3 free spins.
- Free-spin balance is server/database authoritative and is consumed by the Spin Wheel.
- Profile displays the current Free Rolls balance.
- Reward grants produce an in-app notification; browser notification is conditional on notification permission/subscription support.
- Do not claim OS-level closed-app push delivery unless the required web-push infrastructure is actually configured and verified.
- Unused earned spins persist until consumed.

Any change to these rules must be reflected in `ARCHITECTURE.md` and `DEVELOPER_HANDOFF.md` in the same release.
