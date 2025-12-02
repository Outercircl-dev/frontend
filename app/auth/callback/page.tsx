import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'

type AuthCallbackProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

const CALLBACK_TITLE: Record<'success' | 'error', string> = {
    success: 'You are all set!',
    error: 'We could not verify your email',
}

export default async function AuthCallback({ searchParams }: AuthCallbackProps) {
    const params = await searchParams
    const code = typeof params.code === 'string' ? params.code : undefined
    const descriptionFromParams =
        typeof params.error_description === 'string' ? params.error_description : undefined

    if (!code) {
        return (
            <CallbackMessage
                status="error"
                description={descriptionFromParams ?? 'The verification link is incomplete.'}
            />
        )
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
        return (
            <CallbackMessage
                status="error"
                description={error.message || 'Please try requesting a new link.'}
            />
        )
    }

    return (
        <CallbackMessage
            status="success"
            description="Your session is active. You can close this tab or continue to the app."
        />
    )
}

function CallbackMessage({
    status,
    description,
}: {
    status: 'success' | 'error'
    description: string
}) {
    const isError = status === 'error'
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-20">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-lg">
                <p
                    className={`text-sm font-semibold uppercase tracking-[0.35em] ${isError ? 'text-red-500' : 'text-emerald-500'
                        }`}
                >
                    Supabase
                </p>
                <h1 className="mt-4 text-2xl font-semibold text-zinc-950">
                    {CALLBACK_TITLE[status]}
                </h1>
                <p className="mt-2 text-sm text-zinc-600">{description}</p>
                <Link
                    href="/"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                >
                    Go to homepage
                </Link>
            </div>
        </div>
    )
}

