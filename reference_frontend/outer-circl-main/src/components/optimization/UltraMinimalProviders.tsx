/**
 * UltraMinimalProviders - Compatibility Wrapper
 * Phase 1: Core architectural fix
 * 
 * This file now serves as a compatibility layer during migration
 * All functionality has been moved to the new core architecture:
 * - AppBootstrap: State machine for initialization
 * - AuthProvider: Auth-only context
 * - AppContextProvider: Non-auth app state
 * - AppProviders: Orchestrator
 */

import { ReactNode } from 'react';
import { AppProviders } from '@/components/core/AppProviders';

// Re-export types from new architecture
export type { MembershipTier, Region } from '@/components/core/AppContextProvider';

// Import React for useState
import * as React from 'react';

// Import useAppContext
import { useAppContext } from '@/components/core/AppContextProvider';

/**
 * Compatibility wrapper - delegates to new AppProviders
 */
export const UltraMinimalProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <AppProviders>{children}</AppProviders>;
};

// Re-export useAppContext
export { useAppContext };

// Compatibility hooks
export const useMembership = () => {
  const { 
    membershipTier, 
    updateMembershipTier, 
    showAds, 
    pricing, 
    canViewOthersReliability,
    region,
    updateRegion,
    consentType,
    consentProvided,
    updateConsent,
    reliabilityStars,
    updateReliabilityStars
  } = useAppContext();
  
  return { 
    membershipTier, 
    updateMembershipTier, 
    showAds, 
    pricing, 
    canViewOthersReliability,
    region,
    updateRegion,
    consentType,
    consentProvided,
    updateConsent,
    reliabilityStars,
    updateReliabilityStars
  };
};

export const useLanguage = () => {
  const [language, setLanguageState] = React.useState('en');
  const [country, setCountryState] = React.useState('US');
  const [isLoading, setIsLoading] = React.useState(false);

  const t = (key: string) => key;
  const setLanguage = (lang: string) => {
    setIsLoading(true);
    setLanguageState(lang);
    setTimeout(() => setIsLoading(false), 100);
  };
  const setCountry = (c: string) => setCountryState(c);

  return {
    language,
    country,
    t,
    setLanguage,
    setCountry,
    isLoading,
  };
};
