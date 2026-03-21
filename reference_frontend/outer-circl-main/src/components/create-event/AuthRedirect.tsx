
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthRedirectProps {
  isLoggedIn: boolean;
  children: React.ReactNode;
}

const AuthRedirect = ({ isLoggedIn, children }: AuthRedirectProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn) {
      console.log('AuthRedirect: User not authenticated, redirecting to auth');
      const currentPath = window.location.pathname;
      toast.error("Please log in to access this page");
      navigate(`/auth?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [isLoggedIn, navigate]);

  // Show loading state while redirecting
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthRedirect;
