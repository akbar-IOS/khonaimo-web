/**
 * Chores: add / assign / due date / repeat / mark done.
 * Writes go straight through useMutations('chores'); the RecordRoom checks the
 * caller is in this household ('team' RBAC) and broadcasts to every member.
 */

import { useState, type FormEvent } from 'react'
import { useMutations, type RecordData } from 'deepspace'
import { CalendarDays, Repeat as RepeatIcon, Trash2 } from 'lucide-react'
import { Button, Input, useToast } from '@/components/ui'
import { callAction } from '@/lib/actions'
import { cn } from '@/lib/utils'
import { friendlyDate, todayIn } from '@/lib/dates'
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

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={add} aria-label="Add a chore" className="space-y-3">
          <Input
            data-testid="chore-title"
            placeholder="Add a chore… e.g. Take out the trash"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Chore"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
              <Input id="chore-due" data-testid="chore-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="chore-repeat">Repeats</FieldLabel>
              <NativeSelect id="chore-repeat" data-testid="chore-repeat" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)}>
                <option value="none">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </NativeSelect>
            </div>
            <div className="col-span-2 flex items-end sm:col-span-1">
              <Button data-testid="add-chore" type="submit" className="w-full rounded-full" disabled={adding || !title.trim()}>
                Add chore
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <div className="flex items-center justify-between">
        <div role="tablist" aria-label="Filter chores" className="inline-flex rounded-full bg-secondary p-1 text-sm">
          {(['all', 'mine'] as const).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn('rounded-full px-3 py-1', filter === f ? 'bg-card font-semibold shadow-sm' : 'text-muted-foreground')}
            >
              {f === 'all' ? 'Everyone' : `Mine${mineOpen ? ` (${mineOpen})` : ''}`}
            </button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">{open.length} to do</span>
      </div>

      {open.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">
          All clear ✨ Nothing to do here.
        </p>
      )}

      <ul className="space-y-2" data-testid="chores-open">
        {open.map((c) => (
          <ChoreRow key={c.recordId} chore={c} today={today} members={members} assignee={byId.get(c.data.assigneeId ?? '')}
            onToggle={() => toggle(c)} onAssign={(id) => void put(c.recordId, { assigneeId: id })} onDelete={() => void remove(c.recordId)} disabled={!ready} />
        ))}
      </ul>

      {done.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-sm font-medium text-muted-foreground">
            ✓ Done ({done.length}) <span className="group-open:hidden">— show</span>
          </summary>
          <ul className="mt-2 space-y-2" data-testid="chores-done">
            {done.slice(0, 30).map((c) => (
              <ChoreRow key={c.recordId} chore={c} today={today} members={members} assignee={byId.get(c.data.assigneeId ?? '')}
                doneBy={byId.get(c.data.doneBy ?? '')}
                onToggle={() => toggle(c)} onAssign={(id) => void put(c.recordId, { assigneeId: id })} onDelete={() => void remove(c.recordId)} disabled={!ready} />
            ))}
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
  const overdue = !c.done && !!c.dueDate && c.dueDate < today
  return (
    <li
      data-testid="chore-row"
      data-done={c.done ? 'true' : 'false'}
      className={cn('flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]', c.done && 'opacity-70')}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={!!c.done}
        aria-label={c.done ? `Mark "${c.title}" not done` : `Mark "${c.title}" done`}
        data-testid="chore-toggle"
        className={cn(
          'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-sm transition-colors',
          c.done ? 'border-primary bg-primary text-primary-foreground' : 'border-input hover:border-primary',
        )}
      >
        {c.done ? '✓' : ''}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-medium', c.done && 'line-through')}>{c.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {c.dueDate && (
            <span className={cn('inline-flex items-center gap-1', overdue && 'font-semibold text-destructive')}>
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {overdue ? `Overdue · ${friendlyDate(c.dueDate, today)}` : friendlyDate(c.dueDate, today)}
            </span>
          )}
          {c.repeat && c.repeat !== 'none' && (
            <span className="inline-flex items-center gap-1"><RepeatIcon className="h-3.5 w-3.5" aria-hidden />{c.repeat}</span>
          )}
          {!!c.done && doneBy && <span>done by {firstName(doneBy.name)}</span>}
        </p>
      </div>
      <label className="flex items-center gap-1.5" title="Assigned to">
        {assignee && <MemberAvatar member={assignee} size={26} />}
        <select
          aria-label={`Assignee for ${c.title}`}
          className="max-w-24 truncate rounded-md bg-transparent text-xs text-muted-foreground outline-none"
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
      <button type="button" onClick={onDelete} disabled={disabled} aria-label={`Delete "${c.title}"`} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive">
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </li>
  )
}
