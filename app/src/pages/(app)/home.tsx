/**
 * /home: your households. Create one, or join with an invite code.
 * Dynamic (under (app)/) so signed-out visitors get a sign-in card instead of a blank gate.
 */

import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthOverlay, useAuth, useAuthProfileReady } from 'deepspace'
import { ChevronRight } from 'lucide-react'
import { Button, Input, useToast } from '@/components/ui'
import { BrandMark } from '@/components/Brand'
import { callAction } from '@/lib/actions'
import { takePendingInvite } from '@/lib/invite'
import { firstName, useMyHouseholds } from '@/lib/household'
import { cn } from '@/lib/utils'

const EMOJIS = ['🏠', '🏡', '🏢', '🛋️', '🌿', '🐈', '🍳', '🌻']

export default function HomePage() {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) return null
  return isSignedIn ? <Households /> : <SignedOutWelcome />
}

function SignedOutWelcome() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6">
      <BrandMark size={56} />
      <h1 className="font-display mt-6 text-3xl font-extrabold">Sign in to see your household</h1>
      <p className="mt-3 text-muted-foreground">
        Your chores, shared costs and housemates live here. Have an invite link? Sign in first, then open it again.
      </p>
      <Button data-testid="home-sign-in" className="km-press mt-8 min-h-12 w-full rounded-full text-base" onClick={() => setOpen(true)}>
        Sign in
      </Button>
      <Link to="/" className="mt-4 text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        What is KhonaiMo?
      </Link>
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
  const empty = !loading && households.length === 0

  // Back from sign-in with an invite link still pending: finish joining.
  useEffect(() => {
    const pending = takePendingInvite()
    if (pending) navigate(`/join/${pending}`, { replace: true })
  }, [navigate])

  async function create(e: FormEvent) {
    e.preventDefault()
    setBusy('create')
    try {
      const { householdId } = await callAction<{ householdId: string }>('createHousehold', { name, emoji })
      navigate(`/h/${householdId}`)
    } catch (err) {
      error('Couldn’t create the household', (err as Error).message)
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
      error('Couldn’t join', (err as Error).message)
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:pt-12">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
        {user?.name ? `Salom, ${firstName(user.name)}` : 'Your households'}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {empty ? 'Start a household for your place, or join the one your housemates made.' : 'Pick a household to see what needs doing.'}
      </p>

      {loading ? (
        <div className="mt-8 h-20 animate-pulse rounded-2xl bg-muted" aria-busy="true" />
      ) : (
        households.length > 0 && (
          <ul aria-label="Your households" className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {households.map((h) => (
              <li key={h.recordId}>
                <Link
                  to={`/h/${h.recordId}`}
                  data-testid="household-link"
                  className="group flex min-h-16 items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary"
                >
                  <span aria-hidden className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-2xl">{h.data.emoji || '🏠'}</span>
                  <span className="font-display flex-1 truncate text-lg font-extrabold">{h.data.name}</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )
      )}

      <div className={cn('grid gap-4 sm:grid-cols-[1.25fr_1fr]', empty ? 'mt-8' : 'mt-10')}>
        <form onSubmit={create} className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="new-hh">
          <h2 id="new-hh" className="font-display text-xl font-extrabold">Start a household</h2>
          <label htmlFor="hh-name" className="mt-4 block text-sm font-medium">Name</label>
          <Input
            id="hh-name"
            data-testid="new-household-name"
            className="mt-1.5 h-11"
            placeholder="Maple Street flat…"
            autoComplete="off"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
          <p id="hh-icon" className="mt-4 text-sm font-medium">Icon</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby="hh-icon">
            {EMOJIS.map((em) => (
              <button
                type="button"
                key={em}
                role="radio"
                aria-checked={emoji === em}
                aria-label={`Icon ${em}`}
                onClick={() => setEmoji(em)}
                className={cn(
                  'grid h-11 w-11 place-items-center rounded-xl text-xl transition-colors',
                  emoji === em ? 'bg-accent ring-2 ring-primary' : 'bg-secondary hover:bg-accent',
                )}
              >
                {em}
              </button>
            ))}
          </div>
          <Button data-testid="create-household" type="submit" className="km-press mt-5 min-h-11 w-full rounded-full" disabled={!name.trim() || busy !== null}>
            {busy === 'create' ? 'Creating…' : 'Create household'}
          </Button>
        </form>

        <form onSubmit={join} className="rounded-2xl border border-dashed border-input bg-transparent p-5 sm:p-6" aria-labelledby="join-hh">
          <h2 id="join-hh" className="font-display text-xl font-extrabold">Join with a code</h2>
          <p className="mt-1 text-sm text-muted-foreground">The owner finds it under Members.</p>
          <label htmlFor="join-code" className="mt-4 block text-sm font-medium">Invite code</label>
          <Input
            id="join-code"
            data-testid="join-code"
            className="tabular mt-1.5 h-11 text-lg font-semibold uppercase tracking-[0.25em]"
            placeholder="ABC234"
            autoComplete="off"
            spellCheck={false}
            value={code}
            maxLength={12}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <Button data-testid="join-household" type="submit" variant="outline" className="km-press mt-5 min-h-11 w-full rounded-full" disabled={!code.trim() || busy !== null}>
            {busy === 'join' ? 'Joining…' : 'Join household'}
          </Button>
        </form>
      </div>
    </div>
  )
}
