import * as React from 'react';
import OptimizedEventDetails from './OptimizedEventDetails';

/**
 * Simplified event details wrapper - fixed React import and removed nested ErrorBoundary
 */
const SafeOptimizedEventDetails: React.FC = () => {
  return <OptimizedEventDetails />;
};

export default SafeOptimizedEventDetails;