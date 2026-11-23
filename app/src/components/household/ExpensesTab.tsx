/**
 * Shared expenses + running balances ("who owes whom").
 * Expenses are plain records; balances are derived on the client from the
 * live query, so every member's view updates the moment anyone adds one.
 */

import { useMemo, useState, type FormEvent } from 'react'
import { useMutations, type RecordData } from 'deepspace'
import { ArrowRight, Trash2 } from 'lucide-react'
import { Button, Input, useToast } from '@/components/ui'
import { callAction } from '@/lib/actions'
import { cn } from '@/lib/utils'
import { formatMoney, netBalances, parseMoney, settleUp } from '@/lib/balances'
import { friendlyDateInline, todayIn } from '@/lib/dates'
import { firstName, type Member } from '@/lib/household'
import type { Expense } from '@/schemas'
import { Card, FieldLabel, MemberAvatar, NativeSelect } from './bits'

export function ExpensesTab({
  householdId,
  expenses,
  members,
  userId,
}: {
  householdId: string
  expenses: RecordData<Expense>[]
  members: Member[]
  userId: string
}) {
  const { remove, ready } = useMutations<Expense>('expenses')
  const [adding, setAdding] = useState(false)
  const { error } = useToast()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [payerId, setPayerId] = useState(userId)
  const [split, setSplit] = useState<Set<string> | null>(null) // null = everyone
  const byId = new Map(members.map((m) => [m.userId, m]))
  const nameOf = (id: string) => (id === userId ? 'You' : firstName(byId.get(id)?.name ?? 'Former member'))

  const splitIds = split ? [...split] : members.map((m) => m.userId)
  const net = useMemo(() => netBalances(expenses.map((e) => e.data)), [expenses])
  const transfers = useMemo(() => settleUp(net), [net])
  const myNet = net.get(userId) ?? 0
  const total = expenses.reduce((s, e) => s + (e.data.description === 'Settle up' ? 0 : e.data.amountCents), 0)

  function toggleSplit(id: string) {
    const next = new Set(splitIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSplit(next)
  }

  /** Server action: checks I'm an active member and payer/split are members before inserting. */
  async function submitExpense(payload: Omit<Expense, 'householdId' | 'spentOn'>): Promise<boolean> {
    setAdding(true)
    try {
      await callAction('addExpense', { householdId, spentOn: todayIn(), ...payload })
      return true
    } catch (err) {
      error('Couldn’t save expense', (err as Error).message)
      return false
    } finally {
      setAdding(false)
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    const cents = parseMoney(amount)
    if (!cents) return error('Check the amount', 'Use a positive number like 12.50')
    if (splitIds.length === 0) return error('Pick who it’s split between')
    const ok = await submitExpense({ description: description.trim(), amountCents: cents, payerId, splitAmong: splitIds })
    if (ok) {
      setDescription('')
      setAmount('')
      setSplit(null)
    }
  }

  function recordPayment(from: string, to: string, cents: number) {
    // A payment is an expense paid by the debtor and "split" entirely to the creditor.
    void submitExpense({ description: 'Settle up', amountCents: cents, payerId: from, splitAmong: [to] })
  }

  return (
    <div className="space-y-4">
      <Card className={cn('border-2', myNet > 0 ? 'border-leaf/40 bg-[#eef7f1]' : myNet < 0 ? 'border-pomegranate/30 bg-[#fbefef]' : '')}>
        <p className="text-sm text-muted-foreground">Your balance</p>
        <p data-testid="my-balance" className={cn('font-display tabular mt-1 text-3xl font-extrabold', myNet > 0 && 'text-[#1f6e4b]', myNet < 0 && 'text-pomegranate')}>
          {myNet === 0 ? 'You’re all square' : myNet > 0 ? `You’re owed ${formatMoney(myNet)}` : `You owe ${formatMoney(-myNet)}`}
        </p>
        <p className="tabular mt-1 text-sm text-muted-foreground">The household has logged {formatMoney(total)} of shared costs.</p>

        {transfers.length > 0 && (
          <ul className="mt-4 space-y-2" data-testid="settle-up">
            {transfers.map((t) => (
              <li key={`${t.from}-${t.to}`} data-testid="transfer" className="flex min-h-14 flex-wrap items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm">
                <span className={cn('font-semibold', t.from === userId && 'text-destructive')}>{nameOf(t.from)}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-label="pays" />
                <span className={cn('font-semibold', t.to === userId && 'text-[#1f6e4b]')}>{nameOf(t.to)}</span>
                <span className="tabular ml-auto font-semibold">{formatMoney(t.cents)}</span>
                {(t.from === userId || t.to === userId) && (
                  <Button size="sm" variant="outline" className="km-press min-h-10 rounded-full" disabled={adding} onClick={() => recordPayment(t.from, t.to, t.cents)}>
                    Mark paid
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <form onSubmit={add} aria-label="Add an expense" className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Input
              data-testid="expense-description"
              className="col-span-2"
              placeholder="e.g. Groceries…"
              autoComplete="off"
              value={description}
              maxLength={120}
              onChange={(e) => setDescription(e.target.value)}
              aria-label="Description"
            />
            <Input
              data-testid="expense-amount"
              inputMode="decimal"
              placeholder="$0.00"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Amount in dollars"
            />
          </div>
          <div>
            <FieldLabel htmlFor="expense-payer">Paid by</FieldLabel>
            <NativeSelect id="expense-payer" data-testid="expense-payer" value={payerId} onChange={(e) => setPayerId(e.target.value)}>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>{m.userId === userId ? `${m.name} (me)` : m.name}</option>
              ))}
            </NativeSelect>
          </div>
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-muted-foreground">Split equally between</legend>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const on = splitIds.includes(m.userId)
                return (
                  <button
                    type="button"
                    key={m.userId}
                    role="checkbox"
                    aria-checked={on}
                    data-testid="split-member"
                    onClick={() => toggleSplit(m.userId)}
                    className={cn(
                      'flex min-h-11 items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm',
                      on ? 'border-primary bg-primary/10 font-medium' : 'border-border text-muted-foreground',
                    )}
                  >
                    <MemberAvatar member={m} size={22} />
                    {firstName(m.name)}
                  </button>
                )
              })}
            </div>
            {splitIds.length > 0 && parseMoney(amount) && (
              <p className="mt-2 text-xs text-muted-foreground">
                ≈ {formatMoney(Math.ceil(parseMoney(amount)! / splitIds.length))} each
              </p>
            )}
          </fieldset>
          <Button data-testid="add-expense" type="submit" className="km-press min-h-11 w-full rounded-full" disabled={adding || !description.trim() || !amount.trim()}>
            Add expense
          </Button>
        </form>
      </Card>

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card" data-testid="expense-list">
        {expenses.length === 0 && (
          <li className="px-6 py-10 text-center"><p className="font-display text-xl font-extrabold">No shared costs yet</p><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Log the next grocery run or bill above, and KhonaiMo works out who owes whom.</p></li>
        )}
        {expenses.map((e) => {
          const x = e.data
          const settle = x.description === 'Settle up'
          return (
            <li key={e.recordId} data-testid="expense-row" className="flex items-center gap-3 py-2 pl-3 pr-1.5">
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-lg">{settle ? '🤝' : '🧾'}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {settle ? `${nameOf(x.payerId)} paid ${nameOf(x.splitAmong?.[0] ?? '')}` : x.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {settle ? 'Payment' : `${nameOf(x.payerId)} paid, split ${x.splitAmong?.length ?? 0} ways`}
                  {x.spentOn && `, ${friendlyDateInline(x.spentOn)}`}
                </p>
              </div>
              <span className="tabular font-semibold">{formatMoney(x.amountCents)}</span>
              <button type="button" onClick={() => void remove(e.recordId)} disabled={!ready} aria-label={`Delete ${x.description}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-destructive">
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
