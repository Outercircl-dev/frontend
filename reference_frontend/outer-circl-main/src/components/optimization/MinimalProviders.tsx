// Minimal provider to fix React hooks issue
import * as React from 'react';
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

// Simplified context with only essential state
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

// Simple QueryClient
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

const AppContext = React.createContext<AppContextType | undefined>(undefined);

// Core provider implementation
export const MinimalProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use React hooks directly to avoid any import issues
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);
  const [membershipTier, setMembershipTier] = React.useState<MembershipTier>('standard');
  const [region, setRegion] = React.useState<Region>('us');
  const [consentProvided, setConsentProvided] = React.useState(false);
  const [reliabilityStars, setReliabilityStars] = React.useState(5);

  // Auth initialization
  React.useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (isMounted) {
          if (currentSession?.user) {
            setUser(currentSession.user);
            setSession(currentSession);
          }
          setIsLoading(false);
          setIsInitialized(true);
        }

        // Auth state listener
        supabase.auth.onAuthStateChange((event, currentSession) => {
          if (!isMounted) return;
          
          if (event === 'SIGNED_IN' && currentSession?.user) {
            setUser(currentSession.user);
            setSession(currentSession);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setSession(null);
          }
        });

      } catch (error) {
        console.error('Auth init failed:', error);
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateMembershipTier = React.useCallback((tier: MembershipTier) => {
    setMembershipTier(tier);
  }, []);

  const updateRegion = React.useCallback((newRegion: Region) => {
    setRegion(newRegion);
  }, []);

  const updateConsent = React.useCallback((hasConsented: boolean) => {
    setConsentProvided(hasConsented);
  }, []);

  const updateReliabilityStars = React.useCallback((newRating: number) => {
    setReliabilityStars(newRating);
  }, []);

  const contextValue: AppContextType = React.useMemo(() => ({
    user,
    session,
    isLoading,
    isInitialized,
    unreadNotifications,
    setUnreadNotifications,
    membershipTier,
    updateMembershipTier,
    showAds: membershipTier === 'standard',
    region,
    updateRegion,
    pricing: pricingData[region],
    consentProvided,
    consentType: 'basic',
    updateConsent,
    reliabilityStars,
    updateReliabilityStars,
    canViewOthersReliability: membershipTier === 'premium',
  }), [
    user,
    session,
    isLoading,
    isInitialized,
    unreadNotifications,
    membershipTier,
    region,
    consentProvided,
    reliabilityStars,
    updateMembershipTier,
    updateRegion,
    updateConsent,
    updateReliabilityStars
  ]);

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
};

export const useAppContext = (): AppContextType => {
  const context = React.useContext(AppContext);
  if (context === undefined) {
    console.error('useAppContext called outside provider context');
    // Return safe defaults
    return {
      user: null,
      session: null,
      isLoading: true,
      isInitialized: false,
      unreadNotifications: 0,
      setUnreadNotifications: () => {},
      membershipTier: 'standard' as MembershipTier,
      updateMembershipTier: () => {},
      showAds: true,
      region: 'us' as Region,
      updateRegion: () => {},
      pricing: pricingData.us,
      consentProvided: false,
      consentType: 'basic',
      updateConsent: () => {},
      reliabilityStars: 5,
      updateReliabilityStars: () => {},
      canViewOthersReliability: false,
    };
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

// Minimal language hook
export const useLanguage = () => {
  const [language, setLanguageState] = React.useState('en');
  const [country, setCountryState] = React.useState('US');
  const [isLoading] = React.useState(false);

  const t = React.useCallback((key: string, fallback?: string) => {
    // Simple fallback mapping
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

  const setLanguage = React.useCallback(async (newLanguage: string) => {
    setLanguageState(newLanguage);
  }, []);
  
  const setCountry = React.useCallback(async (newCountry: string) => {
    setCountryState(newCountry);
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

export default MinimalProviders;