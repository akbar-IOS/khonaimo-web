/**
 * /join/:code: an invite link.
 * Signed in: joins and opens the household. Signed out: explains the invite,
 * remembers the code, and offers sign-in. OAuth returns to /home, which resumes the join.
 */

import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AuthOverlay, useAuth } from 'deepspace'
import { Button } from '@/components/ui'
import { AtlasBand, BrandMark } from '@/components/Brand'
import { callAction } from '@/lib/actions'
import { savePendingInvite } from '@/lib/invite'

export default function JoinPage() {
  const { code = '' } = useParams<{ code: string }>()
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) return null
  return isSignedIn ? <Joining code={code} /> : <Invited code={code} />
}

function Invited({ code }: { code: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => savePendingInvite(code), [code])
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6" data-testid="invite-signed-out">
      <BrandMark size={56} />
      <h1 className="font-display mt-6 text-3xl font-extrabold">You’re invited to a household</h1>
      <p className="mt-3 text-muted-foreground">
        Sign in and you’ll join it straight away, with its chores, shared costs and housemates.
      </p>
      <p className="mt-5 text-sm text-muted-foreground">
        Invite code{' '}
        <span className="font-display tabular rounded-lg bg-accent px-2 py-1 font-extrabold tracking-[0.2em] text-accent-foreground">{code.toUpperCase()}</span>
      </p>
      <Button data-testid="invite-sign-in" className="km-press mt-8 min-h-12 w-full rounded-full text-base" onClick={() => setOpen(true)}>
        Sign in to join
      </Button>
      <Link to="/" className="mt-4 text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        What is KhonaiMo?
      </Link>
      {open && <AuthOverlay onClose={() => setOpen(false)} />}
    </div>
  )
}

function Joining({ code }: { code: string }) {
  const [err, setErr] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    callAction<{ householdId: string }>('joinHousehold', { code })
      // Full navigation so the realtime subscriptions re-open with the new team membership.
      .then(({ householdId }) => window.location.replace(`/h/${householdId}`))
      .catch((e: Error) => setErr(e.message))
  }, [code])

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <AtlasBand className="h-2 w-16 rounded-full" />
      {err ? (
        <>
          <h1 className="font-display mt-6 text-3xl font-extrabold">That invite didn’t work</h1>
          <p className="mt-3 text-muted-foreground" data-testid="join-error">{err} Ask the owner for a fresh link, or paste the code on your households page.</p>
          <Link to="/home" className="km-press mt-8 inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground">Go to my households</Link>
        </>
      ) : (
        <h1 className="font-display mt-6 text-3xl font-extrabold" aria-live="polite">Joining the household…</h1>
      )}
    </div>
  )
}
