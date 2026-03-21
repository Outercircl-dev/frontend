
import React from 'react';
import { Users } from 'lucide-react';
import { useMembership } from '@/components/OptimizedProviders';

const EventFormHeader: React.FC = () => {
  const { membershipTier } = useMembership();
  const isPremium = membershipTier === 'premium';

  return (
    <div className="flex items-center gap-2 pb-4 border-b">
      <Users className="h-5 w-5 text-brand-salmon" />
      <div>
        <p className="font-medium">{isPremium ? 'Premium Participant Options' : 'Participant Limit: 4 (including you)'}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {isPremium 
            ? 'As a premium member, you have enhanced participant management and approval options' 
            : 'Your activity goes live once 3 people join'}
        </p>
      </div>
    </div>
  );
};

export default EventFormHeader;
