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
    try {
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

        // For sign in, we still allow creating user if they don't exist
        // This provides a better UX - users don't need to remember if they've signed up
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                // Allow user creation for both signin and signup for better UX
                // New users clicking "Sign in" will still get an account created
                shouldCreateUser: true,
                emailRedirectTo: redirectTo,
            },
        })

        if (error) {
            // Handle specific Supabase errors with user-friendly messages
            if (error.message.includes('rate limit')) {
                return {
                    status: 'error',
                    message: 'Too many requests. Please wait a moment and try again.',
                }
            }
            if (error.message.includes('not allowed')) {
                return {
                    status: 'error',
                    message: 'Unable to send magic link. Please try again or contact support.',
                }
            }
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
    } catch (e) {
        console.error('verifyEmailAction error:', e)
        return {
            status: 'error',
            message: 'An unexpected error occurred. Please try again.',
        }
    }
}

