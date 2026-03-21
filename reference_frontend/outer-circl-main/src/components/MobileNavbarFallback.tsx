import React from 'react';
import { Link } from 'react-router-dom';

// Force immediate visible fallback for mobile navbar issues
const MobileNavbarFallback: React.FC = () => {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Simple logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img 
                src="/lovable-uploads/8f6f4c91-8281-45b1-b7e4-27b7b5358bb8.png" 
                alt="outercircl" 
                className="h-6 w-6" 
              />
            </Link>
          </div>
          
          {/* Simple auth buttons */}
          <div className="flex items-center gap-2">
            <Link 
              to="/auth?tab=login"
              className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:border-[#E60023] hover:text-[#E60023] transition-colors"
            >
              login
            </Link>
            <Link 
              to="/auth?tab=register"
              className="px-4 py-2 text-sm bg-[#E60023] text-white rounded-full hover:bg-[#D50C22] transition-colors"
            >
              sign up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MobileNavbarFallback;