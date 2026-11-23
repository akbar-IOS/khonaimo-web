# KhonaiMo Web: DeepSpace challenge writeup

**What I built.** KhonaiMo Web is a web version of my iOS app KhonaiMo, a shared household board. You sign in, create or join a household with an invite code or link, and share chores and expenses with the other members. Chores can be assigned and can repeat. Expenses are split equally, and the app shows exact balances and who pays whom. Every change syncs live to everyone in the household, and you can see who's online. A nightly scheduled job reopens finished repeating chores.

**DeepSpace integrations I used.** Auth. SQLite records with real-time sync (RecordRoom, useQuery, useMutations). Team-level role-based permissions, where each household is a DeepSpace team, so only members ever receive its rows. Server actions for writes that need ownership or membership checks. Presence for the "online now" indicator. A CronRoom scheduled job. The multi-user Playwright testing fixture.

I left out Stripe because KhonaiMo tracks who owes whom but doesn't move money, so "Mark paid" just records a settlement. I left out file storage because receipt photos aren't core to the flow. I chose the cron job over an AI helper because it runs without any input from me and has a clear result I can observe. I didn't use Yjs or messaging because plain records fit every part of the app.

**Main tradeoff.** All households live as teams in one app-wide RecordRoom instead of one room per household. That gives a single "my households" query and no custom room routing, while team-level permissions still keep each household private. The cost is that everything sits in one Durable Object. That's fine at household scale, but a much bigger app would shard by household. A second tradeoff is that I only support equal splits, to keep the money logic small and exact, since amounts are stored as integer cents.

**What the agent did.** I used Claude Code with DeepSpace's own skill, plus frontend-design and web-design-guidelines skills. I scoped the product and gave it the requirements in two rounds, which are in PROMPT-phase1.md and PROMPT-phase2.md. Claude read the docs and the SDK source, set up the project, and wrote the schemas, server actions, cron job, UI, and tests. It also deployed the app and checked the production logs. When I asked it to review its own known gaps, it found that chore and expense creates were only role-checked. In round two it moved them into server actions that check membership, limited presence to household members, and added a security test that it confirmed fails on the old version.

**What I verified myself.** I signed in with Google on the live site and tried the main flow of a household and its chores. I reviewed the design changes and the security model in `household-schemas.ts` and `actions/index.ts`. The automated checks are 8+ unit tests and Playwright suites, which cover the two-user live flow, the security rules (outsider, member, and removed member), and the invite flow. Those suites pass locally and against https://khonaimo.app.space.

TODO (Akbar): Click "Run now" on the Members tab to watch the cron job, and check that `npx deepspace logs --search cron` shows the 00:05 ET run.

**Known edges.** Members who get removed see stale data until they reload. Splits are equal only, and amounts show in USD only.
