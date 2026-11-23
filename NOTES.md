# KhonaiMo Web: build notes

**Live:** https://khonaimo.app.space · **Code:** `app/` · **App id:** `app_01M84HXCYWD3BKYNPYB4E5E1T0`

## NEEDS AKBAR

1. **Sign in once in Chrome to finish the signed-in browser check (about 1 minute).**
   The Claude-in-Chrome extension isn't allowed to act on `accounts.google.com`, so the
   agent can't pick your Google account. Everything signed-in was verified with two
   real signed-in test users via Playwright, locally *and* against the live URL (see
   "Verification"). It just hasn't been clicked through in your own Chrome as you. To do it:
   open https://khonaimo.app.space/home → **Sign in** → **Continue with Google** → pick your
   account. As the app owner you'll also see **Run now (app admin)** on the Members tab,
   which fires the scheduled chore-reset job on demand.
   - One local attempt (`localhost:5173`) ended on DeepSpace's "Sign-in didn't finish
     (state_mismatch)" page. Most likely the OAuth state expired while the Google
     chooser sat open for a long time. Use the live URL.
2. Nothing else is blocking. The CLI is logged in as you, the app is registered to your
   account, and it is deployed.

---

## What I built

A web version of KhonaiMo, a household app for sharing chores and expenses.

| Feature | How it works |
|---|---|
| Sign in | DeepSpace auth (`DeepSpaceAuthProvider`, `<AuthGate>`, `AuthOverlay`: GitHub / Google / email). |
| Households | Create one (name + emoji); join with a 6-character invite code or a `/join/<code>` link. Owner vs member roles. |
| Owner-only rules | Rename (collection RBAC), remove member, reset invite code, delete household (owner-checked server actions). Members can leave. |
| Chores | Add, assign to a member, due date, repeat (once/daily/weekly), mark done, reassign, delete. "Everyone / Mine" filter, overdue highlighting. Live-synced. |
| Expenses | Add (description, amount, payer, split equally among chosen members). Running balances in integer cents, penny-exact, plus a minimal "who pays whom" settle-up list with **Mark paid**. Live-synced. |
| Presence | Avatars with green dots and "2 online · Dilnoza, Rustam", from a per-household `PresenceRoom`. Updates within about 1 s of a tab opening or closing. |
| Extra: scheduled job | `reset-recurring-chores` runs daily at 00:05 America/New_York: finished daily/weekly chores reopen on their next due date. A status card shows next/last run; app admins get "Run now". |

Mobile-first Tailwind UI with a custom warm "khonaimo" theme (cream, leafy green, terracotta). Static, prerendered landing page at `/`.

## DeepSpace integrations used (and why)

1. **Auth** (`DeepSpaceAuthProvider`, `AuthGate`, `useAuth`, verified JWT in server actions). No hand-rolled sessions.
2. **SQLite records + real-time sync** (`RecordRoom`, `useQuery`, `useMutations`). Chores, expenses, households and memberships are collections; every member's screen updates live with no polling and no custom WebSocket code.
3. **Role-based permissions, specifically the `'team'` level.** Each household *is* a DeepSpace team: `team_members` (teamId, userId, status) is the SDK's membership table, and `chores`/`expenses`/`households` declare `teamField`. The Durable Object only sends a row to active members of that household. That is the privacy boundary, enforced server-side. `households` uses `ownerField: 'ownerId'` + `update: 'own'` + `writableFields: ['name','emoji']`, so only the owner can rename. `uniqueOn: ['teamId','userId']` stops duplicate memberships.
4. **Server actions** (`src/actions/index.ts`). Used for the writes a user can't do under their own RBAC: create household + owner membership, join by code, remove member, leave, reset invite, cascading delete. Each one checks the caller (owner or invite code) first.
5. **Presence** (`usePresenceRoom('household:<id>')`). Real "online now", not a 5-minute last-seen heuristic.
6. **Scheduled jobs** (`CronRoom` via `src/cron.ts`, `useCronMonitor`). The nightly recurring-chore reset, with live run history in the UI.
7. **Testing** (`deepspace/testing` multi-user Playwright fixture + CLI test accounts).

## Deliberately left out

- **Payments (Stripe):** KhonaiMo tracks who owes whom; it doesn't move money. Handling real payments adds compliance and refund work and isn't needed for this MVP. "Mark paid" records a settlement instead.
- **File storage (R2):** receipt photos would be nice, but they aren't core to the flow and would add upload/size/permission work for little demo value.
- **AI chat helper:** a cron job was the cleaner extra. It runs on its own with no per-call credits, has a clear observable result, and doesn't need a prompt-quality loop. The scaffold's agent tools are left as generated.
- **Yjs / canvas / messaging:** not needed. Plain records fit every entity here.

## Main tradeoff

**Households as DeepSpace teams in one app-wide RecordRoom, instead of one RecordRoom per household.**
One room gives a single "my households" query across all households and needs no custom room routing or per-room role resolution. The `'team'` RBAC level still keeps every household's data private to its members. The cost is that everything lives in one Durable Object. That's fine at household scale (tens of rows per home), but a very large deployment would want to shard rooms per household. A second, smaller tradeoff: membership changes (join/remove/delete) go through server actions rather than pure RBAC, because "the owner may delete *someone else's* membership row" can't be expressed with `'own'`/`'team'` rules alone.

## What I (the agent) did

1. Read docs.deep.space (llms.txt index + quickstart, data model, permissions, presence, scheduled jobs, server actions, testing) and the deepspace-skill, then checked behavior against the installed SDK source. For example, I confirmed exactly how `'team'` resolves via `team_members`.
2. Logged the CLI in through your Chrome (you clicked the Google account), scaffolded with `npm create deepspace@latest app`, and registered the app with `deepspace app init`.
3. Wrote the schemas, server actions, cron task, balance math (unit-tested), theme, landing page and all screens.
4. Created two DeepSpace test accounts ("Dilnoza", "Rustam") with random passwords. They are stored only in `~/.deepspace/test-accounts.json` and never written into the repo or chat.
5. Wrote the two-user e2e test, ran the full suite, took Playwright screenshots at phone and desktop widths and reviewed them, and fixed what I found (a stray "0" rendered from a numeric boolean).
6. Deployed with `npx deepspace deploy`, re-ran the two-user test against the live URL, and checked production logs.
7. Committed at each milestone (top-level git repo; `.env`, `.dev.vars`, `.deepspace/`, `.claude/` and session logs are ignored).

## Verification

| What | How | Result |
|---|---|---|
| Balance / split / settle-up math, date roll-over, nightly reset rule | Vitest, `app/src/lib/balances.test.ts` (8 tests) | ✅ pass |
| Scaffold smoke + API + collab specs | `npx deepspace test run all` (12 Playwright tests) | ✅ pass |
| **Two-user flow, local:** create household → join via invite link → both see "2 online" → chore added by A appears for B, B checks it off, A sees it done → A adds $30 split 2 ways → B sees "You owe $15.00", A "You're owed $15.00" → B is refused `removeMember` / `deleteHousehold` by the server and has no rename field → A removes B in the UI, B reloads and gets the locked-out screen with no chore data → cleanup | `app/tests/household.spec.ts` with `deepspace/testing` `users(2)` | ✅ pass |
| **Same two-user flow against production** | `LIVE_URL=https://khonaimo.app.space npx playwright test -c tests/playwright.live.config.ts household` | ✅ pass (8.6 s) |
| Visual check (phone 390px and desktop) | Playwright screenshots of home, chores, expenses (both users), members (owner vs member view), reviewed by eye | ✅ fixed one bug, rest looked right |
| Live site in your Chrome | Landing page; `/home` signed-out welcome; Sign-in dialog; `/join/<code>` while signed out shows the sign-in gate | ✅ |
| Signed-in flow in your Chrome | Blocked: Chrome extension can't act on Google sign-in | ⏳ see NEEDS AKBAR |
| Production health | `npx deepspace logs`: no errors; cron room answering `/internal/cron/tasks` (schedule armed) | ✅ |

Run the tests yourself from `app/`: `npx deepspace test run all` (starts its own server; add `--port 5180` if 5173 is busy) and `npx vitest run`.

## Known unfinished edges

- **Cron "Run now" was not clicked in a browser.** Test users aren't app admins. The reset rule is unit-tested, and the schedule is armed in production (first scheduled run: 00:05 ET tonight). Check with `npx deepspace logs --search cron` tomorrow, or click Run now after signing in.
- **`create` on chores/expenses is role-based, not team-checked.** DeepSpace's `create` permission is boolean, so a signed-in user who forged a request could insert a chore tagged with a household id they don't belong to. They still couldn't read, update, or see anything in that household. A fix would route creates through a membership-checking server action.
- **Removed members see stale data until they reload.** Their open socket isn't re-scoped instantly. After a reload they get nothing (verified by the test).
- **Presence scope isn't membership-checked.** Someone who knew a household id could join its PresenceRoom and see first names of who is online, but no household data.
- **Equal splits only** (no custom shares or percentages), and only USD formatting.
- **Invite links while signed out:** `/join/<code>` shows the sign-in gate and joins after sign-in on that page. I haven't verified in a real browser whether OAuth returns to the same `/join/...` URL. Entering the code on `/home` always works.
- Test accounts' emails include "khonaimo" (the docs suggest app-neutral names; harmless).

## Repo map

```
app/src/schemas/household-schemas.ts   collections + RBAC (the security model)
app/src/actions/index.ts               owner/invite-checked server actions
app/src/cron.ts                        nightly recurring-chore reset (CronRoom)
app/src/lib/balances.ts, dates.ts      pure logic (unit-tested)
app/src/lib/household.ts               data hooks (useQuery)
app/src/components/household/*         Chores / Expenses / Members tabs, presence
app/src/pages/(app)/home.tsx           household list, create, join
app/src/pages/(app)/(protected)/h/[id].tsx, join/[code].tsx
app/tests/household.spec.ts            two-user e2e (local or live)
```
