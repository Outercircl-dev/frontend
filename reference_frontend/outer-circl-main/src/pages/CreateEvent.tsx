
import React from 'react';
import { useNavigate } from 'react-router-dom';
import OptimizedCreateEventLayout from '@/components/create-event/OptimizedCreateEventLayout';
import SafeEventForm from '@/components/create-event/SafeEventForm';
import AuthRedirect from '@/components/create-event/AuthRedirect';
import { useAppContext } from '@/components/OptimizedProviders';

export interface EventFormData {
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
  maxAttendees: number;
  image: File | null;
  agenda: Array<{ time: string; activity: string }>;
}

const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  
  // Simple navigation function
  const safeNavigate = (to: string) => {
    try {
      if (navigate) {
        navigate(to);
      } else {
        window.location.href = to;
      }
    } catch {
      window.location.href = to;
    }
  };
  
  // Phase 1: AppBootstrap guarantees context is ready
  const { user } = useAppContext();

  console.log('🎯 CreateEvent page rendering:', { 
    user: user ? { id: user.id, email: user.email } : null,
    pathname: window.location.pathname
  });

  const isLoggedIn = !!user;
  console.log('🔐 CreateEvent: Auth state', { isLoggedIn, userId: user?.id });

  return (
    <AuthRedirect isLoggedIn={isLoggedIn}>
      <OptimizedCreateEventLayout isLoggedIn={isLoggedIn}>
        <SafeEventForm />
      </OptimizedCreateEventLayout>
    </AuthRedirect>
  );
};

export default CreateEvent;
