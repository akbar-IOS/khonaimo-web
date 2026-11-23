/** KhonaiMo brand: an eight-point star (khatam) mark with a saffron centre, and the wordmark. */

import { cn } from '@/lib/utils'

export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden className={cn('shrink-0', className)}>
      <rect width="32" height="32" rx="8" fill="#0e6b70" />
      <g fill="#f6f7f4">
        <rect x="9" y="9" width="14" height="14" rx="1.5" />
        <rect x="9" y="9" width="14" height="14" rx="1.5" transform="rotate(45 16 16)" />
      </g>
      <circle cx="16" cy="16" r="3.6" fill="#f1b030" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <BrandMark size={30} />
      <span translate="no" className="font-display text-lg font-extrabold text-foreground">KhonaiMo</span>
    </span>
  )
}

/** The woven atlas stripe (see .atlas-band in themes.css). */
export function AtlasBand({ className }: { className?: string }) {
  return <div aria-hidden className={cn('atlas-band', className)} />
}
