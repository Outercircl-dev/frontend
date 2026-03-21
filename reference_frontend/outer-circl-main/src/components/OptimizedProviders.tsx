// Compatibility wrapper - re-exports from UltraMinimalProviders
// This file exists to prevent build errors during migration
// All functionality is now in UltraMinimalProviders

export { 
  useAppContext, 
  useMembership, 
  useLanguage,
  UltraMinimalProviders as OptimizedProviders,
  UltraMinimalProviders as StreamlinedProviders,
  type MembershipTier,
  type Region
} from './optimization/UltraMinimalProviders';