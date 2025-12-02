import type { Metadata } from 'next'

import { AuthForm } from '@/components/auth/auth-form'
import { LoginFeatureList } from '@/components/auth/login-feature-list'

export const metadata: Metadata = {
    title: 'OuterCircl · Login',
    description: 'Passwordless login with Supabase magic links and secure proxy sessions.',
}

export default function LoginPage() {
    return (
        <div className="grid min-h-screen bg-muted/40 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="flex flex-col gap-10 px-8 py-16 lg:px-14">
                <div className="space-y-6">
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-primary">
                        Secure Access
                    </span>
                    <div className="space-y-4">
                        <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
                            Login to OuterCircl with a single verified email.
                        </h1>
                        <p className="text-base text-muted-foreground sm:text-lg">
                            Inspired by the shadcn
                            <span className="font-semibold"> login-05</span> block and tailored for
                            Supabase magic links. The proxy will keep guests here until their email
                            session is confirmed.
                        </p>
                    </div>
                </div>

                <LoginFeatureList />

                <div className="mt-auto space-y-2 text-sm text-muted-foreground">
                    <p>Need SSO? It layers on top of the same Supabase client.</p>
                    <p>
                        Having issues?{' '}
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
            <section className="relative flex items-center justify-center bg-background px-6 py-12">
                <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background" />
                <div className="w-full max-w-md space-y-6">
                    <AuthForm />
                    <p className="text-center text-sm text-muted-foreground">
                        By continuing you agree to the OuterCircl privacy policy and security
                        controls.
                    </p>
                </div>
            </section>
        </div>
    )
}

