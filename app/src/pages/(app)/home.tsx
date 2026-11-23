/**
 * /home — your households. Create one, or join with an invite code.
 * Dynamic (under (app)/) so signed-out visitors get a sign-in card instead of a blank gate.
 */

import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthOverlay, useAuth, useAuthProfileReady } from 'deepspace'
import { ChevronRight, Home as HomeIcon, Plus, Ticket } from 'lucide-react'
import { Button, Input, useToast } from '@/components/ui'
import { callAction } from '@/lib/actions'
import { firstName, useMyHouseholds } from '@/lib/household'

const EMOJIS = ['🏠', '🏡', '🏢', '🛋️', '🌿', '🐈', '🍳', '🌻']

export default function HomePage() {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) return null
  return isSignedIn ? <Households /> : <SignedOutWelcome />
}

function SignedOutWelcome() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <span aria-hidden className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-3xl">🏡</span>
      <h1 className="mt-5 text-2xl font-bold">Welcome to KhonaiMo</h1>
      <p className="mt-2 text-muted-foreground">Sign in to see your households, chores and shared expenses.</p>
      <Button data-testid="home-sign-in" className="mt-6 w-full rounded-full" size="lg" onClick={() => setOpen(true)}>
        Sign in
      </Button>
      {open && <AuthOverlay onClose={() => setOpen(false)} />}
    </div>
  )
}

function Households() {
  const { user } = useAuthProfileReady({ requireUser: true })
  const { households, loading } = useMyHouseholds()
  const navigate = useNavigate()
  const { error } = useToast()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(EMOJIS[0])
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'create' | 'join' | null>(null)

  async function create(e: FormEvent) {
    e.preventDefault()
    setBusy('create')
    try {
      const { householdId } = await callAction<{ householdId: string }>('createHousehold', { name, emoji })
      navigate(`/h/${householdId}`)
    } catch (err) {
      error('Could not create household', (err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function join(e: FormEvent) {
    e.preventDefault()
    setBusy('join')
    try {
      const { householdId } = await callAction<{ householdId: string }>('joinHousehold', { code })
      // Full navigation so the realtime subscriptions re-open with the new team membership.
      window.location.assign(`/h/${householdId}`)
    } catch (err) {
      error('Could not join', (err as Error).message)
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
      <h1 className="text-2xl font-bold sm:text-3xl">
        Hi{user?.name ? `, ${firstName(user.name)}` : ''} 👋
      </h1>
      <p className="mt-1 text-muted-foreground">Pick a household, or start a new one.</p>

      <section className="mt-6 space-y-3" aria-label="Your households">
        {loading ? (
          <div className="h-20 animate-pulse rounded-2xl bg-muted" />
        ) : households.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-muted-foreground">
            <HomeIcon className="mx-auto mb-2 h-6 w-6" aria-hidden />
            You’re not in a household yet.
          </div>
        ) : (
          households.map((h) => (
            <Link
              key={h.recordId}
              to={`/h/${h.recordId}`}
              data-testid="household-link"
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
            >
              <span aria-hidden className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-2xl">{h.data.emoji || '🏠'}</span>
              <span className="flex-1 text-lg font-semibold">{h.data.name}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden />
            </Link>
          ))
        )}
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <form onSubmit={create} className="rounded-2xl border border-border bg-card p-5" aria-label="Create a household">
          <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" aria-hidden /> New household</h2>
          <Input
            data-testid="new-household-name"
            className="mt-3"
            placeholder="e.g. Maple St. Apartment"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            aria-label="Household name"
          />
          <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Icon">
            {EMOJIS.map((em) => (
              <button
                type="button"
                key={em}
                role="radio"
                aria-checked={emoji === em}
                onClick={() => setEmoji(em)}
                className={`grid h-9 w-9 place-items-center rounded-lg text-lg ${emoji === em ? 'bg-accent ring-2 ring-primary' : 'bg-secondary'}`}
              >
                {em}
              </button>
            ))}
          </div>
          <Button data-testid="create-household" type="submit" className="mt-4 w-full rounded-full" disabled={!name.trim() || busy !== null}>
            {busy === 'create' ? 'Creating…' : 'Create household'}
          </Button>
        </form>

        <form onSubmit={join} className="rounded-2xl border border-border bg-card p-5" aria-label="Join a household">
          <h2 className="flex items-center gap-2 font-semibold"><Ticket className="h-4 w-4" aria-hidden /> Join with a code</h2>
          <Input
            data-testid="join-code"
            className="mt-3 font-mono uppercase tracking-widest"
            placeholder="ABC123"
            value={code}
            maxLength={12}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            aria-label="Invite code"
          />
          <p className="mt-3 text-xs text-muted-foreground">Ask the household owner for their 6-letter code or invite link.</p>
          <Button data-testid="join-household" type="submit" variant="outline" className="mt-4 w-full rounded-full" disabled={!code.trim() || busy !== null}>
            {busy === 'join' ? 'Joining…' : 'Join household'}
          </Button>
        </form>
      </div>
    </div>
  )
}
