
import React from 'react';
import Navbar from '@/components/Navbar';

interface CreateEventLayoutProps {
  isLoggedIn?: boolean;
  username?: string;
  children: React.ReactNode;
}

const CreateEventLayout = ({ isLoggedIn = false, username, children }: CreateEventLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar isLoggedIn={isLoggedIn} username={username} />
      
      <main className="flex-1 py-4 px-3">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default CreateEventLayout;
