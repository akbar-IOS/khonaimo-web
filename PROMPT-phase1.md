You are building "KhonaiMo Web", a web version of my iOS app KhonaiMo (https://apps.apple.com/us/app/khonaimo/id6793305894 — a household app for sharing chores and expenses), as my take-home challenge for the DeepSpace Software Engineering Intern role. DEADLINE: tonight 11:59 PM ET, so favor a focused, finished, working app over a big unfinished one.

Work in THIS folder (~/Desktop/KhonaiMo-Web). Put the app in a subfolder `app/`.

Requirements from DeepSpace:
- Must be a full-stack, multi-user app built on the DeepSpace SDK and deployed with it. Docs: https://docs.deep.space (read them first, plus the agent skill at https://github.com/deepdotspace/deepspace-skill and examples at https://github.com/deepdotspace). Scaffold with `npm create deepspace@latest app` (or `npx deepspace`), run with `npx deepspace dev start`, deploy with `npx deepspace deploy` to <name>.app.space.
- Use at least 3 DeepSpace integrations, and use the platform primitives instead of reimplementing them (built-in auth, SQLite real-time sync via useQuery/useMutations/RecordRoom, role-based permissions, presence, scheduled jobs, AI chat, etc.).
- Keep the code understandable; never commit secrets (use DeepSpace secrets / .env ignored by git).

Product scope (MVP):
1. Sign in with DeepSpace auth.
2. Households: create a household, invite/join via code or link; roles owner vs member enforced with DeepSpace role-based permissions (only owner can rename/remove members/delete household).
3. Chores: add, assign to a member, due date, mark done — live-synced across users in real time.
4. Shared expenses: add expense (amount, payer, split equally among chosen members), show running balances ("who owes whom").
5. Presence: show which household members are online right now.
6. ONE extra: either a scheduled job (e.g. daily recurring chores reset / overdue reminders) or an AI helper (e.g. "suggest a fair chore split") — pick whichever the SDK makes cleanest.
Skip payments and file storage (note why in NOTES.md).
Clean, mobile-friendly UI with Tailwind, matching a friendly household-app feel.

Process:
- `git init` at the top of this folder, add a good .gitignore, and commit at each working milestone with clear messages.
- Use my Chrome (Claude in Chrome) to actually open the running app and test every feature as you build it: sign-in, creating a household, joining as a second user (use a second browser profile/incognito or the deepspace multi-user testing), chores syncing live, expenses and balances, presence, the extra feature. Fix anything broken. Also add at least one multi-user Playwright test with deepspace/testing if feasible.
- Keep a file NOTES.md at the top level, updated as you go: what you built, which DeepSpace integrations and why, integrations you deliberately left out and why, the main tradeoff, what you (the agent) did, what was verified in the browser and how, known unfinished edges, and any step that needs me (Akbar) to do something by hand.
- Then deploy with `npx deepspace deploy` (pick an app name like khonaimo or khonaimo-web). If deploy or any step needs me to log in or approve something in a browser, try to do it through my Chrome; if it truly needs me, stop and write exactly what's needed at the top of NOTES.md under "NEEDS AKBAR".
- After deploying, open the live URL in Chrome and re-test the main path.

When finished, print a short final report: live URL, what works, what doesn't, and anything waiting on me.
