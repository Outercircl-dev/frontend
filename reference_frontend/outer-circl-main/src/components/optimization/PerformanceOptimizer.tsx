import React from 'react';
import CriticalCSS from './CriticalCSS';
import ResourcePreloader from './ResourcePreloader';

interface PerformanceOptimizerProps {
  children: React.ReactNode;
  enableAll?: boolean;
  criticalRoutes?: string[];
  criticalImages?: string[];
}

const PerformanceOptimizer: React.FC<PerformanceOptimizerProps> = ({ 
  children, 
  enableAll = true,
  criticalRoutes,
  criticalImages
}) => {
  return (
    <>
      <CriticalCSS />
      {enableAll && (
        <ResourcePreloader 
          criticalRoutes={criticalRoutes}
          criticalImages={criticalImages}
        />
      )}
      {children}
    </>
  );
};

export default PerformanceOptimizer;