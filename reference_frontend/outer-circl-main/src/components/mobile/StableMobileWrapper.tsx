import React, { ReactNode } from 'react';
import { useStableMobile } from '@/hooks/useStableMobile';

interface StableMobileWrapperProps {
  children: ReactNode;
  mobileContent?: ReactNode;
  desktopContent?: ReactNode;
  fallback?: ReactNode;
}

/**
 * A wrapper component that provides stable mobile/desktop rendering
 * without causing hook call mismatches
 */
export const StableMobileWrapper: React.FC<StableMobileWrapperProps> = ({
  children,
  mobileContent,
  desktopContent,
  fallback
}) => {
  const isMobile = useStableMobile();

  // Render specific content based on device type
  if (mobileContent && isMobile) {
    return <>{mobileContent}</>;
  }
  
  if (desktopContent && !isMobile) {
    return <>{desktopContent}</>;
  }
  
  // Render fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // Default: render children with stable mobile state
  return (
    <div data-mobile={isMobile} className="stable-mobile-wrapper">
      {children}
    </div>
  );
};

export default StableMobileWrapper;