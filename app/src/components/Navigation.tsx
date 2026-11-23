/**
 * Top bar: wordmark (→ /home), and the account menu or a Sign in button.
 * Keeps the scaffold's test hooks: `app-navigation`, `nav-sign-in-button`,
 * `nav-user-name`, `nav-user-email`, and the "Account menu" button name.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthOverlay, useAuthProfileReady, signOut } from 'deepspace'
import { ChevronDown, LogOut } from 'lucide-react'
import { Wordmark } from './Brand'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui'

export default function Navigation() {
  const { isLoaded, isSignedIn, user, userLoading } = useAuthProfileReady({ requireUser: true })
  const [showAuthModal, setShowAuthModal] = useState(false)
  const profileReady = !isSignedIn || (!userLoading && !!user)

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-card px-3 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <nav data-testid="app-navigation" aria-label="Main" className="border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4">
          <Link to="/home" aria-label="KhonaiMo, your households" className="km-press rounded-lg">
            <Wordmark />
          </Link>
          <div className="flex-1" />

          {!isLoaded ? null : isSignedIn && !profileReady ? (
            <div className="h-9 w-28 animate-pulse rounded-full bg-muted" aria-hidden />
          ) : isSignedIn && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    aria-label="Account menu"
                    className="group flex min-h-11 items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-sm transition-colors hover:bg-secondary"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.imageUrl ?? undefined} referrerPolicy="no-referrer" alt="" />
                      <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                        {(user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span data-testid="nav-user-name" className="hidden max-w-[140px] truncate font-medium sm:inline">
                      {user.name || user.email}
                    </span>
                    <ChevronDown
                      className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-data-[popup-open]:rotate-180"
                      aria-hidden
                    />
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="truncate font-medium text-foreground">{user.name || 'Signed in'}</div>
                  <div data-testid="nav-user-email" className="truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              data-testid="nav-sign-in-button"
              onClick={() => setShowAuthModal(true)}
              className="km-press min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>

      {showAuthModal && <AuthOverlay onClose={() => setShowAuthModal(false)} />}
    </>
  )
}
