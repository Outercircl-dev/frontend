import React from 'react';
import OptimizedNavbar from '@/components/navbar/OptimizedNavbar';

interface OptimizedCreateEventLayoutProps {
  isLoggedIn?: boolean;
  username?: string;
  children: React.ReactNode;
}

const OptimizedCreateEventLayout: React.FC<OptimizedCreateEventLayoutProps> = ({ 
  isLoggedIn = false, 
  username, 
  children 
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <OptimizedNavbar isLoggedIn={isLoggedIn} username={username} />
      
      <main className="flex-1 py-4 px-3">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default OptimizedCreateEventLayout;