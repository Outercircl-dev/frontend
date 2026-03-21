import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SafeNavigationWrapperProps {
  children: React.ReactNode;
}

export const SafeNavigationWrapper: React.FC<SafeNavigationWrapperProps> = ({ children }) => {
  const navigate = useNavigate();
  return <>{children}</>;
};

// Hook to safely get navigation function
export const useSafeNavigate = () => {
  const navigate = useNavigate();
  return navigate;
};