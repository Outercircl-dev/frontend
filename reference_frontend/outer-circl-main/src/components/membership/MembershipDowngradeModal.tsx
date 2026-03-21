import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Pause, ArrowDown, Clock, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MembershipDowngradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string;
  onDowngradeSuccess: () => void;
}

const MembershipDowngradeModal: React.FC<MembershipDowngradeModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  onDowngradeSuccess
}) => {
  const [selectedOption, setSelectedOption] = useState<'pause' | 'downgrade' | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePauseSubscription = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('pause-subscription');
      
      if (error) throw error;
      
      toast.success('Your subscription has been paused successfully. You can reactivate it anytime within the year.');
      onDowngradeSuccess();
      onClose();
    } catch (error) {
      console.error('Error pausing subscription:', error);
      toast.error('Failed to pause subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDowngradeSubscription = async () => {
    setLoading(true);
    try {
      const targetTier = 'standard'; // Only allow downgrade to standard
      const { error } = await supabase.functions.invoke('downgrade-membership', {
        body: { targetTier }
      });
      
      if (error) throw error;
      
      toast.success(`Successfully downgraded to ${targetTier} membership`);
      onDowngradeSuccess();
      onClose();
    } catch (error) {
      console.error('Error downgrading membership:', error);
      toast.error('Failed to downgrade membership. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedOption === 'pause') {
      handlePauseSubscription();
    } else if (selectedOption === 'downgrade') {
      handleDowngradeSubscription();
    }
  };

  const resetState = () => {
    setSelectedOption(null);
    setShowConfirm(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (showConfirm) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm {selectedOption === 'pause' ? 'Pause' : 'Downgrade'}
            </DialogTitle>
            <DialogDescription>
              {selectedOption === 'pause' 
                ? 'Your subscription will be paused and you can reactivate it within the year. You\'ll keep access until your current billing period ends.'
                : 'Your subscription will be downgraded to Standard at the end of your current billing period.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirm(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={loading}
              className={selectedOption === 'pause' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-destructive hover:bg-destructive/90'}
            >
              {loading ? 'Processing...' : `Confirm ${selectedOption === 'pause' ? 'Pause' : 'Downgrade'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Your {currentTier} Membership</DialogTitle>
          <DialogDescription>
            Choose how you'd like to modify your subscription. You can pause your account once per year or downgrade to a lower tier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
              selectedOption === 'pause' ? 'border-amber-500 bg-amber-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedOption('pause')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                  <Pause className="h-5 w-5" />
                </div>
                Pause Subscription
                <div className="flex items-center gap-1 text-sm font-normal text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                  <Clock className="h-3 w-3" />
                  Once per year
                </div>
              </CardTitle>
              <CardDescription>
                Take a break from your subscription while keeping your account active
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Star className="h-3 w-3 text-amber-500" />
                  Keep access until current billing period ends
                </li>
                <li className="flex items-center gap-2">
                  <Star className="h-3 w-3 text-amber-500" />
                  Reactivate anytime within 12 months
                </li>
                <li className="flex items-center gap-2">
                  <Star className="h-3 w-3 text-amber-500" />
                  No charges while paused
                </li>
                <li className="flex items-center gap-2">
                  <Star className="h-3 w-3 text-amber-500" />
                  Perfect for temporary breaks
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
              selectedOption === 'downgrade' ? 'border-red-500 bg-red-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedOption('downgrade')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-red-100 text-red-600">
                  <ArrowDown className="h-5 w-5" />
                </div>
                Downgrade to Standard
              </CardTitle>
              <CardDescription>
                Switch to Standard membership with basic features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  Lose premium features like unlimited participants
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  Changes take effect at end of billing period
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  Can upgrade again anytime
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={() => setShowConfirm(true)}
            disabled={!selectedOption}
            className={selectedOption === 'pause' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-destructive hover:bg-destructive/90'}
          >
            {selectedOption === 'pause' ? 'Pause Subscription' : 'Downgrade Membership'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MembershipDowngradeModal;