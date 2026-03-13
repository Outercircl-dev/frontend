'use client'

import Link from 'next/link'
import { XCircle } from 'lucide-react'

import { ProtectedHeader } from '@/components/layout/ProtectedHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function PricingCancelPage() {
  return (
    <div className="min-h-screen bg-muted/40">
      <ProtectedHeader />

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
