// Basic providers with simple React component structure
import { Component, createContext, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export type MembershipTier = 'standard' | 'premium';
export type Region = 'us' | 'uk' | 'eu' | 'ca' | 'au' | 'jp' | 'in';

interface RegionalPricing {
  price: number;
  currency: string;
  symbol: string;
  display: string;
}

interface AppContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  unreadNotifications: number;
  setUnreadNotifications: (count: number) => void;
  membershipTier: MembershipTier;
  updateMembershipTier: (tier: MembershipTier) => void;
  showAds: boolean;
  region: Region;
  updateRegion: (region: Region) => void;
  pricing: RegionalPricing;
  consentProvided: boolean;
  consentType: string;
  updateConsent: (hasConsented: boolean) => void;
  reliabilityStars: number;
  updateReliabilityStars: (newRating: number) => void;
  canViewOthersReliability: boolean;
}

const pricingData: Record<Region, RegionalPricing> = {
  us: { price: 9.99, currency: 'USD', symbol: '$', display: '$9.99' },
  uk: { price: 8.49, currency: 'GBP', symbol: '£', display: '£8.49' },
  eu: { price: 9.99, currency: 'EUR', symbol: '€', display: '€9.99' },
  ca: { price: 14.99, currency: 'CAD', symbol: 'CA$', display: 'CA$14.99' },
  au: { price: 16.99, currency: 'AUD', symbol: 'A$', display: 'A$16.99' },
  jp: { price: 1599, currency: 'JPY', symbol: '¥', display: '¥1,599' },
  in: { price: 899, currency: 'INR', symbol: '₹', display: '₹899' }
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

const AppContext = createContext<AppContextType | undefined>(undefined);

// Default context value
const defaultContextValue: AppContextType = {
  user: null,
  session: null,
  isLoading: false,
  isInitialized: true,
  unreadNotifications: 0,
  setUnreadNotifications: () => {},
  membershipTier: 'standard',
  updateMembershipTier: () => {},
  showAds: true,
  region: 'us',
  updateRegion: () => {},
  pricing: pricingData.us,
  consentProvided: false,
  consentType: 'basic',
  updateConsent: () => {},
  reliabilityStars: 5,
  updateReliabilityStars: () => {},
  canViewOthersReliability: false,
};

interface BasicProvidersState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  unreadNotifications: number;
  membershipTier: MembershipTier;
  region: Region;
  consentProvided: boolean;
  reliabilityStars: number;
}

// Class component to avoid hooks completely
export class BasicProviders extends Component<
  { children: ReactNode },
  BasicProvidersState
> {
  private authUnsubscribe?: () => void;

  constructor(props: { children: ReactNode }) {
    super(props);
    
    this.state = {
      user: null,
      session: null,
      isLoading: true,
      isInitialized: false,
      unreadNotifications: 0,
      membershipTier: 'standard',
      region: 'us',
      consentProvided: false,
      reliabilityStars: 5,
    };
  }

  componentDidMount() {
    this.initAuth();
  }

  componentWillUnmount() {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
  }

  private initAuth = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      this.setState({
        user: currentSession?.user || null,
        session: currentSession,
        isLoading: false,
        isInitialized: true,
      });

      // Auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
        if (event === 'SIGNED_IN' && currentSession?.user) {
          this.setState({
            user: currentSession.user,
            session: currentSession,
          });
        } else if (event === 'SIGNED_OUT') {
          this.setState({
            user: null,
            session: null,
          });
        }
      });

      this.authUnsubscribe = () => subscription.unsubscribe();

    } catch (error) {
      console.error('Auth init failed:', error);
      this.setState({
        isLoading: false,
        isInitialized: true,
      });
    }
  };

  private setUnreadNotifications = (count: number) => {
    this.setState({ unreadNotifications: count });
  };

  private updateMembershipTier = (tier: MembershipTier) => {
    this.setState({ membershipTier: tier });
  };

  private updateRegion = (region: Region) => {
    this.setState({ region });
  };

  private updateConsent = (hasConsented: boolean) => {
    this.setState({ consentProvided: hasConsented });
  };

  private updateReliabilityStars = (newRating: number) => {
    this.setState({ reliabilityStars: newRating });
  };

  render() {
    const { children } = this.props;
    const { 
      user, 
      session, 
      isLoading, 
      isInitialized, 
      unreadNotifications, 
      membershipTier, 
      region, 
      consentProvided, 
      reliabilityStars 
    } = this.state;

    const contextValue: AppContextType = {
      user,
      session,
      isLoading,
      isInitialized,
      unreadNotifications,
      setUnreadNotifications: this.setUnreadNotifications,
      membershipTier,
      updateMembershipTier: this.updateMembershipTier,
      showAds: membershipTier === 'standard',
      region,
      updateRegion: this.updateRegion,
      pricing: pricingData[region],
      consentProvided,
      consentType: 'basic',
      updateConsent: this.updateConsent,
      reliabilityStars,
      updateReliabilityStars: this.updateReliabilityStars,
      canViewOthersReliability: membershipTier === 'premium',
    };

    return (
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AppContext.Provider value={contextValue}>
              {children}
            </AppContext.Provider>
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    );
  }
}

// Hook exports - these use hooks but outside of the problematic component
import { useContext, useCallback } from 'react';

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    console.error('useAppContext called outside provider context');
    return defaultContextValue;
  }
  return context;
};

export const useMembership = () => {
  const context = useAppContext();
  return {
    membershipTier: context.membershipTier,
    updateMembershipTier: context.updateMembershipTier,
    showAds: context.showAds,
    region: context.region,
    updateRegion: context.updateRegion,
    pricing: context.pricing,
    consentProvided: context.consentProvided,
    consentType: context.consentType,
    updateConsent: context.updateConsent,
    reliabilityStars: context.reliabilityStars,
    updateReliabilityStars: context.updateReliabilityStars,
    canViewOthersReliability: context.canViewOthersReliability,
  };
};

// Simple language hook without complex loading
export const useLanguage = () => {
  const language = 'en';
  const country = 'US';
  const isLoading = false;

  const t = useCallback((key: string, fallback?: string) => {
    const translations: Record<string, string> = {
      'dashboard.title': 'Find Your Next Activity',
      'common.loading': 'Loading...',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'nav.dashboard': 'Dashboard',
      'nav.create': 'Create',
      'nav.settings': 'Settings',
    };
    return translations[key] || fallback || key;
  }, []);

  const setLanguage = useCallback(async (newLanguage: string) => {
    console.log('Language change requested:', newLanguage);
  }, []);
  
  const setCountry = useCallback(async (newCountry: string) => {
    console.log('Country change requested:', newCountry);
  }, []);

  return {
    language,
    country,
    setLanguage,
    setCountry,
    t,
    isLoading
  };
};

export default BasicProviders;