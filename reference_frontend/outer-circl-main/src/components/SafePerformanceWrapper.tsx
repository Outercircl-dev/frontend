import React from 'react';
import PerformanceMonitor from './optimization/PerformanceMonitor';
import PerformanceMetrics from './optimization/PerformanceMetrics';
import PerformanceAlertsManager from './optimization/PerformanceAlertsManager';
import ErrorBoundary from './ErrorBoundary';

const SafePerformanceWrapper: React.FC = () => {
  // Only render performance components in a safe environment
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    <ErrorBoundary fallback={<div style={{ display: 'none' }} />}>
      <PerformanceMonitor />
      <PerformanceMetrics />
      <PerformanceAlertsManager />
    </ErrorBoundary>
  );
};

export default SafePerformanceWrapper;