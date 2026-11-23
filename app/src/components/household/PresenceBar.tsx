/**
 * Who's online right now, via DeepSpace's PresenceRoom (usePresenceRoom).
 * Everyone viewing this household joins the scope `household:<id>`. The server
 * admits only active members (src/server/realtime-routes.ts), and peers drop out
 * within a second of closing the tab, so this is live, not "last seen".
 */

import { usePresenceRoom } from 'deepspace'
import type { Member } from '@/lib/household'
import { firstName } from '@/lib/household'
import { MemberAvatar } from './bits'

export function useOnlineUserIds(householdId: string, myUserId: string | null): Set<string> {
  const { peers, connected } = usePresenceRoom(`household:${householdId}`)
  const ids = new Set(peers.map((p) => p.userId))
  if (connected && myUserId) ids.add(myUserId)
  return ids
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function PresenceBar({ members, online, userId }: { members: Member[]; online: Set<string>; userId: string }) {
  const others = members.filter((m) => m.userId !== userId && online.has(m.userId))
  const count = members.filter((m) => online.has(m.userId)).length
  const summary =
    others.length === 0
      ? 'Only you are here right now'
      : `${listNames(others.map((m) => firstName(m.name)))} ${others.length === 1 ? 'is' : 'are'} here too`

  return (
    <div data-testid="presence-bar" className="flex items-center gap-3 rounded-2xl bg-secondary px-3 py-2">
      <div className="flex -space-x-2">
        {members.slice(0, 5).map((m) => (
          <MemberAvatar key={m.userId} member={m} online={online.has(m.userId)} size={30} />
        ))}
      </div>
      <p className="text-sm" data-testid="online-summary" aria-live="polite">
        <span className="sr-only">{count} online. </span>
        {summary}
      </p>
    </div>
  )
}
