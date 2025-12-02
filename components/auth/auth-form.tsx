'use client'

import { useActionState, useEffect, useRef, useState } from 'react'

import {
    verifyEmailAction,
    verifyEmailInitialState,
    type VerifyEmailState,
} from '@/actions/auth/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type Intent = 'signin' | 'signup'

const INTENT_OPTIONS: { value: Intent; label: string; description: string }[] = [
    { value: 'signin', label: 'Sign in', description: 'Returning member' },
    { value: 'signup', label: 'Join', description: 'First-time guest' },
]

export function AuthForm() {
    const [intent, setIntent] = useState<Intent>('signin')
    const formRef = useRef<HTMLFormElement>(null)
    const [state, formAction] = useActionState<VerifyEmailState, FormData>(
        verifyEmailAction,
        verifyEmailInitialState
    )

    useEffect(() => {
        if (state.status === 'success') {
            formRef.current?.reset()
        }
    }, [state.status])

    const submitLabel = intent === 'signin' ? 'Send sign-in link' : 'Create account'

    return (
        <Card className="border-none bg-card/80 shadow-xl shadow-black/5 backdrop-blur">
            <CardHeader className="space-y-2 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-muted-foreground">
                    RSVP Link
                </p>
                <CardTitle className="text-2xl">Check your inbox</CardTitle>
                <CardDescription>
                    Choose whether you&apos;re signing in or joining for the first time. We&apos;ll
                    email you a secure invite either way.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-3 rounded-full border border-border/80 bg-muted/60 p-1.5">
                    {INTENT_OPTIONS.map((option) => {
                        const isActive = intent === option.value
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setIntent(option.value)}
                                className={cn(
                                    'rounded-full px-4 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                    isActive
                                        ? 'bg-background shadow-sm shadow-black/5'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                                aria-pressed={isActive}
                            >
                                <span className="block">{option.label}</span>
                                <span className="text-[11px] font-normal uppercase tracking-[0.25em] text-muted-foreground">
                                    {option.description}
                                </span>
                            </button>
                        )
                    })}
                </div>

                <form ref={formRef} action={formAction} className="space-y-4" noValidate>
                    <input type="hidden" name="intent" value={intent} />
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@outercircl.com"
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full">
                        {submitLabel}
                    </Button>
                </form>

                {state.status !== 'idle' && state.message ? (
                    <div
                        role="status"
                        aria-live="polite"
                        className={cn(
                            'rounded-xl border px-4 py-3 text-sm',
                            state.status === 'success'
                                ? 'border-emerald-200/70 bg-emerald-50 text-emerald-600'
                                : 'border-red-200/70 bg-red-50 text-red-600'
                        )}
                    >
                        {state.message}
                    </div>
                ) : null}

                <Separator />

                <p className="text-xs leading-relaxed text-muted-foreground">
                    We send a one-tap link so you can finish signing {intent === 'signin' ? 'in' : 'up'} on
                    any device. It stays active for 24 hours to keep the community safe.
                </p>
            </CardContent>
        </Card>
    )
}

