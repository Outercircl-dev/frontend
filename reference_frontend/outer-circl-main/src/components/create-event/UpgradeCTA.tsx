import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Crown, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMembership } from '@/components/OptimizedProviders';

interface UpgradeCTAProps {
  feature: string;
  benefit: string;
  variant?: 'banner' | 'card' | 'inline';
  className?: string;
}

export const UpgradeCTA: React.FC<UpgradeCTAProps> = ({ 
  feature, 
  benefit, 
  variant = 'card',
  className = '' 
}) => {
  const navigate = useNavigate();
  const { membershipTier } = useMembership();

  if (membershipTier === 'premium') return null;

  const handleUpgrade = () => {
    // Block upgrades - just show coming soon message
    return;
  };

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Crown className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{feature}</p>
              <p className="text-xs text-muted-foreground">{benefit}</p>
            </div>
          </div>
          <Button 
            disabled
            size="sm" 
            className="bg-orange-100 text-orange-600 border border-orange-200 px-4 py-2 h-8 text-xs rounded-xl cursor-not-allowed"
          >
            Coming Soon!
          </Button>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
        <Crown className="h-3 w-3 text-primary" />
        <span>{feature}</span>
        <Button 
          disabled
          variant="link" 
          className="h-auto p-0 text-xs text-orange-600 cursor-not-allowed"
        >
          Coming Soon!
        </Button>
      </div>
    );
  }

  return (
    <Card className={`p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <h4 className="text-sm font-medium text-foreground">{feature}</h4>
          <p className="text-xs text-muted-foreground">{benefit}</p>
          <Button 
            disabled
            size="sm" 
            className="bg-orange-100 text-orange-600 border border-orange-200 w-full h-8 text-xs rounded-xl cursor-not-allowed"
          >
            <Crown className="h-3 w-3 mr-1" />
            Coming Soon!
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default UpgradeCTA;