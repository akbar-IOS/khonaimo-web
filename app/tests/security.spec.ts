/**
 * Household isolation, enforced by the server:
 *   - creating chores/expenses requires active membership (addChore/addExpense actions;
 *     the collections themselves grant no client `create`),
 *   - payloads can only name members (assignee, payer, split),
 *   - `household:<id>` presence sockets admit only active members.
 * The "outsider" is a real second signed-in account calling the same endpoints the UI uses.
 */
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'
import { action, presenceSocket } from './helpers/session'

test.skip(loadAllTestAccounts().length < 2, 'Needs 2 usable test accounts (npx deepspace test accounts create …)')
test.setTimeout(120_000)

test('outsiders cannot add to, or watch presence of, a household', async ({ users }) => {
  const [owner, other] = await users(2)
  await Promise.all([owner.page.goto('/home'), other.page.goto('/home')])
  const tag = `__test-${Date.now()}__`
  const created = await action(owner.page, 'createHousehold', { name: `${tag} Secure` })
  expect(created.success).toBe(true)
  const householdId = created.data!.householdId as string

  try {
    const ownerAdd = (await action(owner.page, "addChore", { householdId, title: `${tag} owner chore` })).success
    expect(ownerAdd).toBe(true)

    // --- Not a member yet: every write and the presence room are refused. ---
    const chore = await action(other.page, 'addChore', { householdId, title: `${tag} sneaky chore` })
    expect(chore).toMatchObject({ success: false, error: 'You are not a member of this household.' })
    const expense = await action(other.page, 'addExpense', {
      householdId, description: `${tag} sneaky`, amountCents: 500, payerId: 'x', splitAmong: ['x'],
    })
    expect(expense).toMatchObject({ success: false, error: 'You are not a member of this household.' })
    expect(await presenceSocket(other.page, `household:${householdId}`)).toBe('blocked')
    expect(await presenceSocket(other.page, `household:${householdId}`, false)).toBe('blocked') // no token at all
    expect(await presenceSocket(owner.page, `household:${householdId}`)).toBe('open')

    // --- Join with the invite code: now admitted, but payloads must name members only. ---
    await owner.page.goto(`/h/${householdId}`)
    await owner.page.getByTestId('tab-members').click()
    const code = (await owner.page.getByTestId('invite-code').textContent())!.trim()
    expect((await action(other.page, 'joinHousehold', { code })).success).toBe(true)

    expect(await presenceSocket(other.page, `household:${householdId}`)).toBe('open')
    expect(await action(other.page, 'addChore', { householdId, title: `${tag} ok chore` })).toMatchObject({ success: true })
    expect(await action(other.page, 'addChore', { householdId, title: `${tag} bad`, assigneeId: 'not-a-member' }))
      .toMatchObject({ success: false, error: 'Assignee must be in this household.' })
    expect(await action(other.page, 'addExpense', {
      householdId, description: `${tag} bad split`, amountCents: 1000, payerId: owner.userId ?? '', splitAmong: ['not-a-member'],
    })).toMatchObject({ success: false })
    expect(await action(other.page, 'addExpense', {
      householdId, description: `${tag} bad amount`, amountCents: -5, payerId: 'x', splitAmong: ['x'],
    })).toMatchObject({ success: false, error: 'Amount must be between $0.01 and $100,000.' })

    // --- Removed by the owner: refused again. ---
    await owner.page.reload()
    await owner.page.getByTestId('tab-members').click()
    await owner.page.getByTestId('member-row').filter({ hasNotText: '(you)' }).getByRole('button', { name: 'Remove' }).click()
    await owner.page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click()
    await expect(owner.page.getByTestId('member-row')).toHaveCount(1, { timeout: 15_000 })
    expect(await action(other.page, 'addChore', { householdId, title: `${tag} after removal` }))
      .toMatchObject({ success: false, error: 'You are not a member of this household.' })
    expect(await presenceSocket(other.page, `household:${householdId}`)).toBe('blocked')
  } finally {
    expect((await action(owner.page, 'deleteHousehold', { householdId })).success).toBe(true)
  }
})
