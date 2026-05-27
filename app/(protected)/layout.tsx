// Copyright (c) 2026 Outer Circle. All rights reserved.

import { Suspense, type ReactNode } from 'react';

import { ProtectedLayoutGuard } from '@/components/layout/protected-layout-guard';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedLayoutProps {
  children: ReactNode;
}

function ProtectedLayoutFallback() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

/**
 * Protected Layout - wraps all protected routes
 *
 * Responsibilities:
 * 1. Check auth state from backend
 * 2. If user should be elsewhere (per backend), redirect them
 * 3. While loading, show skeleton
 * 4. If error, redirect to login
 */
export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <Suspense fallback={<ProtectedLayoutFallback />}>
      <ProtectedLayoutGuard>{children}</ProtectedLayoutGuard>
    </Suspense>
  );
}
