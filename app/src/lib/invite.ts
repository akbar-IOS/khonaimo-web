/**
 * A pending invite survives the sign-in round trip. DeepSpace's OAuth callback
 * always lands on /home (src/server/http-routes.ts), so /join/<code> stores the
 * code before sign-in and /home picks it up afterwards.
 */
const KEY = 'khonaimo:pending-invite'
const MAX_AGE_MS = 60 * 60 * 1000

export function savePendingInvite(code: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }))
  } catch {
    /* storage unavailable: the user can still paste the code on /home */
  }
}

/** Returns and clears a pending invite code saved within the last hour. */
export function takePendingInvite(): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    localStorage.removeItem(KEY)
    if (!raw) return null
    const { code, at } = JSON.parse(raw) as { code?: string; at?: number }
    return code && at && Date.now() - at < MAX_AGE_MS ? code : null
  } catch {
    return null
  }
}
