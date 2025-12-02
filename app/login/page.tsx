import Image from 'next/image'
import type { Metadata } from 'next'

import { AuthForm } from '@/components/auth/auth-form'
import { LoginFeatureList } from '@/components/auth/login-feature-list'
import { LoginSampleEvents } from '@/components/auth/login-sample-events'
import { RotatingActivityTitle } from '@/components/auth/rotating-activity-title'

export const metadata: Metadata = {
    title: 'OuterCircl · Login',
    description: 'Join local adventures with neighbors and trusted hosts.',
}

export default function LoginPage() {
    return (
        <div className="grid min-h-screen bg-muted/40 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="flex flex-col gap-10 px-8 py-16 lg:px-14">
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-5">
                            <Image
                                src="/logo.png"
                                alt="OuterCircl"
                                width={140}
                                height={40}
                                className="h-10 w-auto"
                                priority
                            />
                            <RotatingActivityTitle />
                        </div>
                    </div>
                    <p className="text-base text-muted-foreground sm:text-lg">
                        Our homepage spotlights real groups every week—cold plunges, coffee chats,
                        toddler meetups, and more. Sign in to RSVP without missing the next invite.
                    </p>
                </div>

                {/* <LoginFeatureList /> */}

                <LoginSampleEvents />

                <div className="mt-auto space-y-2 text-sm text-muted-foreground">
                    <p>New here? Bring a friend along and grow your circle faster.</p>
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
                <div className="absolute inset-0 -z-10 bg-linear-to-b from-primary/5 via-background to-background" />
                <div className="w-full max-w-md space-y-6">
                    <AuthForm />
                    <p className="text-center text-sm text-muted-foreground">
                        By continuing you agree to the OuterCircl community guidelines and privacy
                        promise.
                    </p>
                </div>
            </section>
        </div>
    )
}

