'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CalendarCheck2, LogOut, Plus, Settings, Tag, User2 } from 'lucide-react'

import { openNotificationsDrawer } from '@/components/notifications/drawer-events'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthState } from '@/hooks/useAuthState'

function getInitials(displayName: string | null | undefined, email: string | null | undefined): string {
  const fromName = (displayName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  if (fromName) {
    return fromName
  }

  const fromEmail = (email ?? '').trim()[0]
  return fromEmail ? fromEmail.toUpperCase() : 'U'
}

export function ProtectedHeader() {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { user } = useAuthState()
  const displayName = user?.displayName?.trim() || null
  const userLabel = displayName ?? user?.email ?? 'My account'

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) {
      return
    }

    setIsSigningOut(true)
    try {
      const response = await fetch('/rpc/v1/auth/signout', { method: 'POST' })

      if (response.redirected) {
        window.location.assign(response.url)
        return
      }

      if (!response.ok) {
        throw new Error('Sign out failed')
      }

      router.replace('/login')
      router.refresh()
    } catch (error) {
      console.error('Failed to sign out:', error)
      window.location.assign('/login')
    } finally {
      setIsSigningOut(false)
    }
  }, [isSigningOut, router])

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <Link href="/feed" className="flex items-center gap-3">
          <Image src="/logo.png" alt="OuterCircl" width={140} height={40} className="h-9 w-auto" priority />
        </Link>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="h-11 rounded-full px-4 text-sm font-semibold shadow-sm">
            <Link href="/activities/new" className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create activity
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-11 w-11 rounded-full p-0" aria-label="Open account menu">
                <Avatar className="h-8 w-8 ring-1 ring-border">
                  {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={userLabel} /> : null}
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(displayName, user?.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="space-y-0.5">
                <p className="text-sm font-semibold leading-none">{displayName ?? 'My account'}</p>
                <p className="truncate pt-1 text-xs text-muted-foreground">{user?.email ?? 'Signed in user'}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User2 className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/activities" className="cursor-pointer">
                    <CalendarCheck2 className="h-4 w-4" />
                    My activities
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/pricing" className="cursor-pointer">
                    <Tag className="h-4 w-4" />
                    Pricing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    openNotificationsDrawer()
                  }}
                >
                  <Bell className="h-4 w-4" />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={isSigningOut}
                onSelect={(event) => {
                  event.preventDefault()
                  void handleSignOut()
                }}
              >
                  <LogOut className="h-4 w-4" />
                  Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
