import React from 'react';
import { withMemoization } from './ComponentMemoization';
import MobileDashboard from '@/components/MobileDashboard';
import DesktopDashboard from '@/components/DesktopDashboard';

// Memoized versions of dashboard components for better performance
// Since these components don't take props, we can use simple memoization
export const MemoizedMobileDashboard = React.memo(MobileDashboard);
export const MemoizedDesktopDashboard = React.memo(DesktopDashboard);