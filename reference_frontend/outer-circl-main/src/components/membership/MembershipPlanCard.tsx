
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Heart, Sparkles } from 'lucide-react';
import { useMembership } from '@/components/OptimizedProviders';

interface MembershipPlanCardProps {
  plan: 'standard' | 'premium';
  isCurrentPlan: boolean;
  price: number;
  features: string[];
  onSelectPlan?: () => void;
  onUpgrade?: () => void;
  onManageSubscription?: () => void;
  loading?: string | null;
  popular?: boolean;
  hasStripeSubscription?: boolean;
  isLoggedIn: boolean;
}

const MembershipPlanCard: React.FC<MembershipPlanCardProps> = ({
  plan,
  isCurrentPlan,
  price,
  features,
  onSelectPlan,
  onUpgrade,
  onManageSubscription,
  loading,
  popular = false,
  hasStripeSubscription = false,
  isLoggedIn
}) => {
  const { pricing } = useMembership();
  const planConfig = {
    standard: {
      title: 'standard',
      description: '',
      icon: Heart,
      gradient: 'from-gray-50 via-white to-gray-50',
      borderColor: 'border-gray-200',
      buttonColor: 'bg-gray-600 hover:bg-gray-700',
      accentColor: 'text-gray-600'
    },
    premium: {
      title: 'premium',
      description: '',
      icon: Crown,
      gradient: 'from-[#E60023]/5 via-white to-[#E60023]/10',
      borderColor: 'border-[#E60023]/20',
      buttonColor: 'bg-[#E60023] hover:bg-[#D50C22]',
      accentColor: 'text-[#E60023]'
    }
  };

  const config = planConfig[plan];
  const IconComponent = config.icon;

  // Show manage subscription button only if user has current plan AND has active Stripe subscription
  const showManageButton = isLoggedIn && isCurrentPlan && hasStripeSubscription && plan !== 'standard';

  const handleButtonClick = () => {
    if (plan === 'premium') {
      // Block premium upgrades
      return;
    }
    if (!isLoggedIn) {
      // For non-logged in users, always allow plan selection
      if (onSelectPlan) {
        onSelectPlan();
      }
    } else if (isLoggedIn && onUpgrade && !isCurrentPlan) {
      // For logged in users wanting to upgrade
      onUpgrade();
    }
  };

  const getButtonText = () => {
    if (plan === 'premium') {
      return 'coming soon!';
    }
    if (!isLoggedIn) {
      return `get ${plan}`;
    }
    if (isCurrentPlan) {
      return 'current plan';
    }
    return `upgrade to ${plan}`;
  };

  const isButtonDisabled = () => {
    if (plan === 'premium') return true; // Always disable premium
    if (!isLoggedIn) return false; // Allow all selections for non-logged in users
    if (isCurrentPlan) return true;
    return loading === plan;
  };

  return (
    <Card className={`
      relative overflow-hidden h-full
      transition-all duration-500 ease-out
      hover:shadow-2xl hover:-translate-y-2
      rounded-3xl border-2
      ${popular ? 'ring-4 ring-[#E60023]/20 shadow-xl scale-105' : 'shadow-lg'}
      ${isCurrentPlan ? `border-[#E60023] ${config.borderColor}` : config.borderColor}
      bg-gradient-to-br ${config.gradient}
    `}>
      
      {/* Popular badge or Coming Soon badge */}
      {popular && plan === 'premium' && (
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-semibold py-1.5 px-3 rounded-full shadow-md flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            coming soon!
          </div>
        </div>
      )}
      {popular && plan !== 'premium' && (
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-gradient-to-r from-[#E60023] to-[#D50C22] text-white text-xs font-semibold py-1.5 px-3 rounded-full shadow-md flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            most popular
          </div>
        </div>
      )}
      
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`} />
      </div>
      
      <CardHeader className={`relative z-10 ${popular ? 'pt-6' : 'pt-6'} pb-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl bg-white shadow-md ${config.accentColor}`}>
              <IconComponent className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 capitalize">{config.title}</CardTitle>
              {isCurrentPlan && (
                <Badge variant="secondary" className="bg-[#E60023] text-white text-xs mt-1">
                  current plan
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {config.description && (
          <CardDescription className="text-gray-600 text-base leading-relaxed mb-4">
            {config.description}
          </CardDescription>
        )}
        
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-gray-900">
            {plan === 'standard' ? `${pricing.symbol}0` : pricing.display}
          </span>
          {plan !== 'standard' && <span className="text-gray-500 text-lg">/month</span>}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 px-6 pb-6">
        <div className="space-y-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3 group">
              <div className="flex-shrink-0 mt-1">
                <div className={`w-5 h-5 rounded-full bg-gradient-to-r from-[#E60023] to-[#D50C22] flex items-center justify-center shadow-sm`}>
                  <Check className="h-3 w-3 text-white" />
                </div>
              </div>
              <span className="text-gray-700 text-sm leading-relaxed group-hover:text-gray-900 transition-colors">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="relative z-10 pt-2 pb-6 px-6">
        {showManageButton ? (
          <div className="w-full space-y-3">
            <Button
              onClick={onManageSubscription}
              disabled={loading === 'manage'}
              className={`
                w-full rounded-2xl h-12 font-semibold text-base
                ${config.buttonColor} text-white
                transition-all duration-300 hover:shadow-lg
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {loading === 'manage' ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  loading...
                </div>
              ) : (
                'manage subscription'
              )}
            </Button>
            <p className="text-xs text-center text-gray-500 font-medium">
              ✨ your current plan
            </p>
          </div>
        ) : isCurrentPlan && plan === 'standard' ? (
          <div className="w-full space-y-3">
            <div className="w-full rounded-2xl h-12 bg-gray-200 text-gray-600 flex items-center justify-center font-semibold text-base">
              current plan
            </div>
            <p className="text-xs text-center text-gray-500 font-medium">
              ✨ your current plan
            </p>
          </div>
        ) : isCurrentPlan && !hasStripeSubscription ? (
          <div className="w-full space-y-3">
            <div className="w-full rounded-2xl h-12 bg-gray-200 text-gray-600 flex items-center justify-center font-semibold text-base">
              current plan
            </div>
            <p className="text-xs text-center text-gray-500 font-medium">
              💡 upgrade through Stripe to manage subscription
            </p>
          </div>
        ) : (
          <Button
            onClick={handleButtonClick}
            disabled={isButtonDisabled()}
            className={`
              w-full rounded-2xl h-12 font-semibold text-base
              ${plan === 'premium' ? 'bg-orange-100 text-orange-600 cursor-not-allowed border border-orange-200' : ''}
              ${isCurrentPlan && plan !== 'premium' ? 'bg-gray-200 text-gray-600 cursor-not-allowed' : ''} 
              ${!isCurrentPlan && plan !== 'premium' ? config.buttonColor : ''}
              ${!isCurrentPlan && plan !== 'premium' ? 'text-white' : ''}
              ${!isCurrentPlan && plan !== 'premium' ? 'transition-all duration-300 hover:shadow-lg transform hover:scale-105' : ''}
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
            `}
          >
            {loading === plan ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                processing...
              </div>
            ) : (
              getButtonText()
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default MembershipPlanCard;
