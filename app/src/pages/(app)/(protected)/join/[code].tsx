/** /join/:code — invite link. Signs in (via the protected gate) then joins and opens the household. */

import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callAction } from '@/lib/actions'

export default function JoinPage() {
  const { code = '' } = useParams<{ code: string }>()
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
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      {err ? (
        <>
          <p className="text-4xl" aria-hidden>🤔</p>
          <h1 className="mt-3 text-xl font-bold">Couldn’t join</h1>
          <p className="mt-2 text-muted-foreground" data-testid="join-error">{err}</p>
          <Link to="/home" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Go to my households</Link>
        </>
      ) : (
        <>
          <p className="animate-bounce text-4xl" aria-hidden>🏡</p>
          <h1 className="mt-3 text-xl font-bold">Joining household…</h1>
        </>
      )}
    </div>
  )
}
