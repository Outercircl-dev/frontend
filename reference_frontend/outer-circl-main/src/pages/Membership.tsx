
import React, { useState } from 'react';
import { toast } from 'sonner';
import UnifiedSEO from '@/components/UnifiedSEO';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { useMembership, type MembershipTier } from '@/components/OptimizedProviders';
import { supabase } from '@/integrations/supabase/client';
import MembershipHero from '@/components/membership/MembershipHero';
import MembershipPlansGrid from '@/components/membership/MembershipPlansGrid';
import MembershipFeatureComparison from '@/components/membership/MembershipFeatureComparison';
import BreadcrumbSEO from '@/components/BreadcrumbSEO';
import { generateFAQSchema } from '@/utils/seoSchemas';
import { membershipFAQs } from '@/utils/seoHelpers';

const Membership: React.FC = () => {
  const { membershipTier, pricing, region, updateMembershipTier } = useMembership();
  const [loading, setLoading] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [hasStripeSubscription, setHasStripeSubscription] = useState<boolean>(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  React.useEffect(() => {
    const handleAuthAndSuccess = async (currentUser: any) => {
      console.log('Current user:', currentUser ? { id: currentUser.id, email: currentUser.email } : 'Not logged in');
      
      // Check for success parameter from Stripe redirect
      const urlParams = new URLSearchParams(window.location.search);
      const successParam = urlParams.get('success');
      const planParam = urlParams.get('plan');
      
      if (successParam === 'true' && currentUser) {
        console.log('Processing successful payment redirect...');
        setIsProcessingPayment(true);
        toast.success('Payment successful! Updating your membership...');
        
        // Clean up URL
        window.history.replaceState({}, '', '/membership');
        
        // Wait a moment for Stripe webhook processing, then check subscription
        setTimeout(async () => {
          await updateMembershipFromStripe();
          setIsProcessingPayment(false);
        }, 2000);
      } else if (successParam === 'true' && !currentUser) {
        console.log('Success redirect but no user - trying to recover session...');
        
        // Clean up URL first
        window.history.replaceState({}, '', '/membership');
        
        // The auth state listener will handle this case
        toast.info('Verifying your authentication after payment...');
      }
      
      // Check if user has an active Stripe subscription
      if (currentUser && membershipTier === 'premium') {
        checkStripeSubscription();
      }
    };

    // Set up proper auth state management
    const checkInitialAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      await handleAuthAndSuccess(session?.user || null);
    };

    checkInitialAuth();

    // Listen for auth state changes (handles session recovery after redirects)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Membership: Auth state change:', event, session ? 'session present' : 'no session');
      const currentUser = session?.user || null;
      setUser(currentUser);
      
      // Handle success parameter if user just signed in after redirect
      await handleAuthAndSuccess(currentUser);
    });

    return () => subscription.unsubscribe();
  }, [membershipTier]);

  const checkStripeSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (!error && data && data.subscribed) {
        setHasStripeSubscription(true);
      } else {
        setHasStripeSubscription(false);
      }
    } catch (error) {
      console.log('No Stripe subscription found');
      setHasStripeSubscription(false);
    }
  };

  const updateMembershipFromStripe = async () => {
    try {
      console.log('Checking subscription status with Stripe...');
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (!error && data) {
        console.log('Stripe subscription data:', data);
        if (data.subscribed && data.subscription_tier) {
          // Only update to premium if Stripe confirms active subscription
          const newTier = data.subscription_tier as MembershipTier;
          console.log(`Updating membership from ${membershipTier} to ${newTier}`);
          updateMembershipTier(newTier);
          setHasStripeSubscription(true);
          
          // Only show success toast if this is actually an upgrade
          if (membershipTier !== newTier) {
            toast.success(`Membership upgraded to ${newTier} successfully!`);
          }
        } else {
          // Keep current tier if no active subscription but don't show error
          setHasStripeSubscription(false);
          console.log('No active subscription found');
        }
      } else {
        setHasStripeSubscription(false);
        console.log('Error checking subscription:', error);
      }
    } catch (error) {
      console.log('Failed to check subscription status:', error);
      setHasStripeSubscription(false);
    }
  };

  // Convert membershipTier to the expected type
  const displayMembershipTier: 'standard' | 'premium' = 
    membershipTier === 'premium' ? 'premium' : 'standard';

  const handleSelectPlan = (plan: 'standard' | 'premium') => {
    console.log('Plan selected:', plan);
    
    // Store the selected plan in localStorage so it can be retrieved after registration
    localStorage.setItem('selected_plan', plan);
    
    // Do NOT update membership tier immediately - only after payment is confirmed
    
    // Always redirect to registration with selected plan for non-logged in users
    const params = new URLSearchParams();
    params.set('tab', 'register');
    params.set('from-membership', 'true');
    params.set('plan', plan);
    window.location.href = `/auth?${params.toString()}`;
  };

  const handleUpgrade = async (plan: 'premium') => {
    console.log('Upgrade button clicked for plan:', plan);
    console.log('Current user:', user ? { id: user.id, email: user.email } : 'Not logged in');
    
    if (!user) {
      console.error('No user found, cannot upgrade');
      toast.error('Please sign in to upgrade your membership');
      return;
    }

    setLoading(plan);
    console.log('Starting checkout process for plan:', plan);
    
    try {
      console.log('Calling create-checkout edge function...');
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan, region }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        toast.error(`Failed to create checkout session: ${error.message}`);
        return;
      }

      if (data.error) {
        console.error('Checkout session error:', data.error);
        toast.error(data.error);
        return;
      }

      if (!data.url) {
        console.error('No checkout URL returned:', data);
        toast.error('Failed to create checkout session - no URL returned');
        return;
      }

      console.log('Attempting to open Stripe checkout URL:', data.url);
      
      // Try opening in new tab, if it fails, redirect in same window
      const newWindow = window.open(data.url, '_blank');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
        console.log('Pop-up blocked, redirecting in same window');
        // Popup was blocked, redirect in same window
        window.location.href = data.url;
      } else {
        console.log('Successfully opened in new tab');
      }
      
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    console.log('Manage subscription button clicked');
    console.log('Current user:', user ? { id: user.id, email: user.email } : 'Not logged in');
    
    if (!user) {
      toast.error('Please sign in to manage your subscription');
      return;
    }

    if (!hasStripeSubscription) {
      toast.error('No active subscription found. Please upgrade to a premium plan first.');
      return;
    }

    setLoading('manage');
    try {
      console.log('Calling customer-portal edge function...');
      const { data, error } = await supabase.functions.invoke('customer-portal');

      console.log('Customer portal response:', { data, error });

      if (error) {
        console.error('Customer portal error:', error);
        toast.error(`Failed to access customer portal: ${error.message}`);
        return;
      }

      if (data.error) {
        console.error('Portal session error:', data.error);
        toast.error(data.error);
        return;
      }

      console.log('Opening customer portal in new tab:', data.url);
      
      // Open customer portal in new tab
      const newWindow = window.open(data.url, '_blank', 'noopener,noreferrer');
      
      if (!newWindow) {
        // Fallback if popup is blocked
        console.log('Popup blocked, redirecting in same window');
        window.location.href = data.url;
      } else {
        toast.success('Customer portal opened in new tab');
      }
      
    } catch (error) {
      console.error('Error accessing customer portal:', error);
      toast.error('Failed to access customer portal');
    } finally {
      setLoading(null);
    }
  };

  const handleDowngradeToStandard = async () => {
    if (!confirm('Are you sure you want to downgrade to the standard tier? This will cancel your subscription and remove premium features.')) {
      return;
    }

    try {
      setLoading('downgrade');
      const { data, error } = await supabase.functions.invoke('downgrade-membership');
      
      if (error) {
        throw error;
      }
      
      // Update local state
      updateMembershipTier('standard');
      setHasStripeSubscription(false);
      
      toast.success('Successfully downgraded to standard tier');
    } catch (error) {
      console.error('Error downgrading membership:', error);
      toast.error('Failed to downgrade membership');
    } finally {
      setLoading(null);
    }
  };

  const isLoggedIn = !!user;

  // Generate FAQ structured data
  const faqStructuredData = generateFAQSchema(membershipFAQs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <UnifiedSEO 
        title="Membership Plans - outercircl"
        description="Choose the perfect membership plan for your activity needs. Standard and Premium options available."
        canonicalUrl="https://outercircl.com/membership"
        keywords="membership plans, premium features, activity community, subscription"
      />
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-16">
          <BreadcrumbSEO className="mb-6" />
          <MembershipHero membershipTier={displayMembershipTier} />
          
        {/* Processing Payment State */}
        {isProcessingPayment && (
          <div className="max-w-2xl mx-auto mb-12 p-6 bg-green-50 rounded-2xl border border-green-200">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              <div>
                <h3 className="text-xl font-semibold text-green-900">Processing Payment...</h3>
                <p className="text-green-700">Please wait while we update your membership status.</p>
              </div>
            </div>
          </div>
        )}

        {/* Current Membership Status & Downgrade Option */}
        {isLoggedIn && membershipTier === 'premium' && (
          <div className="max-w-2xl mx-auto mb-12 p-6 bg-blue-50 rounded-2xl border border-blue-200">
            <h3 className="text-xl font-semibold text-blue-900 mb-2">Current Plan: {membershipTier}</h3>
            <p className="text-blue-700 mb-4">
              You can manage your subscription or downgrade to the standard tier at any time.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Button
                onClick={handleManageSubscription}
                disabled={loading === 'portal'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading === 'portal' ? 'Opening...' : 'Manage Subscription'}
              </Button>
              <Button
                onClick={handleDowngradeToStandard}
                disabled={loading === 'downgrade'}
                variant="destructive"
              >
                {loading === 'downgrade' ? 'Processing...' : 'Downgrade to Standard'}
              </Button>
            </div>
          </div>
        )}

        <MembershipPlansGrid
            membershipTier={displayMembershipTier}
            pricing={{ price: pricing.price }}
            onSelectPlan={handleSelectPlan}
            onUpgrade={user ? handleUpgrade : undefined}
            onManageSubscription={handleManageSubscription}
            loading={loading}
            hasStripeSubscription={hasStripeSubscription}
            isLoggedIn={!!user}
          />

          <MembershipFeatureComparison />
        </div>
      </div>
    </>
  );
};

export default Membership;
