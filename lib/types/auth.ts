/**
 * Subscription tier enum - matches backend SubscriptionTier
 */
export enum SubscriptionTier {
  FREEMIUM = 'FREEMIUM',
  PREMIUM = 'PREMIUM',
}

export interface BackendMeResponse {
  id: string;
  supabaseUserId: string;
  email: string;
  hasOnboarded: boolean;
  role: string;
  type?: SubscriptionTier; // Optional - backend may omit, fallback to FREEMIUM at call site
}


