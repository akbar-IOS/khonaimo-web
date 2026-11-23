/**
 * Scheduled tasks, run by AppCronRoom (worker.ts) on a Durable Object alarm.
 *
 * reset-recurring-chores — every day at 00:05 New York time, each repeating
 * chore that is done and whose due date has arrived is "reopened": its due
 * date rolls forward by its interval (1 or 7 days) until it is today or later,
 * and `done` is cleared. So "Take out trash (daily)" checked off today shows up
 * again tomorrow morning, for every household, without anyone re-adding it.
 */

import type { CronTask } from 'deepspace/worker'
import { buildCronContext } from 'deepspace/worker'
import type { Env } from '../worker'
import { reopenPatch, todayIn } from './lib/dates'

import { RESET_TASK, RESET_TIMEZONE } from './cron-names'

export const tasks: CronTask[] = [
  { name: RESET_TASK, schedule: '5 0 * * *', timezone: RESET_TIMEZONE },
]

type ChoreRow = { recordId: string; data: { done?: boolean | number; dueDate?: string; repeat?: string } }

export async function runTask(name: string, env: Env): Promise<void> {
  if (name !== RESET_TASK) return
  const ctx = buildCronContext(env, env.OWNER_USER_ID, `app:${env.DEEPSPACE_APP_ID}`)
  const today = todayIn(RESET_TIMEZONE)
  let reopened = 0

  for (const repeat of ['daily', 'weekly'] as const) {
    const rows = (await ctx.records.query('chores', { where: { repeat }, limit: 5000 })) as ChoreRow[]
    for (const row of rows) {
      const patch = reopenPatch(row.data, today)
      if (!patch) continue
      await ctx.records.update('chores', row.recordId, patch)
      reopened++
    }
  }
  console.info(`[cron] ${RESET_TASK}: reopened ${reopened} chore(s) for ${today}`)
}
