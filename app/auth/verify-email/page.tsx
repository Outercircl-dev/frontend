// Copyright (c) 2026 Outer Circle. All rights reserved.

import { Suspense } from 'react';

import { VerifyEmailContent } from '@/components/auth/verify-email-content';

function VerifyEmailFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-secondary">
      <div className="w-full max-w-md px-4 text-center text-muted-foreground">Loading...</div>
    </div>
  );
}

/**
 * Email Verification Page
 *
 * User sees this after:
 * 1. Clicking magic link in email
 * 2. Being redirected to /auth/verify-email
 */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
