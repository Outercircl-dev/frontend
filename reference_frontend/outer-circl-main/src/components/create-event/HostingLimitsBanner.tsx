
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Crown, Lock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMembership } from '@/components/OptimizedProviders';

interface HostingLimitsBannerProps {
  eventsThisMonth: number;
  monthlyLimit: number;
  canHostMore: boolean;
}

const HostingLimitsBanner: React.FC<HostingLimitsBannerProps> = ({
  eventsThisMonth,
  monthlyLimit,
  canHostMore
}) => {
  const { membershipTier } = useMembership();
  const isPremium = membershipTier === 'premium';

  if (isPremium) {
    return (
      <Alert className="mb-4 border-pink-200 bg-pink-50">
        <Crown className="h-4 w-4 text-pink-600" />
        <AlertDescription className="text-sm text-pink-700">
          <div className="flex items-center justify-between">
            <span>
              <strong>Premium Member:</strong> Host unlimited activities this month! 
              You've created {eventsThisMonth} activities so far.
            </span>
            <div className="flex items-center gap-1 text-xs bg-pink-100 text-pink-600 px-2 py-1 rounded-full">
              <Crown className="h-3 w-3" />
              Unlimited
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!canHostMore) {
    return (
      <Alert className="mb-4 border-red-200 bg-red-50">
        <Lock className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-sm text-red-700">
          <div className="space-y-2">
            <div>
              <strong>Monthly limit reached:</strong> You've created {eventsThisMonth} out of {monthlyLimit} activities this month.
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">Standard users can host up to 2 activities per month. Upgrade to Premium for unlimited hosting</span>
              <Link to="/membership">
                <Button size="sm" className="h-6 text-xs bg-[#E60023] hover:bg-[#D50C22]">
                  <Crown className="h-3 w-3 mr-1" />
                  Upgrade Now
                </Button>
              </Link>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="mb-4 border-blue-200 bg-blue-50">
      <Users className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-sm text-blue-700">
        <div className="flex items-center justify-between">
          <span>
            You've created <strong>{eventsThisMonth} out of {monthlyLimit}</strong> activities this month.
          </span>
          <Link to="/membership" className="text-xs text-blue-600 hover:text-blue-800 underline">
            Upgrade for unlimited hosting
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default HostingLimitsBanner;
