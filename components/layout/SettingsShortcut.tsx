'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings } from 'lucide-react'

import { Button } from '@/components/ui/button'

const HIDDEN_PREFIXES = ['/login', '/auth', '/rpc']

export function SettingsShortcut() {
  const pathname = usePathname()
  if (!pathname) {
    return null
  }

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-80">
      <Button asChild className="h-11 rounded-full px-4 shadow-lg">
        <Link href="/settings" aria-label="Open settings">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Link>
      </Button>
    </div>
  )
}

