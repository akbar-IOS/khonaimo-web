/** Small shared presentational pieces for the household screens. */

import type { ReactNode, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import type { Member } from '@/lib/household'

const AVATAR_COLORS = ['#0e6b70', '#c4343f', '#2c8f63', '#b7791f', '#1d5f8f', '#9a3b5c', '#55702b']

function colorFor(id: string): string {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function MemberAvatar({
  member,
  online,
  size = 36,
}: {
  member: Pick<Member, 'userId' | 'name' | 'imageUrl'>
  online?: boolean
  size?: number
}) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {member.imageUrl ? (
        <img
          src={member.imageUrl}
          alt=""
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          className="h-full w-full rounded-full object-cover ring-2 ring-card"
        />
      ) : (
        <span
          aria-hidden
          className="grid h-full w-full place-items-center rounded-full font-semibold text-white ring-2 ring-card"
          style={{ background: colorFor(member.userId), fontSize: size * 0.42 }}
        >
          {(member.name[0] ?? '?').toUpperCase()}
        </span>
      )}
      {online !== undefined && (
        <span
          data-testid={online ? 'online-dot' : 'offline-dot'}
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card',
            online ? 'bg-leaf' : 'bg-[#c9cec6]',
          )}
        />
      )}
    </span>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-border bg-card p-4 sm:p-5', className)}>
      {children}
    </section>
  )
}

export function NativeSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'h-11 w-full cursor-pointer rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className,
      )}
    />
  )
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-muted-foreground">
      {children}
    </label>
  )
}
