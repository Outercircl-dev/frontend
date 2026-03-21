
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';

const CallToActionSection: React.FC = () => {
  const navigate = useNavigate();
  
  const handleMembershipClick = () => {
    navigate('/membership');
  };
  
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-[#E60023] text-white">
      <div className="container text-center px-5 sm:px-6">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 leading-tight">Ready to join the community?</h2>
        <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
          Choose a membership plan that's right for you and start connecting with people in your area.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button 
            size="lg" 
            variant="outline" 
            className="border-white text-white hover:bg-white/10 rounded-full px-8"
            onClick={handleMembershipClick}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            View membership options
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CallToActionSection;
