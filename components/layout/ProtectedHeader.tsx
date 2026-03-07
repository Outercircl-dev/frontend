'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/feed', label: 'Discover' },
  { href: '/activities', label: 'My activities' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/profile', label: 'Profile' },
  { href: '/settings', label: 'Settings' },
]

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/feed') {
    return pathname === '/feed'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function ProtectedHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/feed" className="flex items-center gap-3">
          <Image src="/logo.png" alt="OuterCircl" width={140} height={40} className="h-9 w-auto" priority />
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <Button key={item.href} asChild variant={isActivePath(pathname, item.href) ? 'default' : 'outline'} size="sm">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>

        <form action="/rpc/v1/auth/signout" method="POST">
          <Button variant="ghost" size="icon" type="submit">
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Sign out</span>
          </Button>
        </form>
      </div>
    </header>
  )
}
