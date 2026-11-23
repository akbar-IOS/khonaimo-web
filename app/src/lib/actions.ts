import { getAuthToken } from 'deepspace'

/** Call a server action from src/actions/index.ts; throws with the action's error message. */
export async function callAction<T>(name: string, params: Record<string, unknown>): Promise<T> {
  const token = await getAuthToken()
  const res = await fetch(`/api/actions/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(params),
  })
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; data?: T; error?: string }
  if (!res.ok || !body.success) throw new Error(body.error || `Request failed (${res.status})`)
  return body.data as T
}
