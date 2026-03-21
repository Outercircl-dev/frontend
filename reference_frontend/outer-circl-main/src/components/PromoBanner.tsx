
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PromoBanner: React.FC = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = React.useState(true);

  const handleSignUpClick = () => {
    navigate('/thebuzz');
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-[#E60023] text-white py-3 px-4 relative">
      <div className="container mx-auto flex items-center justify-center">
        <div className="flex items-center gap-4">
          <p className="text-sm sm:text-base font-medium text-center">
            Sign up to the buzz today for exclusive discounts
          </p>
          <Button
            onClick={handleSignUpClick}
            variant="outline"
            size="sm"
            className="bg-white text-[#E60023] hover:bg-gray-100 border-white text-xs sm:text-sm font-medium rounded-full px-4"
          >
            Sign Up
          </Button>
        </div>
        <button
          onClick={handleClose}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-200 transition-colors"
          aria-label="Close banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PromoBanner;
