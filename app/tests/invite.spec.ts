/**
 * Invite link opened while signed out.
 * DeepSpace's OAuth callback always returns to /home, so the app must remember
 * the invite across sign-in. This test opens /join/<code> signed out, then gives
 * that same browser a real session (the test account's cookies, i.e. what a
 * completed sign-in sets) and lands on /home like the OAuth callback does.
 */
import { readFileSync } from 'node:fs'
import { test, expect, loadAllTestAccounts, pickTestAccounts, ensureStorageState } from 'deepspace/testing'
import { action } from './helpers/session'

test.skip(loadAllTestAccounts().length < 2, 'Needs 2 usable test accounts (npx deepspace test accounts create …)')
test.setTimeout(120_000)

test('a signed-out invitee lands in the household after signing in', async ({ users, browser }, testInfo) => {
  const [owner] = await users(1)
  const invitee = pickTestAccounts(2)[1]
  const baseURL = testInfo.project.use.baseURL as string

  await owner.page.goto('/home')
  const created = await action(owner.page, 'createHousehold', { name: `__test-${Date.now()}__ Invite` })
  const householdId = created.data!.householdId as string
  const { inviteCode } = (await action(owner.page, 'regenerateInvite', { householdId })).data as { inviteCode: string }

  const ctx = await browser.newContext({ baseURL })
  try {
    const page = await ctx.newPage()

    // 1. Signed out: a clear invite screen, not a generic sign-in wall.
    await page.goto(`/join/${inviteCode}`)
    await expect(page.getByTestId('invite-signed-out')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(inviteCode)).toBeVisible()
    await expect(page.getByTestId('invite-sign-in')).toBeVisible()

    // 2. Sign-in completes (session cookie set) and the OAuth callback lands on /home …
    const statePath = await ensureStorageState(browser, invitee, baseURL)
    const { cookies } = JSON.parse(readFileSync(statePath, 'utf8')) as { cookies: Parameters<typeof ctx.addCookies>[0] }
    await ctx.addCookies(cookies)
    await page.goto('/home')

    // 3. … and the pending invite finishes: the invitee is inside the household.
    await page.waitForURL(new RegExp(`/h/${householdId}`), { timeout: 20_000 })
    await expect(page.getByTestId('household-name')).toContainText('Invite', { timeout: 15_000 })

    // The pending invite is used once: a later visit to /home stays on /home.
    await page.goto('/home')
    await expect(page.getByTestId('household-link').first()).toBeVisible({ timeout: 15_000 })
    expect(page.url()).toMatch(/\/home$/)
  } finally {
    await ctx.close()
    await action(owner.page, 'deleteHousehold', { householdId })
  }
})
