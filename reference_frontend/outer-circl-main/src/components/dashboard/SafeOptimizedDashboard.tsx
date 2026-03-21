import React from 'react';
import { OptimizedDashboard } from './OptimizedDashboard';
import NotificationTestButton from '@/components/notifications/NotificationTestButton';

interface SafeOptimizedDashboardProps {
  userId: string;
  isMobile: boolean;
}

/**
 * Optimized dashboard wrapper with progressive loading
 */
export const SafeOptimizedDashboard: React.FC<SafeOptimizedDashboardProps> = (props) => {
  return (
    <>
      <OptimizedDashboard {...props} />
      {process.env.NODE_ENV === 'development' && <NotificationTestButton />}
    </>
  );
};