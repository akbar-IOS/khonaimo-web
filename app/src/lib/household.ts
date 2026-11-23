/**
 * Hooks that read one household's data. Every query here is already scoped by
 * the server: the RecordRoom only sends rows from households the caller is an
 * active member of ('team' RBAC), so `where: { householdId }` just narrows
 * which of *my* households I'm looking at.
 */

import { useMemo } from 'react'
import { useAuth, useQuery, useUserLookup } from 'deepspace'
import type { Chore, Expense, Household, TeamMember } from '../schemas'

export type Member = { userId: string; name: string; role: 'owner' | 'member'; imageUrl?: string }

export function useMyHouseholds() {
  const { userId } = useAuth()
  const memberships = useQuery<TeamMember>('team_members', { where: { userId: userId ?? '' } })
  const households = useQuery<Household>('households', { orderBy: 'createdAt' })
  const active = new Set(
    memberships.records.filter((m) => m.data.status !== 'removed').map((m) => m.data.teamId),
  )
  return {
    households: households.records.filter((h) => active.has(h.recordId)),
    loading: memberships.status === 'loading' || households.status === 'loading',
  }
}

export function useHousehold(householdId: string) {
  const { userId } = useAuth()
  const { getUser } = useUserLookup()
  const hh = useQuery<Household>('households', { where: { teamId: householdId } })
  const tm = useQuery<TeamMember>('team_members', { where: { teamId: householdId } })
  const chores = useQuery<Chore>('chores', { where: { householdId }, orderBy: 'createdAt' })
  const expenses = useQuery<Expense>('expenses', { where: { householdId }, orderBy: 'createdAt', orderDir: 'desc' })

  const members: Member[] = useMemo(
    () =>
      tm.records
        .filter((r) => r.data.status !== 'removed')
        .map((r) => {
          const u = getUser(r.data.userId)
          return {
            userId: r.data.userId,
            name: u?.name || r.data.name || 'Housemate',
            role: r.data.role,
            imageUrl: u?.imageUrl,
          }
        })
        .sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.name.localeCompare(b.name))),
    [tm.records, getUser],
  )

  const household = hh.records[0] ?? null
  const loading = [hh, tm, chores, expenses].some((q) => q.status === 'loading')
  const me = members.find((m) => m.userId === userId)

  return {
    household,
    members,
    chores: chores.records,
    expenses: expenses.records,
    loading,
    isOwner: !!household && household.data.ownerId === userId,
    isMember: !!me,
    userId,
  }
}

export function firstName(name: string): string {
  return name.split(/\s+/)[0] || name
}
