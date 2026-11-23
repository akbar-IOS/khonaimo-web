/** /h/:id: one household (chores, expenses, members). Requires sign-in. */

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHousehold } from '@/lib/household'
import { AtlasBand } from '@/components/Brand'
import { ChoresTab } from '@/components/household/ChoresTab'
import { ExpensesTab } from '@/components/household/ExpensesTab'
import { MembersTab } from '@/components/household/MembersTab'
import { PresenceBar, useOnlineUserIds } from '@/components/household/PresenceBar'

type Tab = 'chores' | 'expenses' | 'members'
type HouseholdData = ReturnType<typeof useHousehold>

export default function HouseholdPage() {
  const { id = '' } = useParams<{ id: string }>()
  const data = useHousehold(id)

  if (data.loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 pt-8" aria-busy="true">
        <div className="h-36 animate-pulse rounded-3xl bg-muted" />
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  // RBAC means a non-member simply receives no household row.
  if (!data.household || !data.isMember || !data.userId) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <AtlasBand className="h-2 w-16 rounded-full" />
        <h1 className="font-display mt-6 text-3xl font-extrabold">You’re not in this household</h1>
        <p className="mt-3 text-muted-foreground">
          It may have been deleted, or the owner removed you. Ask someone who lives there for a new invite link.
        </p>
        <Link to="/home" className="km-press mt-8 inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground">
          Back to my households
        </Link>
      </div>
    )
  }

  // Only members reach this point, so the presence socket (members-only on the server) is opened here.
  return <HouseholdView id={id} data={data as HouseholdData & { household: NonNullable<HouseholdData['household']>; userId: string }} />
}

function HouseholdView({
  id,
  data,
}: {
  id: string
  data: HouseholdData & { household: NonNullable<HouseholdData['household']>; userId: string }
}) {
  const { household, members, chores, expenses, isOwner, userId } = data
  const online = useOnlineUserIds(id, userId)
  const [tab, setTab] = useState<Tab>('chores')
  const openChores = chores.filter((c) => !c.data.done).length

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'chores', label: 'Chores', count: openChores || undefined },
    { id: 'expenses', label: 'Expenses' },
    { id: 'members', label: 'Members', count: members.length },
  ]

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4 sm:pt-6">
      <Link to="/home" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" aria-hidden /> All households
      </Link>

      <header className="overflow-hidden rounded-3xl border border-border bg-card">
        <AtlasBand className="h-4" />
        <div className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
          <span aria-hidden className="grid h-16 w-16 place-items-center rounded-2xl bg-accent text-4xl">{household.data.emoji || '🏠'}</span>
          <div className="min-w-0 flex-1">
            <h1 data-testid="household-name" className="font-display truncate text-3xl font-extrabold">{household.data.name}</h1>
            <p className="text-sm text-muted-foreground">{isOwner ? 'You own this household' : 'You’re a member'}</p>
          </div>
          <div className="w-full sm:w-auto">
            <PresenceBar members={members} online={online} userId={userId} />
          </div>
        </div>
      </header>

      <div role="tablist" aria-label="Household sections" className="sticky top-0 z-10 -mx-4 mt-4 bg-background/95 px-4 py-2 backdrop-blur">
        <div className="grid grid-cols-3 gap-1 rounded-full bg-secondary p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              data-testid={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex min-h-11 items-center justify-center gap-1.5 rounded-full px-2 text-sm transition-colors',
                tab === t.id ? 'bg-card font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={cn('tabular rounded-full px-1.5 text-xs font-semibold', tab === t.id ? 'bg-accent text-accent-foreground' : 'bg-background')}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'chores' && <ChoresTab householdId={id} chores={chores} members={members} userId={userId} />}
        {tab === 'expenses' && <ExpensesTab householdId={id} expenses={expenses} members={members} userId={userId} />}
        {tab === 'members' && <MembersTab household={household} members={members} online={online} isOwner={isOwner} userId={userId} />}
      </div>
    </div>
  )
}
