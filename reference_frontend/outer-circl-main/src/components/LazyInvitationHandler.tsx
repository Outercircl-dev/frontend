import * as React from 'react';

const { useState, useEffect, lazy, Suspense } = React;
import { useAppContext } from '@/components/OptimizedProviders';


const InvitationNotificationHandler = lazy(() => import('./InvitationNotificationHandler'));

const LazyInvitationHandler: React.FC = () => {

  const { user } = useAppContext();
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Only load invitation handler for authenticated users
    if (user) {
      const timer = setTimeout(() => {
        setShouldLoad(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [user]);

  if (!shouldLoad || !user) return null;

  return (
    <Suspense fallback={null}>
      <InvitationNotificationHandler />
    </Suspense>
  );
};

export default LazyInvitationHandler;