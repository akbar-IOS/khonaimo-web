/**
 * End-to-end, two real signed-in users (deepspace/testing `users` fixture):
 * owner creates a household → member joins via invite link → presence shows
 * both → chores and expenses sync live both ways → balances agree → member is
 * refused owner-only actions by the server → owner deletes the household.
 */
import type { Page } from '@playwright/test'
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

test.skip(loadAllTestAccounts().length < 2, 'Needs 2 usable test accounts (npx deepspace test accounts create …)')
test.setTimeout(180_000)

/** Call a server action as the page's signed-in user (same path the UI uses). */
async function action(page: Page, name: string, params: Record<string, unknown>) {
  return page.evaluate(
    async ({ name, params }) => {
      // Same call deepspace's getAuthToken() makes: trade the session cookie for a JWT.
      const res = await fetch('/api/auth/token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => null)
      const token = res && res.ok ? ((await res.json()) as { token?: string }).token : undefined
      const r = await fetch(`/api/actions/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(params),
      })
      return (await r.json()) as { success: boolean; error?: string; data?: unknown }
    },
    { name, params },
  )
}

test('two housemates share chores, expenses and presence live', async ({ users }) => {
  const [owner, mate] = await users(2)
  const tag = `__test-${Date.now()}__`
  let householdId = ''

  try {
    // 1. Owner creates a household.
    await owner.page.goto('/home')
    await owner.page.getByTestId('new-household-name').fill(`${tag} Flat`)
    await owner.page.getByTestId('create-household').click()
    await owner.page.waitForURL(/\/h\/hh_/, { timeout: 20_000 })
    householdId = owner.page.url().split('/h/')[1]
    await expect(owner.page.getByTestId('household-name')).toHaveText(`${tag} Flat`)

    // 2. Grab the invite code; housemate joins via the invite link.
    await owner.page.getByTestId('tab-members').click()
    const code = (await owner.page.getByTestId('invite-code').textContent())?.trim() ?? ''
    expect(code).toMatch(/^[A-Z0-9]{6}$/)
    await mate.page.goto(`/join/${code}`)
    await mate.page.waitForURL(new RegExp(`/h/${householdId}`), { timeout: 20_000 })
    await expect(mate.page.getByTestId('household-name')).toHaveText(`${tag} Flat`, { timeout: 15_000 })

    // 3. Presence: both see 2 online; owner sees the new member appear live.
    await expect(owner.page.getByTestId('member-row')).toHaveCount(2, { timeout: 15_000 })
    await expect(owner.page.getByTestId('online-summary')).toContainText('2 online', { timeout: 15_000 })
    await expect(mate.page.getByTestId('online-summary')).toContainText('2 online', { timeout: 15_000 })

    // 4. Chores sync live: owner adds a chore for the mate; mate checks it off; owner sees it done.
    await owner.page.getByTestId('tab-chores').click()
    await owner.page.getByTestId('chore-title').fill(`${tag} Take out trash`)
    await owner.page.getByTestId('chore-assignee').selectOption({ label: mate.name })
    await owner.page.getByTestId('add-chore').click()
    const mateRow = mate.page.getByTestId('chore-row').filter({ hasText: `${tag} Take out trash` })
    await expect(mateRow).toBeVisible({ timeout: 15_000 })
    await mateRow.getByTestId('chore-toggle').click()
    const ownerRow = owner.page.getByTestId('chore-row').filter({ hasText: `${tag} Take out trash` })
    await expect(ownerRow).toHaveAttribute('data-done', 'true', { timeout: 15_000 })

    // 5. Expenses: owner pays $30 split between both → mate owes $15, owner is owed $15.
    await owner.page.getByTestId('tab-expenses').click()
    await mate.page.getByTestId('tab-expenses').click()
    await owner.page.getByTestId('expense-description').fill(`${tag} Groceries`)
    await owner.page.getByTestId('expense-amount').fill('30')
    await owner.page.getByTestId('add-expense').click()
    await expect(mate.page.getByTestId('expense-row').filter({ hasText: `${tag} Groceries` })).toBeVisible({ timeout: 15_000 })
    await expect(mate.page.getByTestId('my-balance')).toHaveText('You owe $15.00', { timeout: 15_000 })
    await expect(owner.page.getByTestId('my-balance')).toHaveText('You’re owed $15.00')

    // 6. Owner-only rules are enforced by the server, not just hidden in the UI.
    await mate.page.getByTestId('tab-members').click()
    await expect(mate.page.getByTestId('rename-input')).toHaveCount(0)
    const removeAttempt = await action(mate.page, 'removeMember', { householdId, userId: owner.userId ?? 'x' })
    expect(removeAttempt.success).toBe(false)
    const deleteAttempt = await action(mate.page, 'deleteHousehold', { householdId })
    expect(deleteAttempt).toMatchObject({ success: false, error: 'Only the owner can delete the household.' })

    // 7. Owner removes the member through the UI; after a reload the server sends
    //    them nothing from this household ('team' RBAC), so they see the locked-out screen.
    await owner.page.getByTestId('tab-members').click()
    await owner.page.getByTestId('member-row').filter({ hasText: mate.name }).getByRole('button', { name: 'Remove' }).click()
    await owner.page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click()
    await expect(owner.page.getByTestId('member-row')).toHaveCount(1, { timeout: 15_000 })
    await mate.page.reload()
    await expect(mate.page.getByText('You’re not in this household')).toBeVisible({ timeout: 15_000 })
    await expect(mate.page.getByText(`${tag} Take out trash`)).toHaveCount(0)
  } finally {
    // 7. Cleanup: the owner deletes the household (cascades chores, expenses, memberships).
    if (householdId) {
      const r = await action(owner.page, 'deleteHousehold', { householdId })
      expect(r.success).toBe(true)
    }
  }
})
