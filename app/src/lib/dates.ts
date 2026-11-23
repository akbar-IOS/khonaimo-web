/** Date helpers on plain `YYYY-MM-DD` strings (safe in both browser and worker). */

/** Today's calendar date in an IANA timezone, as YYYY-MM-DD. */
export function todayIn(timeZone?: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

/** Roll `due` forward by the repeat interval until it is on/after `today`. */
export function nextDueDate(due: string, repeat: 'daily' | 'weekly', today: string): string {
  const step = repeat === 'daily' ? 1 : 7
  let next = addDays(due, step)
  while (next < today) next = addDays(next, step)
  return next
}

/** "Today", "Tomorrow", "Yesterday", or e.g. "Mon, Nov 24". */
export function friendlyDate(ymd: string, today = todayIn()): string {
  if (ymd === today) return 'Today'
  if (ymd === addDays(today, 1)) return 'Tomorrow'
  if (ymd === addDays(today, -1)) return 'Yesterday'
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
