Great work, the app is live at https://khonaimo.app.space. Phase 2 (still due tonight 11:59 PM ET; aim to finish within ~2 hours):

1. Security fix: route chore and expense creates through membership-checked server actions (or whatever DeepSpace primitive does it cleanly) so a user can't insert into a household they don't belong to. If presence-room membership checking is also cheap, do it. Add/extend tests to prove it.
2. UI polish: project skills are now installed in .claude/skills (deepspace, frontend-design, taste-skill, react-best-practices, web-design-guidelines, webapp-testing). Use frontend-design + taste-skill + web-design-guidelines to give the app a polished, distinctive, friendly household-app look (landing/home page, household view, empty states, mobile). Don't break functionality; keep it focused.
3. Verify the /join/<code> invite flow when signed out if you can.
4. Re-run all tests (unit + two-user e2e locally and against live), redeploy with `npx deepspace deploy`, re-test the live URL, check `npx deepspace logs` for errors. Use my Chrome to look at the live pages (signed-out pages at least).
5. Add a clear README.md at the repo root (what it is, live URL, stack, integrations, how to run/test). Make sure no secrets are committed.
6. Publish the code: `gh` is logged in as akbar-IOS. Create a PUBLIC GitHub repo `akbar-IOS/khonaimo-web` (if it already exists, just use it), set it as origin, and push main.
7. Write WRITEUP.md at the root as the draft submission writeup for DeepSpace, in Akbar's first-person voice, concise (~300-450 words), covering exactly: what I built, which DeepSpace integrations I used (and which I left out and why), the main tradeoff I made, what the agent (Claude Code) did, and what I verified myself. Be honest: Akbar directed the work and reviews; list the concrete verification steps that were actually done and leave a clearly marked TODO for anything Akbar must still verify personally. Mention known unfinished edges briefly.
8. Update NOTES.md (NEEDS AKBAR section) and commit + push everything.

Final report: live URL, repo URL, what changed, test results, anything waiting on me.
