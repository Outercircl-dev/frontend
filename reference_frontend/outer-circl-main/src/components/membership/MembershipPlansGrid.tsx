
import React from 'react';
import MembershipPlanCard from './MembershipPlanCard';

interface MembershipPlansGridProps {
  membershipTier: 'standard' | 'premium';
  pricing: { price: number };
  onSelectPlan?: (plan: 'standard' | 'premium') => void;
  onUpgrade?: (plan: 'premium') => void;
  onManageSubscription: () => void;
  loading: string | null;
  hasStripeSubscription?: boolean;
  isLoggedIn: boolean;
}

const MembershipPlansGrid: React.FC<MembershipPlansGridProps> = ({
  membershipTier,
  pricing,
  onSelectPlan,
  onUpgrade,
  onManageSubscription,
  loading,
  hasStripeSubscription = false,
  isLoggedIn
}) => {
  const planFeatures = {
    standard: [
      'browse unlimited activities',
      'join public activities',
      'create activities (max 4 participants)',
      'basic profile features',
      'community access'
    ],
    premium: [
      'create unlimited activities per month',
      'unlimited participants per activity',
      'enhanced activity creation controls',
      'advanced profile features',
      'early access to new features'
    ]
  };

  // Allow plan selection for both logged in and non-logged in users
  const handlePlanSelection = (plan: 'standard' | 'premium') => {
    if (isLoggedIn && onUpgrade && plan !== 'standard') {
      // User is logged in and wants to upgrade
      onUpgrade(plan);
    } else if (onSelectPlan) {
      // User is not logged in or selecting standard plan - redirect to registration
      onSelectPlan(plan);
    }
  };

  return (
    <div className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="text-center mb-16 px-4">
        <h2 className="text-4xl font-bold mb-6 text-gray-900">
          {isLoggedIn ? 'upgrade your plan' : 'choose your adventure'}
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          {isLoggedIn 
            ? 'enhance your experience with premium features'
            : 'find the perfect plan to unlock your social potential and discover amazing activities'
          }
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Pinterest-style grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-center">
          {/* Standard Plan */}
          <div className="transform hover:scale-105 transition-all duration-300">
            <MembershipPlanCard
              plan="standard"
              isCurrentPlan={membershipTier === 'standard'}
              price={0}
              features={planFeatures.standard}
              onSelectPlan={() => handlePlanSelection('standard')}
              onManageSubscription={onManageSubscription}
              loading={loading}
              hasStripeSubscription={hasStripeSubscription}
              isLoggedIn={isLoggedIn}
            />
          </div>

          {/* Premium Plan - Featured */}
          <div className="transform hover:scale-105 transition-all duration-300">
            <MembershipPlanCard
              plan="premium"
              isCurrentPlan={membershipTier === 'premium'}
              price={pricing.price}
              features={planFeatures.premium}
              onSelectPlan={() => handlePlanSelection('premium')}
              onUpgrade={isLoggedIn && onUpgrade ? () => onUpgrade('premium') : undefined}
              onManageSubscription={onManageSubscription}
              loading={loading}
              popular={true}
              hasStripeSubscription={hasStripeSubscription}
              isLoggedIn={isLoggedIn}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembershipPlansGrid;
