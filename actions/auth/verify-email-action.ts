'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

import type { VerifyEmailState } from './state'

const authSchema = z.object({
    email: z.string().email('Please use a valid email address'),
    intent: z.enum(['signin', 'signup']),
})

const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL
    }
    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
        return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    }
    return 'http://localhost:3000'
}

export async function verifyEmailAction(
    _prevState: VerifyEmailState,
    formData: FormData
): Promise<VerifyEmailState> {
    const parsed = authSchema.safeParse({
        email: formData.get('email'),
        intent: formData.get('intent') ?? 'signin',
    })

    if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? 'Something went wrong'
        return {
            status: 'error',
            message,
        }
    }

    const supabase = await createClient()
    const { email, intent } = parsed.data
    const redirectTo = `${getBaseUrl()}/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: intent === 'signup',
            emailRedirectTo: redirectTo,
        },
    })

    if (error) {
        return {
            status: 'error',
            message: error.message,
        }
    }

    return {
        status: 'success',
        message:
            intent === 'signup'
                ? 'Check your inbox to finish creating your account.'
                : 'Check your inbox for your secure sign-in link.',
    }
}

