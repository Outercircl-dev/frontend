import React, { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Settings, Pause, ArrowDown, ExternalLink } from 'lucide-react';
import { useMembership } from '@/components/OptimizedProviders';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MembershipDowngradeModal from './MembershipDowngradeModal';

const MembershipManagement: React.FC = memo(() => {
  const navigate = useNavigate();
  const { membershipTier, updateMembershipTier } = useMembership();
  const [loading, setLoading] = useState<string | null>(null);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);

  const isPremium = membershipTier === 'premium';
  const isStandard = membershipTier === 'standard';

  const handleManageSubscription = async () => {
    setLoading('manage');
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error accessing customer portal:', error);
      toast.error('Failed to access customer portal');
    } finally {
      setLoading(null);
    }
  };

  const handleDowngradeSuccess = () => {
    // Refresh membership status
    // This will be called after successful downgrade/pause
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const getPlanIcon = () => {
    if (isPremium) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (isStandard) return <Settings className="h-5 w-5 text-blue-500" />;
    return <Settings className="h-5 w-5 text-gray-500" />;
  };

  const getPlanColor = () => {
    if (isPremium) return 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200';
    if (isStandard) return 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200';
    return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200';
  };

  const getPlanBadgeColor = () => {
    if (isPremium) return 'bg-yellow-500 text-white';
    if (isStandard) return 'bg-blue-500 text-white';
    return 'bg-gray-500 text-white';
  };

  // All users now have at least standard membership

  return (
    <>
      <Card className={`${getPlanColor()} border-2`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               {getPlanIcon()}
               Standard Membership
             </div>
            <Badge className={getPlanBadgeColor()}>
              Active
            </Badge>
          </CardTitle>
          <CardDescription>
            {isPremium 
              ? 'You have access to all premium features including unlimited participants and priority support.'
              : 'You have access to standard features including creating activities with up to 4 participants.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={handleManageSubscription}
              disabled={loading === 'manage'}
              variant="outline"
              className="bg-white hover:bg-gray-50"
            >
              {loading === 'manage' ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Opening...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage via Stripe
                </>
              )}
            </Button>
            
            <Button 
              onClick={() => setShowDowngradeModal(true)}
              variant="outline"
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause or Downgrade
            </Button>
          </div>

          <div className="text-xs text-gray-600 bg-white/50 p-3 rounded-lg">
            <p className="font-medium mb-1">💡 Good to know:</p>
            <ul className="space-y-1">
              <li>• You can pause your subscription once per year</li>
              <li>• Downgrades take effect at the end of your billing period</li>
              <li>• You can upgrade again anytime</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <MembershipDowngradeModal
        isOpen={showDowngradeModal}
        onClose={() => setShowDowngradeModal(false)}
        currentTier={membershipTier}
        onDowngradeSuccess={handleDowngradeSuccess}
      />
    </>
  );
});

MembershipManagement.displayName = 'MembershipManagement';

export default MembershipManagement;