/**
 * Server actions — household lifecycle.
 *
 * These run with RBAC off (see src/server/action-routes.ts), so every action
 * authorizes the caller itself before touching data:
 *   - createHousehold: any signed-in user; caller becomes owner.
 *   - joinHousehold:   caller must present the household's current invite code.
 *   - removeMember / deleteHousehold / regenerateInvite: caller must be the household's ownerId.
 *   - leaveHousehold:  caller removes their own membership (owners can't leave; they delete).
 *   - addChore / addExpense: caller must be an ACTIVE member of the household, and every
 *     user id in the payload (assignee, payer, split) must be an active member too.
 *
 * Creating chores/expenses lives here because DeepSpace's `create` permission is a
 * plain boolean and can't check household membership. Everything else on existing rows
 * (toggle done, reassign, delete, rename) uses useMutations and is enforced by the
 * collection RBAC in src/schemas/household-schemas.ts.
 */

import type { ActionHandler, ActionResult, ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import type { Chore, Expense, Household, Repeat, TeamMember } from '../schemas'

type Envelope<T> = { recordId: string; data: T }

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I

function newInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join('')
}

function str(v: unknown, max = 80): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

async function getHousehold(tools: ActionTools, householdId: string): Promise<Envelope<Household> | null> {
  if (!householdId) return null
  const r = await tools.get('households', householdId)
  if (!r.success) return null
  return (r.data as unknown as { record: Envelope<Household> }).record
}

async function findMembership(tools: ActionTools, teamId: string, userId: string): Promise<Envelope<TeamMember> | null> {
  const r = await tools.query('team_members', { where: { teamId, userId }, limit: 1 })
  if (!r.success) return null
  return ((r.data as unknown as { records: Envelope<TeamMember>[] }).records[0]) ?? null
}

/** userIds of the household's active members — or null if `userId` isn't one of them. */
async function activeMembersIfMember(tools: ActionTools, householdId: string, userId: string): Promise<Set<string> | null> {
  if (!householdId) return null
  const r = await tools.query('team_members', { where: { teamId: householdId }, limit: 500 })
  if (!r.success) return null
  const rows = (r.data as unknown as { records: Envelope<TeamMember>[] }).records
  const active = new Set(rows.filter((m) => m.data.status !== 'removed').map((m) => m.data.userId))
  return active.has(userId) ? active : null
}

const NOT_MEMBER = 'You are not a member of this household.'

function ymd(v: unknown): string {
  const s = str(v, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
}

async function callerName(tools: ActionTools, userId: string): Promise<string> {
  // Server code sees full users rows; keep only the display name.
  const r = await tools.get('users', userId)
  if (!r.success) return ''
  const data = (r.data as unknown as { record: { data: { name?: string } } }).record.data
  return str(data.name)
}

async function drain(tools: ActionTools, collection: string, where: Record<string, unknown>): Promise<void> {
  for (let i = 0; i < 50; i++) {
    const r = await tools.deleteWhere(collection, where, 500)
    if (!r.success || (r.data as { deleted: number }).deleted < 500) return
  }
}

export const actions: Record<string, ActionHandler<Env>> = {
  addChore: async ({ userId, params, tools }): Promise<ActionResult<{ recordId: string }>> => {
    const householdId = str(params.householdId)
    const members = await activeMembersIfMember(tools, householdId, userId)
    if (!members) return { success: false, error: NOT_MEMBER }
    const title = str(params.title, 120)
    if (!title) return { success: false, error: 'Give the chore a name.' }
    const assigneeId = str(params.assigneeId)
    if (assigneeId && !members.has(assigneeId)) return { success: false, error: 'Assignee must be in this household.' }
    const repeat = (['none', 'daily', 'weekly'] as const).find((r) => r === params.repeat) ?? 'none'
    const chore: Chore = { householdId, title, assigneeId, dueDate: ymd(params.dueDate), done: false, repeat: repeat as Repeat }
    const r = await tools.create('chores', chore)
    if (!r.success) return r
    return { success: true, data: { recordId: r.data.recordId } }
  },

  addExpense: async ({ userId, params, tools }): Promise<ActionResult<{ recordId: string }>> => {
    const householdId = str(params.householdId)
    const members = await activeMembersIfMember(tools, householdId, userId)
    if (!members) return { success: false, error: NOT_MEMBER }
    const description = str(params.description, 120)
    if (!description) return { success: false, error: 'Describe the expense.' }
    const amountCents = Number(params.amountCents)
    if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > 10_000_000) {
      return { success: false, error: 'Amount must be between $0.01 and $100,000.' }
    }
    const payerId = str(params.payerId)
    if (!members.has(payerId)) return { success: false, error: 'Payer must be in this household.' }
    const split = Array.isArray(params.splitAmong) ? [...new Set(params.splitAmong.map((v) => str(v)))] : []
    if (split.length === 0 || split.some((id) => !members.has(id))) {
      return { success: false, error: 'Split must be between members of this household.' }
    }
    const expense: Expense = { householdId, description, amountCents, payerId, splitAmong: split, spentOn: ymd(params.spentOn) }
    const r = await tools.create('expenses', expense)
    if (!r.success) return r
    return { success: true, data: { recordId: r.data.recordId } }
  },

  createHousehold: async ({ userId, params, tools }): Promise<ActionResult<{ householdId: string }>> => {
    const name = str(params.name)
    if (!name) return { success: false, error: 'Give your household a name.' }
    const emoji = str(params.emoji, 8) || '🏠'
    const householdId = `hh_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`

    const created = await tools.create(
      'households',
      { name, emoji, teamId: householdId, ownerId: userId, inviteCode: newInviteCode() },
      householdId,
    )
    if (!created.success) return created
    const member = await tools.create('team_members', {
      teamId: householdId,
      userId,
      status: 'active',
      role: 'owner',
      name: await callerName(tools, userId),
    })
    if (!member.success) return member
    return { success: true, data: { householdId } }
  },

  joinHousehold: async ({ userId, params, tools }): Promise<ActionResult<{ householdId: string; alreadyMember: boolean }>> => {
    const code = str(params.code, 12).toUpperCase()
    if (!code) return { success: false, error: 'Enter an invite code.' }
    const found = await tools.query('households', { where: { inviteCode: code }, limit: 1 })
    if (!found.success) return found
    const household = (found.data as unknown as { records: Envelope<Household>[] }).records[0]
    if (!household) return { success: false, error: 'No household uses that invite code.' }
    const householdId = household.recordId

    const existing = await findMembership(tools, householdId, userId)
    if (existing?.data.status === 'active') {
      return { success: true, data: { householdId, alreadyMember: true } }
    }
    const name = await callerName(tools, userId)
    const r = existing
      ? await tools.update('team_members', existing.recordId, { status: 'active', name })
      : await tools.create('team_members', { teamId: householdId, userId, status: 'active', role: 'member', name })
    if (!r.success) return r
    return { success: true, data: { householdId, alreadyMember: false } }
  },

  removeMember: async ({ userId, params, tools }): Promise<ActionResult<{ removed: string }>> => {
    const household = await getHousehold(tools, str(params.householdId))
    if (!household) return { success: false, error: 'Household not found.' }
    if (household.data.ownerId !== userId) return { success: false, error: 'Only the owner can remove members.' }
    const target = str(params.userId)
    if (target === userId) return { success: false, error: 'The owner cannot remove themselves.' }
    const membership = await findMembership(tools, household.recordId, target)
    if (!membership) return { success: false, error: 'That person is not a member.' }
    const r = await tools.update('team_members', membership.recordId, { status: 'removed' })
    if (!r.success) return r
    return { success: true, data: { removed: target } }
  },

  leaveHousehold: async ({ userId, params, tools }): Promise<ActionResult<{ left: string }>> => {
    const household = await getHousehold(tools, str(params.householdId))
    if (!household) return { success: false, error: 'Household not found.' }
    if (household.data.ownerId === userId) {
      return { success: false, error: 'Owners can’t leave — delete the household instead.' }
    }
    const membership = await findMembership(tools, household.recordId, userId)
    if (!membership) return { success: false, error: 'You are not a member.' }
    const r = await tools.update('team_members', membership.recordId, { status: 'removed' })
    if (!r.success) return r
    return { success: true, data: { left: household.recordId } }
  },

  regenerateInvite: async ({ userId, params, tools }): Promise<ActionResult<{ inviteCode: string }>> => {
    const household = await getHousehold(tools, str(params.householdId))
    if (!household) return { success: false, error: 'Household not found.' }
    if (household.data.ownerId !== userId) return { success: false, error: 'Only the owner can reset the invite code.' }
    const inviteCode = newInviteCode()
    const r = await tools.update('households', household.recordId, { inviteCode })
    if (!r.success) return r
    return { success: true, data: { inviteCode } }
  },

  deleteHousehold: async ({ userId, params, tools }): Promise<ActionResult<{ deleted: string }>> => {
    const household = await getHousehold(tools, str(params.householdId))
    if (!household) return { success: false, error: 'Household not found.' }
    if (household.data.ownerId !== userId) return { success: false, error: 'Only the owner can delete the household.' }
    const id = household.recordId
    await drain(tools, 'chores', { householdId: id })
    await drain(tools, 'expenses', { householdId: id })
    await drain(tools, 'team_members', { teamId: id })
    const r = await tools.remove('households', id)
    if (!r.success) return r
    return { success: true, data: { deleted: id } }
  },
}
