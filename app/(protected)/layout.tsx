'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuthState } from '@/hooks/useAuthState';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedLayoutProps {
  children: ReactNode;
}

/**
 * Protected Layout - wraps all protected routes
 *
 * Responsibilities:
 * 1. Check auth state from backend
 * 2. If user should be elsewhere (per backend), redirect them
 * 3. While loading, show skeleton
 * 4. If error, redirect to login
 *
 * Usage:
 * Wrap routes in /app/(protected)/ to use this layout
 */
export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { state, redirectUrl, isLoading, error } = useAuthState();
  const router = useRouter();
  const pathname = usePathname();

  // Handle redirects based on backend state
  useEffect(() => {
    if (isLoading) return; // Wait for auth data

    if (error || !state) {
      router.push('/auth/login');
      return;
    }

    if (redirectUrl && redirectUrl !== pathname) {
      router.push(redirectUrl);
    }
  }, [isLoading, error, state, redirectUrl, pathname, router]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-red-600">Auth Error</h1>
        <p className="text-gray-600">{error.message}</p>
      </div>
    );
  }

  return <>{children}</>;
}

