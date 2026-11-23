/**
 * Who's online right now, via DeepSpace's PresenceRoom (usePresenceRoom).
 * Everyone viewing this household joins the scope `household:<id>`; peers drop
 * out within a second of closing the tab, so this is live, not "last seen".
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

export function PresenceBar({ members, online }: { members: Member[]; online: Set<string> }) {
  const onlineMembers = members.filter((m) => online.has(m.userId))
  return (
    <div data-testid="presence-bar" className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {members.slice(0, 6).map((m) => (
          <MemberAvatar key={m.userId} member={m} online={online.has(m.userId)} size={32} />
        ))}
      </div>
      <p className="text-sm text-muted-foreground" data-testid="online-summary">
        <span className="font-semibold text-emerald-700">{onlineMembers.length} online</span>
        {onlineMembers.length > 0 && <> · {onlineMembers.map((m) => firstName(m.name)).join(', ')}</>}
      </p>
    </div>
  )
}
