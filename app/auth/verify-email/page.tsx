'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuthState } from '@/hooks/useAuthState';

/**
 * Email Verification Page
 *
 * User sees this after:
 * 1. Clicking magic link in email
 * 2. Being redirected to /auth/verify-email
 *
 * Page shows:
 * - Success message
 * - User's email address
 * - Auto-redirect in 2 seconds
 * - Manual continue button
 */
export default function VerifyEmailPage() {
  const { user, redirectUrl } = useAuthState();
  const router = useRouter();

  useEffect(() => {
    if (!redirectUrl || redirectUrl === '/auth/verify-email') return;

    const timer = setTimeout(() => {
      router.push(redirectUrl);
    }, 2000);

    return () => clearTimeout(timer);
  }, [redirectUrl, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-secondary">
      <div className="w-full max-w-md px-4">
        <div className="space-y-6 rounded-lg bg-surface p-8 shadow-lg">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-green-500/20 blur-md" />
              <CheckCircle className="relative h-16 w-16 text-green-500" aria-hidden />
            </div>
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-foreground">Email Verified!</h1>
            <p className="text-muted-foreground">
              We&apos;ve confirmed your email:{' '}
              <span className="font-semibold text-foreground">{user?.email}</span>
            </p>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
            <p className="text-sm text-green-800 dark:text-green-200">
              Your account is set up. Redirecting to the next step...
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              onClick={() => redirectUrl && router.push(redirectUrl)}
              className="w-full"
              size="lg"
            >
              Continue
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              You&apos;ll be redirected automatically in 2 seconds
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

