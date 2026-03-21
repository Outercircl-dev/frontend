
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Heart, Crown } from 'lucide-react';

interface MembershipHeroProps {
  membershipTier: 'standard' | 'premium';
}

const MembershipHero: React.FC<MembershipHeroProps> = ({ membershipTier }) => {
  const tierConfig = {
    standard: {
      icon: Heart,
      label: 'standard explorer',
      description: 'you\'re just getting started on your adventure',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    premium: {
      icon: Crown,
      label: 'premium adventurer',
      description: 'unlock the full potential of social discovery',
      color: 'text-[#E60023]',
      bgColor: 'bg-[#E60023]/10'
    }
  };

  const config = tierConfig[membershipTier];
  const IconComponent = config.icon;

  return (
    <div className="text-center py-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E60023]/5 via-purple-50/30 to-blue-50/30" />
      <div className="absolute top-10 left-10 w-20 h-20 bg-[#E60023]/10 rounded-full blur-xl" />
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-200/20 rounded-full blur-xl" />
      
      <div className="relative max-w-4xl mx-auto">
        <div className="flex items-center justify-center mb-6">
          <Sparkles className="h-8 w-8 text-[#E60023] mr-3" />
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#E60023] to-purple-600 bg-clip-text text-transparent">
            membership plans
          </h1>
        </div>
        
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          discover the perfect plan to elevate your social life and connect with amazing experiences
        </p>

      </div>
    </div>
  );
};

export default MembershipHero;
