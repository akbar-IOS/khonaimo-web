/**
 * Server actions — household lifecycle.
 *
 * These run with RBAC off (see src/server/action-routes.ts), so every action
 * authorizes the caller itself before touching data:
 *   - createHousehold: any signed-in user; caller becomes owner.
 *   - joinHousehold:   caller must present the household's current invite code.
 *   - removeMember / deleteHousehold / regenerateInvite: caller must be the household's ownerId.
 *   - leaveHousehold:  caller removes their own membership (owners can't leave; they delete).
 *
 * Day-to-day data (chores, expenses, rename) does NOT go through here: it uses
 * useMutations directly and is enforced by the collection RBAC in
 * src/schemas/household-schemas.ts.
 */

import type { ActionHandler, ActionResult, ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import type { Household, TeamMember } from '../schemas'

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
  return (r.data as { record: Envelope<Household> }).record
}

async function findMembership(tools: ActionTools, teamId: string, userId: string): Promise<Envelope<TeamMember> | null> {
  const r = await tools.query('team_members', { where: { teamId, userId }, limit: 1 })
  if (!r.success) return null
  return ((r.data as { records: Envelope<TeamMember>[] }).records[0]) ?? null
}

async function callerName(tools: ActionTools, userId: string): Promise<string> {
  // Server code sees full users rows; keep only the display name.
  const r = await tools.get('users', userId)
  if (!r.success) return ''
  const data = (r.data as { record: { data: { name?: string } } }).record.data
  return str(data.name)
}

async function drain(tools: ActionTools, collection: string, where: Record<string, unknown>): Promise<void> {
  for (let i = 0; i < 50; i++) {
    const r = await tools.deleteWhere(collection, where, 500)
    if (!r.success || (r.data as { deleted: number }).deleted < 500) return
  }
}

export const actions: Record<string, ActionHandler<Env>> = {
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
    const household = (found.data as { records: Envelope<Household>[] }).records[0]
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
