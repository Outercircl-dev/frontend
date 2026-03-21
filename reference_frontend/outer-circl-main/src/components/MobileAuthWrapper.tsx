import React, { useEffect, useState } from 'react';

interface MobileAuthWrapperProps {
  children: React.ReactNode;
}

const MobileAuthWrapper: React.FC<MobileAuthWrapperProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Comprehensive mobile detection
    const checkMobile = () => {
      const windowWidth = window.innerWidth <= 768;
      const userAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
      const touchCapability = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const aspectRatio = window.innerWidth < window.innerHeight;
      
      const mobile = windowWidth || userAgent || (touchCapability && aspectRatio);
      
      console.log('📱 MobileAuthWrapper detection:', {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        userAgent: navigator.userAgent.substring(0, 50),
        isMobile: mobile,
        checks: { windowWidth, userAgent, touchCapability, aspectRatio }
      });
      
      setIsMobile(mobile);
      setIsReady(true);
    };

    // Small delay to ensure DOM is ready
    setTimeout(checkMobile, 100);
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E60023] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Add mobile-specific classes and attributes
  if (isMobile) {
    return (
      <div 
        className="mobile-auth-container"
        style={{
          minHeight: '100dvh', // Dynamic viewport height for mobile
          width: '100%',
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          position: 'relative'
        }}
      >
        {children}
      </div>
    );
  }

  return <>{children}</>;
};

export default MobileAuthWrapper;