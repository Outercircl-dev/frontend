'use client'

import Link from 'next/link'
import Image from 'next/image'
import { LogOut, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function PricingCancelPage() {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/feed" className="flex items-center gap-3">
            <Image src="/logo.png" alt="OuterCircl" width={140} height={40} className="h-9 w-auto" priority />
          </Link>
          <form action="/rpc/v1/auth/signout" method="POST">
            <Button variant="ghost" size="icon" type="submit">
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Sign out</span>
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <XCircle className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">Checkout canceled</h1>
            <p className="text-sm text-muted-foreground">
              No worries. You can upgrade anytime when you are ready.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link href="/pricing">Back to pricing</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/feed">Go to feed</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
