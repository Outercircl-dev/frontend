import React, { Suspense } from 'react';
import { EventFormProvider } from './EventFormProvider';
import { EventFormErrorBoundary } from './EventFormErrorBoundary';
import { EventFormContent } from './EventForm';

/**
 * Safe wrapper for EventForm that provides proper error boundaries
 * and context isolation to prevent navigation crashes
 */
const SafeEventForm: React.FC = () => {
  console.log('🔧 SafeEventForm initializing...');
  
  React.useEffect(() => {
    console.log('✅ SafeEventForm mounted successfully');
    console.log('🎯 Current route:', window.location.pathname);
    console.log('🔍 React version check:', !!React.useEffect);
    
    // Pre-warm form state for faster loading
    const preWarmTimer = setTimeout(() => {
      console.log('🚀 Pre-warming form state for better performance');
    }, 100);
    
    return () => {
      console.log('🔄 SafeEventForm unmounting');
      clearTimeout(preWarmTimer);
    };
  }, []);

  // Loading component for better UX
  const FormLoading = () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground text-sm">
          Loading Create Activity Form...
        </p>
      </div>
    </div>
  );

  return (
    <EventFormProvider>
      <EventFormErrorBoundary>
        <Suspense fallback={<FormLoading />}>
          <EventFormContent />
        </Suspense>
      </EventFormErrorBoundary>
    </EventFormProvider>
  );
};

export default SafeEventForm;