/** /h/:id — one household: chores, expenses, members. Requires sign-in. */

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHousehold } from '@/lib/household'
import { ChoresTab } from '@/components/household/ChoresTab'
import { ExpensesTab } from '@/components/household/ExpensesTab'
import { MembersTab } from '@/components/household/MembersTab'
import { PresenceBar, useOnlineUserIds } from '@/components/household/PresenceBar'

type Tab = 'chores' | 'expenses' | 'members'

export default function HouseholdPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { household, members, chores, expenses, loading, isOwner, isMember, userId } = useHousehold(id)
  const online = useOnlineUserIds(id, userId)
  const [tab, setTab] = useState<Tab>('chores')

  if (loading) {
    return <div className="mx-auto max-w-2xl space-y-3 px-4 pt-8"><div className="h-24 animate-pulse rounded-2xl bg-muted" /><div className="h-48 animate-pulse rounded-2xl bg-muted" /></div>
  }

  // RBAC means a non-member simply receives no household row.
  if (!household || !isMember || !userId) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-4xl" aria-hidden>🚪</p>
        <h1 className="mt-3 text-xl font-bold">You’re not in this household</h1>
        <p className="mt-2 text-muted-foreground">It may have been deleted, or you were removed. Ask a member for an invite code.</p>
        <Link to="/home" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Back to my households</Link>
      </div>
    )
  }

  const openChores = chores.filter((c) => !c.data.done).length
  const tabs: { id: Tab; label: string }[] = [
    { id: 'chores', label: `Chores${openChores ? ` · ${openChores}` : ''}` },
    { id: 'expenses', label: 'Expenses' },
    { id: 'members', label: `Members · ${members.length}` },
  ]

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4 sm:pt-8">
      <Link to="/home" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Households
      </Link>
      <header className="mt-2 flex items-center gap-3">
        <span aria-hidden className="grid h-14 w-14 place-items-center rounded-2xl bg-card text-3xl shadow-[var(--shadow-card)]">{household.data.emoji || '🏠'}</span>
        <div className="min-w-0">
          <h1 data-testid="household-name" className="truncate text-2xl font-bold">{household.data.name}</h1>
          <p className="text-sm text-muted-foreground">{isOwner ? 'You own this household' : 'Member'}</p>
        </div>
      </header>

      <div className="mt-4"><PresenceBar members={members} online={online} /></div>

      <nav role="tablist" aria-label="Household sections" className="sticky top-0 z-10 -mx-4 mt-5 bg-background/95 px-4 py-2 backdrop-blur">
        <div className="grid grid-cols-3 rounded-full bg-secondary p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              data-testid={`tab-${t.id}`}
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn('rounded-full px-2 py-2 text-sm', tab === t.id ? 'bg-card font-semibold shadow-sm' : 'text-muted-foreground')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="mt-3" role="tabpanel">
        {tab === 'chores' && <ChoresTab householdId={id} chores={chores} members={members} userId={userId} />}
        {tab === 'expenses' && <ExpensesTab householdId={id} expenses={expenses} members={members} userId={userId} />}
        {tab === 'members' && <MembersTab household={household} members={members} online={online} isOwner={isOwner} userId={userId} />}
      </div>
    </div>
  )
}
