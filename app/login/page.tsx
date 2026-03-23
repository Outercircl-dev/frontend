import Image from 'next/image'
import type { Metadata } from 'next'

import { AuthForm } from '@/components/auth/auth-form'

export const metadata: Metadata = {
    title: 'Login',
    description: 'Sign in to OuterCircl and RSVP for trusted local activities near you.',
    alternates: {
        canonical: '/login',
    },
}

interface LoginPageProps {
    searchParams: Promise<{ error?: string | string[] }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const params = await searchParams
    const errorValue = params.error
    const errorMessage = errorValue
        ? decodeURIComponent(
              (Array.isArray(errorValue) ? errorValue[0] : errorValue).replace(/\+/g, ' ')
          )
        : null
    return (
        <div className="min-h-screen bg-muted/40">
            <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-6 sm:py-12">
                <div className="absolute inset-0 -z-10 bg-linear-to-b from-primary/5 via-background to-background" />
                <div className="w-full max-w-md space-y-5">
                    <div className="flex justify-center">
                        <Image
                            src="/logo.png"
                            alt="OuterCircl"
                            width={140}
                            height={40}
                            className="h-10 w-auto"
                            priority
                        />
                    </div>
                    <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-foreground/90">
                        Sign in or create an account to continue. We&apos;ll email a secure one-tap
                        login link.
                    </div>
                    {errorMessage && (
                        <div
                            role="alert"
                            className="rounded-xl border border-red-200/70 bg-red-50 px-4 py-3 text-sm text-red-600"
                        >
                            {errorMessage}
                        </div>
                    )}
                    <AuthForm />
                    <p className="text-center text-sm text-muted-foreground">
                        By continuing you agree to the OuterCircl community guidelines and privacy
                        promise.
                    </p>
                    <p className="text-center text-sm text-muted-foreground">
                        Need help?{' '}
                        <a
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                            href="mailto:support@outercircl.com"
                        >
                            Contact support
                        </a>
                        .
                    </p>
                </div>
            </section>
        </div>
    )
}

