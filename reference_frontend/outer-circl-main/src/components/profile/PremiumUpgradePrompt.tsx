
import React from 'react';
import { Lock } from 'lucide-react';

const PremiumUpgradePrompt: React.FC = () => {
  return (
    <div className="mt-4 p-2 bg-orange-50 rounded-md border border-orange-100 text-xs flex items-center">
      <Lock className="h-3.5 w-3.5 mr-1 text-orange-500" />
      <span className="text-orange-600">Upgrade to premium to see detailed profile - Coming Soon!</span>
    </div>
  );
};

export default PremiumUpgradePrompt;
