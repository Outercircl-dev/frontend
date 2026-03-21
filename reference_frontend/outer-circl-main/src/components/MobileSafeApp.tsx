import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { OptimizedProviders } from '@/components/OptimizedProviders';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';

// Minimal mobile app without problematic components
const MobileSafeApp: React.FC = () => {
  console.log('📱 MobileSafeApp: Rendering minimal mobile version');
  
  return (
    <div className="min-h-screen bg-white">
      <OptimizedProviders>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-4">
                  <h1 className="text-2xl font-bold text-[#E60023] mb-4">outercircl</h1>
                  <p className="text-gray-600 mb-4">Page not found</p>
                  <a 
                    href="/" 
                    className="bg-[#E60023] text-white px-6 py-2 rounded-full inline-block"
                  >
                    Go Home
                  </a>
                </div>
              </div>
            } />
          </Routes>
        </BrowserRouter>
      </OptimizedProviders>
    </div>
  );
};

export default MobileSafeApp;