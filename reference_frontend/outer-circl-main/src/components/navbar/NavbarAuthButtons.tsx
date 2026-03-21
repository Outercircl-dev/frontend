
import React from 'react';
import { Button } from '@/components/ui/button';

interface NavbarAuthButtonsProps {
  isLoggedIn: boolean;
  onLogin: () => void;
  onRegister: () => void;
}

const NavbarAuthButtons: React.FC<NavbarAuthButtonsProps> = ({
  isLoggedIn,
  onLogin,
  onRegister
}) => {
  if (isLoggedIn) return null;

  const handleRegisterClick = () => {
    // Redirect directly to registration
    window.location.href = '/auth?tab=register';
  };

  return (
    <div className="flex items-center gap-3">
      <Button 
        variant="outline" 
        className="hidden sm:inline-flex rounded-full border-gray-300 hover:border-[#E60023] hover:text-[#E60023] transition-colors" 
        onClick={onLogin}
      >
        Log In
      </Button>
      <Button 
        className="rounded-full bg-[#E60023] hover:bg-[#D50C22] text-white shadow-md hover:shadow-lg transition-all" 
        onClick={handleRegisterClick}
      >
        Sign Up
      </Button>
    </div>
  );
};

export default NavbarAuthButtons;
