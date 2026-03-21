/**
 * AppContextProvider - Non-Auth Application State
 * Phase 1: Core architectural fix
 * 
 * Single responsibility: Manage application-wide non-auth state
 * - Membership tier
 * - Region and pricing
 * - Notifications
 * - Consent
 * - Reliability ratings
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { useAuthContext } from './AuthProvider';

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

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppContextProviderProps {
  children: ReactNode;
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children }) => {
  const { user, session } = useAuthContext();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [membershipTier, setMembershipTier] = useState<MembershipTier>('standard');
  const [region, setRegion] = useState<Region>('us');
  const [consentProvided, setConsentProvided] = useState(false);
  const [reliabilityStars, setReliabilityStars] = useState(5);

  // Detect region (non-blocking)
  useEffect(() => {
    import('@/utils/detectRegion').then(({ detectRegion }) => {
      detectRegion().then(setRegion).catch(() => {
        console.log('Region detection failed, using default');
      });
    });
  }, []);

  const contextValue: AppContextType = {
    user,
    session,
    unreadNotifications,
    setUnreadNotifications,
    membershipTier,
    updateMembershipTier: setMembershipTier,
    showAds: membershipTier === 'standard',
    region,
    updateRegion: setRegion,
    pricing: pricingData[region],
    consentProvided,
    consentType: 'basic',
    updateConsent: setConsentProvided,
    reliabilityStars,
    updateReliabilityStars: setReliabilityStars,
    canViewOthersReliability: membershipTier === 'premium',
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  
  if (context === undefined) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }
  
  return context;
};
