'use client';

import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/**
 * Basic skeleton loader for pending states
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      {...props}
    />
  );
}

