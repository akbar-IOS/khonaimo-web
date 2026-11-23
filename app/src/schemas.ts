/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 */

import type { CollectionSchema } from 'deepspace/schema'
import { usersSchema } from './schemas/users-schema'
import {
  householdsSchema,
  teamMembersSchema,
  choresSchema,
  expensesSchema,
} from './schemas/household-schemas'

export const schemas: CollectionSchema[] = [
  usersSchema,
  householdsSchema,
  teamMembersSchema,
  choresSchema,
  expensesSchema,
]

/** Shapes of `record.data` for each collection, shared by UI and worker. */
export type Household = { name: string; teamId: string; ownerId: string; inviteCode: string; emoji?: string }
export type TeamMember = { teamId: string; userId: string; status: 'active' | 'removed'; role: 'owner' | 'member'; name?: string }
export type Repeat = 'none' | 'daily' | 'weekly'
export type Chore = {
  householdId: string
  title: string
  assigneeId?: string
  dueDate?: string
  done: boolean
  doneAt?: string
  doneBy?: string
  repeat: Repeat
}
export type Expense = {
  householdId: string
  description: string
  amountCents: number
  payerId: string
  splitAmong: string[]
  spentOn?: string
}
