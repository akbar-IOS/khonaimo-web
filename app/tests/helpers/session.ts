import type { Page } from '@playwright/test'

/** Trade the page's session cookie for a JWT — the same call deepspace's getAuthToken() makes. */
export async function pageToken(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    const res = await fetch('/api/auth/token', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } }).catch(() => null)
    return res && res.ok ? (((await res.json()) as { token?: string }).token ?? null) : null
  })
}

/** Call a server action as the page's signed-in user (same path the UI uses). */
export async function action(page: Page, name: string, params: Record<string, unknown>) {
  const token = await pageToken(page)
  return page.evaluate(
    async ({ name, params, token }) => {
      const r = await fetch(`/api/actions/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(params),
      })
      return (await r.json()) as { success: boolean; error?: string; data?: Record<string, unknown> }
    },
    { name, params, token },
  )
}

/** Try to open a presence socket for a scope: 'open' if admitted, 'blocked' if refused. */
export async function presenceSocket(page: Page, scopeId: string, withToken = true): Promise<'open' | 'blocked' | 'timeout'> {
  const token = withToken ? await pageToken(page) : null
  return page.evaluate(
    ({ scopeId, token }) =>
      new Promise<'open' | 'blocked' | 'timeout'>((resolve) => {
        const url = new URL(`/ws/presence/${encodeURIComponent(scopeId)}`, location.href.replace(/^http/, 'ws'))
        if (token) url.searchParams.set('token', token)
        const ws = new WebSocket(url)
        ws.onopen = () => { resolve('open'); ws.close() }
        ws.onerror = () => resolve('blocked')
        ws.onclose = () => resolve('blocked')
        setTimeout(() => resolve('timeout'), 10_000)
      }),
    { scopeId, token },
  )
}
