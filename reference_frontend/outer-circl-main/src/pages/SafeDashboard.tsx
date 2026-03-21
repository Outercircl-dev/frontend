import React from 'react';
import Dashboard from './Dashboard';
import { SafeMessagingProvider } from '@/contexts/SafeMessagingContext';

/**
 * Phase 3: Deferred messaging provider for faster Time to Interactive
 * Messaging loads 2 seconds after initial render to prioritize core UI
 */
const SafeDashboard: React.FC = () => {
  return (
    <SafeMessagingProvider defer={true} deferMs={2000}>
      <Dashboard />
    </SafeMessagingProvider>
  );
};

export default SafeDashboard;