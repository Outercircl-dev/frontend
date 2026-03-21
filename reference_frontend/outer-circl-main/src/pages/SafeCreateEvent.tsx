import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import CreateEvent from './CreateEvent';

/**
 * Simplified create event wrapper - removed problematic ReactSafetyWrapper
 */
const SafeCreateEvent: React.FC = () => {
  return (
    <ErrorBoundary>
      <CreateEvent />
    </ErrorBoundary>
  );
};

export default SafeCreateEvent;