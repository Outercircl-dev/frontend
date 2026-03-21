
export interface SupabaseAccountSlot {
  id: string;
  user_id: string | null;
  slot_position: number;
  status: 'available' | 'invited' | 'active';
  profiles?: {
    name: string | null;
    email: string | null;
  } | null;
}

export interface SupabaseMembership {
  id: string;
  subscription_tier: 'premium';
  admin_user_id: string;
  status: string;
  membership_slots: SupabaseAccountSlot[];
}
