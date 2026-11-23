# KhonaiMo Web

A web version of my iOS app [KhonaiMo](https://apps.apple.com/us/app/khonaimo/id6793305894). It's a shared household board where roommates and family split chores and expenses, and everything updates live for everyone in the household.

**Live:** https://khonaimo.app.space

## Features
- Sign in with DeepSpace auth (Google, GitHub, or email)
- Households with owner and member roles, plus invite codes and `/join/<code>` links that keep working through sign-in
- Chores you can assign, give due dates, and set to repeat daily or weekly, all synced live
- Shared expenses split equally, with exact running balances, a list of who pays whom, and Mark paid
- An "online now" indicator for each household
- A scheduled job at 00:05 ET every night that reopens finished repeating chores

## Stack
DeepSpace SDK (Cloudflare Workers + Durable Objects), Vite + React, Hono worker, Tailwind v4.

DeepSpace integrations used: auth, SQLite records with real-time sync (`RecordRoom`, `useQuery`, `useMutations`), team-level role-based permissions, server actions, presence (`PresenceRoom`), scheduled jobs (`CronRoom`), and multi-user Playwright testing (`deepspace/testing`).

## Run locally
```bash
cd app
npm install
npx deepspace dev start      # dev server
npx vitest run               # unit tests
npx deepspace test run all   # Playwright e2e, including the two-user flow
npx deepspace deploy         # deploy to khonaimo.app.space
```

## Code map
- `app/src/schemas/household-schemas.ts`: collections and permissions (the security model)
- `app/src/actions/index.ts`: server actions that check membership and ownership
- `app/src/server/realtime-routes.ts`: presence limited to household members
- `app/src/cron.ts`: the nightly chore reset
- `app/src/lib/`: balance and date logic, with unit tests
- `app/tests/`: two-user, security, and invite e2e specs

See [WRITEUP.md](WRITEUP.md) for my design choices and tradeoffs, and [NOTES.md](NOTES.md) for detailed build and verification notes.
