/**
 * KhonaiMo data model.
 *
 * A household is a DeepSpace "team": membership lives in the `team_members`
 * collection (teamId = household id), and every household-scoped collection
 * declares `teamField`, so the RecordRoom only sends a row to people who are
 * active members of that household. That is the whole privacy boundary —
 * nothing here relies on client-side filtering.
 *
 * Owner vs member:
 *   - `households.ownerId` is the ownerField. Members can read their household,
 *     only the owner can update it (rename). The worker enforces this.
 *   - Joining, removing a member and deleting a household go through server
 *     actions (src/actions/index.ts) that check ownership/invite codes first,
 *     because they touch rows the caller can't write directly.
 */

import type { CollectionSchema, RolePermissions } from 'deepspace/schema'

export const householdsSchema: CollectionSchema = {
  name: 'households',
  columns: [
    { name: 'name', storage: 'text', interpretation: 'plain', required: true },
    // Equal to the household's own recordId; lets 'team' RBAC apply to the household row itself.
    { name: 'teamId', storage: 'text', interpretation: 'plain', immutable: true },
    { name: 'ownerId', storage: 'text', interpretation: 'plain', immutable: true },
    { name: 'inviteCode', storage: 'text', interpretation: 'plain' },
    { name: 'emoji', storage: 'text', interpretation: 'plain' },
  ],
  teamField: 'teamId',
  ownerField: 'ownerId',
  permissions: {
    // Created only by the createHousehold action (it also creates the owner's membership).
    member: { read: 'team', create: false, update: 'own', delete: false, writableFields: ['name', 'emoji'] },
    admin: { read: 'team', create: false, update: 'own', delete: false, writableFields: ['name', 'emoji'] },
  },
}

export const teamMembersSchema: CollectionSchema = {
  name: 'team_members',
  columns: [
    { name: 'teamId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'userId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'status', storage: 'text', interpretation: { kind: 'select', options: ['active', 'removed'] } },
    { name: 'role', storage: 'text', interpretation: { kind: 'select', options: ['owner', 'member'] } },
    // Display name captured at join time (the users directory is the live source).
    { name: 'name', storage: 'text', interpretation: 'plain' },
  ],
  uniqueOn: ['teamId', 'userId'],
  teamField: 'teamId',
  ownerField: 'userId',
  permissions: {
    // Rows are written only by server actions (create/join/remove).
    member: { read: 'team', create: false, update: false, delete: false },
    admin: { read: 'team', create: false, update: false, delete: false },
  },
}

const choreMemberRules: RolePermissions = {
  read: 'team',
  create: true,
  update: 'team',
  delete: 'team',
  // householdId is set on create only; it can't be moved to another household.
  writableFields: ['householdId', 'title', 'assigneeId', 'dueDate', 'done', 'doneAt', 'doneBy', 'repeat'],
}

export const choresSchema: CollectionSchema = {
  name: 'chores',
  columns: [
    { name: 'householdId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    { name: 'assigneeId', storage: 'text', interpretation: 'plain' },
    { name: 'dueDate', storage: 'text', interpretation: 'plain' }, // YYYY-MM-DD
    { name: 'done', storage: 'number', interpretation: { kind: 'boolean' } },
    { name: 'doneAt', storage: 'text', interpretation: 'plain' },
    { name: 'doneBy', storage: 'text', interpretation: 'plain' },
    { name: 'repeat', storage: 'text', interpretation: { kind: 'select', options: ['none', 'daily', 'weekly'] } },
  ],
  teamField: 'householdId',
  permissions: {
    member: { ...choreMemberRules },
    admin: { ...choreMemberRules },
  },
}

const expenseMemberRules: RolePermissions = {
  read: 'team',
  create: true,
  update: 'team',
  delete: 'team',
  writableFields: ['householdId', 'description', 'amountCents', 'payerId', 'splitAmong', 'spentOn'],
}

export const expensesSchema: CollectionSchema = {
  name: 'expenses',
  columns: [
    { name: 'householdId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'description', storage: 'text', interpretation: 'plain', required: true },
    // Integer cents so equal splits stay penny-exact.
    { name: 'amountCents', storage: 'number', interpretation: 'plain', required: true },
    { name: 'payerId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'splitAmong', storage: 'text', interpretation: { kind: 'json' } }, // string[] of userIds
    { name: 'spentOn', storage: 'text', interpretation: 'plain' }, // YYYY-MM-DD
  ],
  teamField: 'householdId',
  permissions: {
    member: { ...expenseMemberRules },
    admin: { ...expenseMemberRules },
  },
}
