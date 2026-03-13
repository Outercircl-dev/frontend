'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, RefreshCw } from 'lucide-react'

import { ProtectedHeader } from '@/components/layout/ProtectedHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type BillingStatus = {
  tier?: string
}

export default function PricingSuccessPage() {
  const [tier, setTier] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(true)

  useEffect(() => {
    let isActive = true
    let attempts = 0
    let timeoutId: NodeJS.Timeout | null = null

    const poll = async () => {
      attempts += 1
      try {
        const response = await fetch('/rpc/v1/billing/status')
        const payload = (await response.json().catch(() => ({}))) as BillingStatus
        if (!isActive) return
        if (payload?.tier) {
          setTier(payload.tier)
        }
        if (payload?.tier?.toLowerCase() === 'premium' || attempts >= 6) {
          setIsPolling(false)
          return
        }
      } catch {
        if (!isActive) return
      }

      timeoutId = setTimeout(poll, 2000)
    }

    poll()
    return () => {
      isActive = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  return (
    <div className="min-h-screen bg-muted/40">
      <ProtectedHeader />

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h1 className="text-2xl font-semibold">Thanks for upgrading!</h1>
            <p className="text-sm text-muted-foreground">
              {tier?.toLowerCase() === 'premium'
                ? 'Your Premium access is active.'
                : 'We are confirming your subscription. This usually takes a moment.'}
            </p>
            {isPolling ? (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Syncing membership status…
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link href="/feed">Go to feed</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/activities">View activities</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
