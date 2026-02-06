export type TierKey = string;

export interface MembershipTierHostingRules {
  maxParticipantsPerActivity: number | null;
  maxHostsPerMonth: number | null;
  enforceExactMaxParticipants: boolean;
}

export interface MembershipTierGroupRules {
  enabled?: boolean;
  maxMembers: number;
  notes?: string;
}

export interface MembershipTierAdsRules {
  showsAds: boolean;
}

export interface MembershipTierVerificationRules {
  requiresVerifiedHostForHosting: boolean;
}

export interface MembershipTierMessagingRules {
  groupChatEnabled: boolean;
  automatedMessagesEnabled: boolean;
  notes?: string;
}

export interface MembershipTierRules {
  metadata?: {
    tierClass?: string;
    displayName?: string;
  };
  hosting: MembershipTierHostingRules;
  groups: MembershipTierGroupRules;
  ads: MembershipTierAdsRules;
  verification: MembershipTierVerificationRules;
  messaging: MembershipTierMessagingRules;
}

export interface BackendMeResponse {
  id: string;
  supabaseUserId: string;
  email: string;
  hasOnboarded: boolean;
  role: string;
  type: TierKey;
  tierRules: MembershipTierRules;
}


