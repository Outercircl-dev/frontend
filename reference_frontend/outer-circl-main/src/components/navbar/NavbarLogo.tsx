
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/components/OptimizedProviders';

const NavbarLogo: React.FC = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { t } = useLanguage();
  const isHomepage = location.pathname === '/';

  return (
    <div className="flex items-center space-x-4">
      <Link to="/dashboard" className="flex items-center">
        {isMobile && !isHomepage ? (
          <img 
            src="/lovable-uploads/8f6f4c91-8281-45b1-b7e4-27b7b5358bb8.png" 
            alt="outercircl" 
            className="h-6 w-6" 
          />
        ) : (
          <>
            <img 
              src="/lovable-uploads/bb54d9cc-c97c-412f-959c-d981b768d807.png" 
              alt="outercircl" 
              className={isMobile ? "h-6" : "h-8"}
            />
            <span className={`ml-0.5 ${isMobile ? "text-[0.4rem]" : "text-[0.5rem]"}`}>™</span>
          </>
        )}
      </Link>
    </div>
  );
};

export default NavbarLogo;
