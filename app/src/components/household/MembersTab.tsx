/**
 * Members, invites and household settings.
 *
 * Owner-only controls are hidden for members, but the real enforcement is
 * server-side: rename is gated by `households` RBAC (update: 'own' on ownerId),
 * and remove / reset-invite / delete are server actions that check ownerId.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCronMonitor, useMutations, useUser, type RecordData } from 'deepspace'
import { Check, Copy, Crown, RefreshCw } from 'lucide-react'
import { Button, ConfirmModal, Input, useToast } from '@/components/ui'
import { callAction } from '@/lib/actions'
import type { Member } from '@/lib/household'
import { SCOPE_ID } from '@/constants'
import { RESET_TASK } from '@/cron-names'
import type { Household } from '@/schemas'
import { Card, MemberAvatar } from './bits'

export function MembersTab({
  household,
  members,
  online,
  isOwner,
  userId,
}: {
  household: RecordData<Household>
  members: Member[]
  online: Set<string>
  isOwner: boolean
  userId: string
}) {
  const householdId = household.recordId
  const navigate = useNavigate()
  const { success, error } = useToast()
  const { putConfirmed, ready } = useMutations<Household>('households')
  const [name, setName] = useState(household.data.name)
  const [copied, setCopied] = useState(false)
  const [confirm, setConfirm] = useState<null | { kind: 'remove'; member: Member } | { kind: 'delete' } | { kind: 'leave' }>(null)
  const [busy, setBusy] = useState(false)
  const inviteLink = `${window.location.origin}/join/${household.data.inviteCode}`

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteLink).catch(() => undefined)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function rename() {
    try {
      await putConfirmed(householdId, { name: name.trim().slice(0, 60) })
      success('Household renamed')
    } catch (err) {
      error('Rename refused', (err as Error).message)
    }
  }

  async function run(action: string, params: Record<string, unknown>, after?: () => void) {
    setBusy(true)
    try {
      await callAction(action, params)
      after?.()
    } catch (err) {
      error('Something went wrong', (err as Error).message)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-semibold">Invite housemates</h2>
        <p className="mt-1 text-sm text-muted-foreground">Share the code or the link. Anyone with it can join.</p>
        <div className="mt-3 flex items-center gap-2">
          <code data-testid="invite-code" className="rounded-xl bg-secondary px-4 py-2 font-mono text-xl font-bold tracking-[0.3em]">
            {household.data.inviteCode}
          </code>
          <Button variant="outline" className="rounded-full" onClick={copyInvite}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? 'Copied' : 'Copy link'}
          </Button>
          {isOwner && (
            <Button variant="ghost" size="icon" aria-label="Reset invite code" title="Reset invite code" disabled={busy}
              onClick={() => run('regenerateInvite', { householdId })}>
              <RefreshCw aria-hidden />
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Members ({members.length})</h2>
        <ul className="mt-3 divide-y divide-border" data-testid="member-list">
          {members.map((m) => (
            <li key={m.userId} data-testid="member-row" className="flex items-center gap-3 py-2.5">
              <MemberAvatar member={m} online={online.has(m.userId)} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.name}{m.userId === userId && ' (you)'}</p>
                <p className="text-xs text-muted-foreground">{online.has(m.userId) ? 'Online now' : 'Offline'}</p>
              </div>
              {m.role === 'owner' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                  <Crown className="h-3.5 w-3.5" aria-hidden /> Owner
                </span>
              ) : isOwner ? (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirm({ kind: 'remove', member: m })}>
                  Remove
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Member</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <DailyResetCard />

      {isOwner ? (
        <Card>
          <h2 className="font-semibold">Household settings</h2>
          <div className="mt-3 flex gap-2">
            <Input data-testid="rename-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-label="Household name" />
            <Button data-testid="rename-save" variant="outline" disabled={!ready || !name.trim() || name.trim() === household.data.name} onClick={rename}>
              Rename
            </Button>
          </div>
          <Button variant="destructive" className="mt-4 rounded-full" onClick={() => setConfirm({ kind: 'delete' })}>
            Delete household
          </Button>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-muted-foreground">Only the owner can rename the household, remove members, or delete it.</p>
          <Button variant="outline" className="mt-3 rounded-full" onClick={() => setConfirm({ kind: 'leave' })}>
            Leave household
          </Button>
        </Card>
      )}

      <ConfirmModal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        loading={busy}
        variant="destructive"
        title={
          confirm?.kind === 'remove' ? `Remove ${confirm.member.name}?`
          : confirm?.kind === 'delete' ? `Delete “${household.data.name}”?`
          : 'Leave this household?'
        }
        description={
          confirm?.kind === 'delete'
            ? 'This permanently deletes all chores and expenses for everyone. It can’t be undone.'
            : confirm?.kind === 'remove'
              ? 'They will lose access immediately. Their past expenses stay in the balances.'
              : 'You’ll lose access until someone invites you again.'
        }
        confirmText={confirm?.kind === 'delete' ? 'Delete' : confirm?.kind === 'remove' ? 'Remove' : 'Leave'}
        onConfirm={() => {
          if (confirm?.kind === 'remove') void run('removeMember', { householdId, userId: confirm.member.userId })
          else if (confirm?.kind === 'delete') void run('deleteHousehold', { householdId }, () => navigate('/home'))
          else if (confirm?.kind === 'leave') void run('leaveHousehold', { householdId }, () => window.location.assign('/home'))
        }}
      />
    </div>
  )
}

/** Shows the scheduled chore-reset job (DeepSpace CronRoom) — next run and last result. */
function DailyResetCard() {
  const { tasks, history, connected, canWrite, trigger } = useCronMonitor(SCOPE_ID)
  const { user } = useUser()
  const { success, error } = useToast()
  const [running, setRunning] = useState(false)
  const task = tasks.find((t) => t.name === RESET_TASK)
  const last = history
    .filter((h) => h.taskName === RESET_TASK)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
  const isAppAdmin = user?.role === 'admin'

  async function runNow() {
    setRunning(true)
    const receipt = await trigger(RESET_TASK)
    setRunning(false)
    if (receipt.ok) success('Recurring chores reset')
    else error('Reset failed', receipt.error ?? receipt.reason)
  }

  return (
    <Card>
      <h2 className="font-semibold">🔁 Daily chore reset</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Every night at 12:05 AM (New York time) a scheduled job reopens finished daily and weekly chores on their next due date.
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm" data-testid="cron-status">
        <div className="rounded-xl bg-secondary p-2.5">
          <dt className="text-xs text-muted-foreground">Next run</dt>
          <dd className="font-medium">{task?.nextRunAt ? new Date(task.nextRunAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : connected ? '—' : 'Connecting…'}</dd>
        </div>
        <div className="rounded-xl bg-secondary p-2.5">
          <dt className="text-xs text-muted-foreground">Last run</dt>
          <dd className="font-medium" data-testid="cron-last-run">
            {last ? `${last.success ? 'OK' : 'Failed'} · ${new Date(last.startedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'Not yet'}
          </dd>
        </div>
      </dl>
      {isAppAdmin && (
        <Button data-testid="cron-run-now" variant="outline" size="sm" className="mt-3 rounded-full" disabled={!canWrite || running} onClick={runNow}>
          {running ? 'Running…' : 'Run now (app admin)'}
        </Button>
      )}
    </Card>
  )
}
