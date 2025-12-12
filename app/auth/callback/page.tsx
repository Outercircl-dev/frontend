'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL
const ACCESS_TOKEN_STORAGE_KEY = 'outercircl.accessToken'

type CallbackStatus = 'processing' | 'error'

interface BackendMeResponse {
    hasOnboarded?: boolean
}

export default function AuthCallbackPageWrapper() {
    return (
        <Suspense fallback={<AuthCallbackFallback message="Preparing your session..." />}>
            <AuthCallbackPage />
        </Suspense>
    )
}

function AuthCallbackPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const effectHasRun = useRef(false)
    const [status, setStatus] = useState<CallbackStatus>('processing')
    const [message, setMessage] = useState('Completing your sign-in...')
    const [details, setDetails] = useState<string | null>(null)

    useEffect(() => {
        if (effectHasRun.current) {
            return
        }
        effectHasRun.current = true

        const code = searchParams.get('code')
        const redirectOverride = searchParams.get('next')

        if (!code) {
            router.replace('/login?error=missing_code')
            return
        }

        let redirectTimeout: ReturnType<typeof setTimeout> | null = null

        const completeSignIn = async () => {
            try {
                setMessage('Exchanging secure code for a session...')

                const supabase = createClient()
                const { data, error } = await supabase.auth.exchangeCodeForSession(code)

                if (error || !data.session) {
                    throw new Error(error?.message ?? 'Unable to create Supabase session')
                }

                const accessToken = data.session.access_token
                const refreshToken = data.session.refresh_token

                if (!accessToken || !refreshToken) {
                    throw new Error('Supabase session did not include the required tokens')
                }

                setMessage('Securing your session...')
                await persistSessionOnServer(accessToken, refreshToken)
                storeSessionToken(accessToken)

                if (API_URL) {
                    setMessage('Fetching your account...')
                    const backendResponse = await fetch(`${API_URL}/me`, {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    })

                    if (backendResponse.ok) {
                        const backendData: BackendMeResponse = await backendResponse.json()
                        const destination =
                            redirectOverride ?? (backendData.hasOnboarded ? '/feed' : '/onboarding/profile')
                        router.replace(destination)
                        return
                    }

                    if (backendResponse.status === 401) {
                        throw new Error('Your session expired before we could reach the backend.')
                    }
                }

                router.replace(redirectOverride ?? '/onboarding/profile')
            } catch (err) {
                console.error('Auth callback error:', err)
                setStatus('error')
                setMessage('We could not complete your sign-in.')
                setDetails(err instanceof Error ? err.message : 'Unexpected error occurred.')

                redirectTimeout = setTimeout(() => {
                    router.replace('/login')
                }, 5000)
            }
        }

        completeSignIn()

        return () => {
            if (redirectTimeout) {
                clearTimeout(redirectTimeout)
            }
        }
    }, [router, searchParams])

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
            <div className="w-full max-w-md rounded-2xl border bg-background/95 p-10 text-center shadow-xl">
                {status === 'processing' ? (
                    <>
                        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                        <h1 className="mt-6 text-2xl font-semibold text-foreground">Finishing up…</h1>
                        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-semibold text-destructive">Something went wrong</h1>
                        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
                        {details ? (
                            <p className="mt-2 text-xs text-muted-foreground">{details}</p>
                        ) : null}
                        <p className="mt-6 text-sm text-muted-foreground">Redirecting you to login…</p>
                    </>
                )}
            </div>
        </div>
    )
}

async function persistSessionOnServer(accessToken: string, refreshToken: string) {
    const response = await fetch('/api/v1/auth/persist-session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            accessToken,
            refreshToken,
        }),
    })

    if (!response.ok) {
        let errorMessage = 'Failed to persist session on server.'
        try {
            const body = await response.json()
            if (body?.error) {
                errorMessage = body.error
            }
        } catch {
            // ignore JSON parse errors
        }
        throw new Error(errorMessage)
    }
}

function storeSessionToken(accessToken: string) {
    if (typeof window === 'undefined') return

    try {
        window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
    } catch (error) {
        console.warn('Unable to save session token in sessionStorage', error)
    }

    try {
        window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
    } catch (error) {
        console.warn('Unable to save session token in localStorage', error)
    }
}

function AuthCallbackFallback({ message }: { message: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
            <div className="w-full max-w-md rounded-2xl border bg-background/95 p-10 text-center shadow-xl">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                <h1 className="mt-6 text-2xl font-semibold text-foreground">Hang tight…</h1>
                <p className="mt-4 text-sm text-muted-foreground">{message}</p>
            </div>
        </div>
    )
}

