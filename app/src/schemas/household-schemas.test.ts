import { describe, expect, it } from 'vitest'
import { lintSchema } from 'deepspace/worker'
import { schemas } from '../schemas'
import { choresSchema, expensesSchema, householdsSchema, teamMembersSchema } from './household-schemas'

describe('household RBAC', () => {
  it('lets no client role create rows directly (membership-checked server actions only)', () => {
    for (const schema of [choresSchema, expensesSchema, householdsSchema, teamMembersSchema]) {
      for (const [role, perms] of Object.entries(schema.permissions)) {
        expect(perms.create, `${schema.name}.${role}.create`).toBe(false)
      }
    }
  })

  it('scopes every household collection to team membership', () => {
    expect(choresSchema.teamField).toBe('householdId')
    expect(expensesSchema.teamField).toBe('householdId')
    expect(householdsSchema.teamField).toBe('teamId')
    for (const schema of [choresSchema, expensesSchema, householdsSchema, teamMembersSchema]) {
      expect(schema.permissions.member.read).toBe('team')
    }
  })

  it('keeps chores pinned to their household and expenses immutable', () => {
    expect(choresSchema.permissions.member.writableFields).not.toContain('householdId')
    expect(expensesSchema.permissions.member.update).toBe(false)
  })

  it('passes the SDK schema lint', () => {
    for (const schema of schemas) expect(lintSchema(schema), schema.name).toEqual([])
  })
})
