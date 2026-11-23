/**
 * Chores: add / assign / due date / repeat / mark done.
 * Writes go straight through useMutations('chores'); the RecordRoom checks the
 * caller is in this household ('team' RBAC) and broadcasts to every member.
 */

import { useState, type FormEvent } from 'react'
import { useMutations, type RecordData } from 'deepspace'
import { CalendarDays, Check, Repeat as RepeatIcon, Trash2 } from 'lucide-react'
import { Button, Input, useToast } from '@/components/ui'
import { callAction } from '@/lib/actions'
import { cn } from '@/lib/utils'
import { friendlyDateInline, todayIn } from '@/lib/dates'
import { firstName, type Member } from '@/lib/household'
import type { Chore, Repeat } from '@/schemas'
import { Card, FieldLabel, MemberAvatar, NativeSelect } from './bits'

type Filter = 'all' | 'mine'

export function ChoresTab({
  householdId,
  chores,
  members,
  userId,
}: {
  householdId: string
  chores: RecordData<Chore>[]
  members: Member[]
  userId: string
}) {
  const { put, remove, ready } = useMutations<Chore>('chores')
  const { error } = useToast()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState(userId)
  const [dueDate, setDueDate] = useState(todayIn())
  const [repeat, setRepeat] = useState<Repeat>('none')
  const [filter, setFilter] = useState<Filter>('all')
  const today = todayIn()
  const byId = new Map(members.map((m) => [m.userId, m]))

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setAdding(true)
    try {
      // Server action: checks I'm an active member of this household before inserting.
      await callAction('addChore', { householdId, title, assigneeId, dueDate, repeat })
      setTitle('')
    } catch (err) {
      error('Couldn’t add chore', (err as Error).message)
    } finally {
      setAdding(false)
    }
  }

  function toggle(c: RecordData<Chore>) {
    const done = !c.data.done
    void put(c.recordId, { done, doneAt: done ? new Date().toISOString() : '', doneBy: done ? userId : '' })
  }

  const visible = chores.filter((c) => filter === 'all' || c.data.assigneeId === userId)
  const open = visible
    .filter((c) => !c.data.done)
    .sort((a, b) => (a.data.dueDate || '9999').localeCompare(b.data.dueDate || '9999'))
  const done = visible
    .filter((c) => c.data.done)
    .sort((a, b) => (b.data.doneAt || '').localeCompare(a.data.doneAt || ''))
  const mineOpen = chores.filter((c) => !c.data.done && c.data.assigneeId === userId).length

  const row = (c: RecordData<Chore>) => (
    <ChoreRow
      key={c.recordId}
      chore={c}
      today={today}
      members={members}
      assignee={byId.get(c.data.assigneeId ?? '')}
      doneBy={byId.get(c.data.doneBy ?? '')}
      onToggle={() => toggle(c)}
      onAssign={(id) => void put(c.recordId, { assigneeId: id })}
      onDelete={() => void remove(c.recordId)}
      disabled={!ready}
    />
  )

  return (
    <div className="space-y-5">
      <Card>
        <form onSubmit={add} aria-label="Add a chore" className="space-y-3">
          <label htmlFor="chore-title" className="sr-only">Chore</label>
          <Input
            id="chore-title"
            data-testid="chore-title"
            className="h-12 text-base"
            placeholder="What needs doing? e.g. Take out the trash…"
            autoComplete="off"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.3fr_1fr_1fr_auto]">
            <div className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="chore-assignee">Who</FieldLabel>
              <NativeSelect id="chore-assignee" data-testid="chore-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.userId === userId ? `${m.name} (me)` : m.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <FieldLabel htmlFor="chore-due">Due</FieldLabel>
              <Input id="chore-due" data-testid="chore-due" type="date" className="h-11" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="chore-repeat">Repeats</FieldLabel>
              <NativeSelect id="chore-repeat" data-testid="chore-repeat" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)}>
                <option value="none">Once</option>
                <option value="daily">Every day</option>
                <option value="weekly">Every week</option>
              </NativeSelect>
            </div>
            <div className="col-span-2 flex items-end sm:col-span-1">
              <Button data-testid="add-chore" type="submit" className="km-press min-h-11 w-full rounded-full px-6" disabled={adding || !title.trim()}>
                {adding ? 'Adding…' : 'Add chore'}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <div role="group" aria-label="Show chores for" className="inline-flex rounded-full bg-secondary p-1 text-sm">
          {(['all', 'mine'] as const).map((f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn('min-h-10 rounded-full px-4', filter === f ? 'bg-card font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              {f === 'all' ? 'Everyone' : `Mine${mineOpen ? ` (${mineOpen})` : ''}`}
            </button>
          ))}
        </div>
        <span className="tabular text-sm text-muted-foreground">{open.length} to do</span>
      </div>

      {open.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-input px-6 py-10 text-center">
          <p className="font-display text-xl font-extrabold">
            {chores.length === 0 ? 'No chores yet' : filter === 'mine' ? 'Nothing on your plate' : 'Everything’s done'}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {chores.length === 0
              ? 'Add the first one above. Set it to repeat and it comes back on its own.'
              : filter === 'mine'
                ? 'Nothing assigned to you is open. Switch to Everyone to help out.'
                : 'Repeating chores come back on their next due date, overnight.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card" data-testid="chores-open">
          {open.map(row)}
        </ul>
      )}

      {done.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-saffron text-[11px] text-foreground" aria-hidden>✓</span>
            Done recently ({done.length})
            <span className="group-open:hidden">, show</span>
          </summary>
          <ul className="mt-1 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card" data-testid="chores-done">
            {done.slice(0, 30).map(row)}
          </ul>
        </details>
      )}
    </div>
  )
}

function ChoreRow({
  chore,
  today,
  members,
  assignee,
  doneBy,
  onToggle,
  onAssign,
  onDelete,
  disabled,
}: {
  chore: RecordData<Chore>
  today: string
  members: Member[]
  assignee?: Member
  doneBy?: Member
  onToggle: () => void
  onAssign: (userId: string) => void
  onDelete: () => void
  disabled: boolean
}) {
  const c = chore.data
  const isDone = !!c.done
  const overdue = !isDone && !!c.dueDate && c.dueDate < today
  const repeatLabel = c.repeat === 'daily' ? 'every day' : c.repeat === 'weekly' ? 'every week' : ''
  return (
    <li data-testid="chore-row" data-done={isDone ? 'true' : 'false'} className="flex items-center gap-2 py-1.5 pl-1.5 pr-2">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={isDone}
        aria-label={isDone ? `Mark "${c.title}" not done` : `Mark "${c.title}" done`}
        data-testid="chore-toggle"
        className="group grid h-11 w-11 shrink-0 place-items-center rounded-full"
      >
        <span
          className={cn(
            'grid h-7 w-7 place-items-center rounded-full border-2 transition-colors',
            isDone ? 'km-pop border-saffron bg-saffron text-foreground' : 'border-input group-hover:border-primary',
          )}
        >
          {isDone && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
        </span>
      </button>
      <div className="min-w-0 flex-1 py-1">
        <p className={cn('truncate font-medium', isDone && 'text-muted-foreground line-through')}>{c.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {isDone && doneBy ? (
            <span>Done by {firstName(doneBy.name)}</span>
          ) : (
            c.dueDate && (
              <span className={cn('inline-flex items-center gap-1', overdue && 'font-semibold text-pomegranate')}>
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {overdue ? `Overdue, was due ${friendlyDateInline(c.dueDate, today)}` : `Due ${friendlyDateInline(c.dueDate, today)}`}
              </span>
            )
          )}
          {repeatLabel && (
            <span className="inline-flex items-center gap-1"><RepeatIcon className="h-3.5 w-3.5" aria-hidden />{repeatLabel}</span>
          )}
        </p>
      </div>
      <label className="flex min-h-11 items-center gap-1.5 rounded-full pl-1 pr-1.5 hover:bg-secondary">
        {assignee ? <MemberAvatar member={assignee} size={28} /> : <span className="h-7 w-7 rounded-full border-2 border-dashed border-input" aria-hidden />}
        <select
          aria-label={`Who does "${c.title}"`}
          className="max-w-[5.5rem] cursor-pointer truncate bg-transparent text-xs font-medium text-muted-foreground outline-none"
          value={c.assigneeId ?? ''}
          disabled={disabled}
          onChange={(e) => onAssign(e.target.value)}
        >
          <option value="">Anyone</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>{firstName(m.name)}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        aria-label={`Delete "${c.title}"`}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </li>
  )
}
