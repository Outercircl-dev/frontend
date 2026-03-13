'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Sparkles } from 'lucide-react'

import { ProtectedHeader } from '@/components/layout/ProtectedHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorBlock } from '@/components/ui/error-block'
import { useAuthState } from '@/hooks/useAuthState'

export default function PricingPage() {
  const { user, isLoading } = useAuthState()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPremium = useMemo(
    () => user?.tierRules?.metadata?.tierClass?.toLowerCase() === 'premium',
    [user],
  )

  const handleUpgrade = async () => {
    try {
      setIsSubmitting(true)
      setError(null)

      const response = await fetch('/rpc/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'PREMIUM' }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || 'Failed to start checkout')
      }

      if (!payload?.url) {
        throw new Error('Stripe session URL missing from response')
      }

      window.location.href = payload.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start checkout')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <ProtectedHeader />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <section className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Membership</p>
          <h1 className="text-3xl font-semibold tracking-tight">Upgrade your OuterCircl experience</h1>
          <p className="text-sm text-muted-foreground">
            Unlock higher hosting limits, premium group tools, and an ad-free experience.
          </p>
        </section>

        {error ? (
          <ErrorBlock
            title="Unable to start checkout"
            message={error}
            onRetry={() => {
              void handleUpgrade()
            }}
          />
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Freemium</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  Host up to 2 activities per month
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  Max participants fixed at 4
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  Ads included
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/40 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Premium
              </CardTitle>
              <p className="text-sm text-muted-foreground">Best for hosts ready to scale their community.</p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Unlimited hosted activities per month
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  No participant cap
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Group tools and premium messaging insights
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Ad-free experience
                </li>
              </ul>
              <Button
                className="w-full"
                onClick={handleUpgrade}
                disabled={isSubmitting || isLoading || isPremium}
              >
                {isPremium ? 'Already Premium' : isSubmitting ? 'Redirecting…' : 'Upgrade to Premium'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Secure checkout powered by Stripe. Cancel anytime.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
