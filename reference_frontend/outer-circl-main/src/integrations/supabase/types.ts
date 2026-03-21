export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_security_status: {
        Row: {
          created_at: string | null
          is_locked: boolean | null
          last_suspicious_activity: string | null
          lock_reason: string | null
          locked_at: string | null
          locked_by: string | null
          requires_verification: boolean | null
          suspicious_activity_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          is_locked?: boolean | null
          last_suspicious_activity?: string | null
          lock_reason?: string | null
          locked_at?: string | null
          locked_by?: string | null
          requires_verification?: boolean | null
          suspicious_activity_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          is_locked?: boolean | null
          last_suspicious_activity?: string | null
          lock_reason?: string | null
          locked_at?: string | null
          locked_by?: string | null
          requires_verification?: boolean | null
          suspicious_activity_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      encryption_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          key_name: string
          key_value: string
          last_used: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          key_name: string
          key_value: string
          last_used?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          key_name?: string
          key_value?: string
          last_used?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      event_invitations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          invited_at: string
          invited_user_id: string
          inviter_id: string
          responded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          invited_at?: string
          invited_user_id: string
          inviter_id: string
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          invited_at?: string
          invited_user_id?: string
          inviter_id?: string
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_dashboard_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          created_at: string
          event_id: string
          id: string
          joined_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          joined_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          joined_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_dashboard_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string | null
          completed_at: string | null
          coordinates: Json | null
          created_at: string | null
          date: string | null
          description: string | null
          duration: string | null
          gender_preference: string | null
          host_id: string
          id: string
          image_url: string | null
          is_recurring: boolean | null
          location: string | null
          max_attendees: number | null
          meetup_spot: string | null
          occurrence_number: number | null
          parent_event_id: string | null
          recurrence_end_count: number | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_pattern: string | null
          recurring_type: string | null
          status: string | null
          time: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          coordinates?: Json | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          duration?: string | null
          gender_preference?: string | null
          host_id: string
          id?: string
          image_url?: string | null
          is_recurring?: boolean | null
          location?: string | null
          max_attendees?: number | null
          meetup_spot?: string | null
          occurrence_number?: number | null
          parent_event_id?: string | null
          recurrence_end_count?: number | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          recurring_type?: string | null
          status?: string | null
          time?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          coordinates?: Json | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          duration?: string | null
          gender_preference?: string | null
          host_id?: string
          id?: string
          image_url?: string | null
          is_recurring?: boolean | null
          location?: string | null
          max_attendees?: number | null
          meetup_spot?: string | null
          occurrence_number?: number | null
          parent_event_id?: string | null
          recurrence_end_count?: number | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          recurring_type?: string | null
          status?: string | null
          time?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events_dashboard_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          requested_by: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          requested_by: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          requested_by?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_images: {
        Row: {
          category: string
          created_at: string
          id: string
          image_key: string
          image_url: string
          prompt: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          image_key: string
          image_url: string
          prompt: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_key?: string
          image_url?: string
          prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          email_encrypted: string
          email_hash: string | null
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          slot_id: string
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_encrypted: string
          email_hash?: string | null
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by: string
          slot_id: string
          status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_encrypted?: string
          email_hash?: string | null
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          slot_id?: string
          status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "membership_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "membership_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_slots: {
        Row: {
          created_at: string
          id: string
          slot_position: number
          status: string
          subscription_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          slot_position: number
          status?: string
          subscription_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          slot_position?: number
          status?: string
          subscription_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_slots_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "membership_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_subscriptions: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          event_id: string | null
          id: string
          message_type: string | null
          read_at: string | null
          recipient_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          event_id?: string | null
          id?: string
          message_type?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          event_id?: string | null
          id?: string
          message_type?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_dashboard_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          archived_at: string | null
          content: string | null
          created_at: string
          id: string
          metadata: Json | null
          notification_type: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          notification_type?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          notification_type?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_metadata: {
        Row: {
          access_log: Json | null
          created_at: string | null
          encrypted_stripe_data: string | null
          id: string
          last_accessed: string | null
          payment_hash: string | null
          security_level: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_log?: Json | null
          created_at?: string | null
          encrypted_stripe_data?: string | null
          id?: string
          last_accessed?: string | null
          payment_hash?: string | null
          security_level?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_log?: Json | null
          created_at?: string | null
          encrypted_stripe_data?: string | null
          id?: string
          last_accessed?: string | null
          payment_hash?: string | null
          security_level?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_privacy_settings: {
        Row: {
          ad_personalization: boolean | null
          allow_friend_requests: boolean
          country_code: string | null
          created_at: string
          email_notifications: boolean | null
          event_messages: boolean | null
          id: string
          message_privacy: string | null
          personalization_opt: string | null
          profile_visibility: string
          push_notifications: boolean | null
          ui_language: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_personalization?: boolean | null
          allow_friend_requests?: boolean
          country_code?: string | null
          created_at?: string
          email_notifications?: boolean | null
          event_messages?: boolean | null
          id?: string
          message_privacy?: string | null
          personalization_opt?: string | null
          profile_visibility?: string
          push_notifications?: boolean | null
          ui_language?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_personalization?: boolean | null
          allow_friend_requests?: boolean
          country_code?: string | null
          created_at?: string
          email_notifications?: boolean | null
          event_messages?: boolean | null
          id?: string
          message_privacy?: string | null
          personalization_opt?: string | null
          profile_visibility?: string
          push_notifications?: boolean | null
          ui_language?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_privacy_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_view_permissions: {
        Row: {
          created_at: string
          granted_at: string | null
          id: string
          permission_granted: boolean
          profile_owner_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string | null
          id?: string
          permission_granted?: boolean
          profile_owner_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string | null
          id?: string
          permission_granted?: boolean
          profile_owner_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_view_permissions_profile_owner_id_fkey"
            columns: ["profile_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_view_permissions_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string | null
          deactivated_at: string | null
          education_level: string | null
          gender: string | null
          id: string
          interests: string[] | null
          languages: string[] | null
          location: string | null
          membership_tier: string | null
          name: string | null
          occupation: string | null
          profile_completed: boolean | null
          reliability_rating: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          account_status?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          education_level?: string | null
          gender?: string | null
          id: string
          interests?: string[] | null
          languages?: string[] | null
          location?: string | null
          membership_tier?: string | null
          name?: string | null
          occupation?: string | null
          profile_completed?: boolean | null
          reliability_rating?: number | null
          updated_at?: string | null
          username: string
        }
        Update: {
          account_status?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          education_level?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          languages?: string[] | null
          location?: string | null
          membership_tier?: string | null
          name?: string | null
          occupation?: string | null
          profile_completed?: boolean | null
          reliability_rating?: number | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      profiles_public_secure: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string | null
          education_level: string | null
          gender: string | null
          id: string
          interests: string[] | null
          languages: string[] | null
          location: string | null
          membership_tier: string | null
          name: string | null
          occupation: string | null
          reliability_rating: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          education_level?: string | null
          gender?: string | null
          id: string
          interests?: string[] | null
          languages?: string[] | null
          location?: string | null
          membership_tier?: string | null
          name?: string | null
          occupation?: string | null
          reliability_rating?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          education_level?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          languages?: string[] | null
          location?: string | null
          membership_tier?: string | null
          name?: string | null
          occupation?: string | null
          reliability_rating?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      profiles_sensitive: {
        Row: {
          birth_month: number | null
          birth_year: number | null
          created_at: string | null
          email: string | null
          email_encrypted: string | null
          encrypted_payment_data: Json | null
          encryption_version: number | null
          id: string
          last_security_check: string | null
          phone: string | null
          phone_encrypted: string | null
          security_flags: Json | null
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          birth_month?: number | null
          birth_year?: number | null
          created_at?: string | null
          email?: string | null
          email_encrypted?: string | null
          encrypted_payment_data?: Json | null
          encryption_version?: number | null
          id: string
          last_security_check?: string | null
          phone?: string | null
          phone_encrypted?: string | null
          security_flags?: Json | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          birth_month?: number | null
          birth_year?: number | null
          created_at?: string | null
          email?: string | null
          email_encrypted?: string | null
          encrypted_payment_data?: Json | null
          encryption_version?: number | null
          id?: string
          last_security_check?: string | null
          phone?: string | null
          phone_encrypted?: string | null
          security_flags?: Json | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: unknown
          request_count: number
          user_id: string | null
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: unknown
          request_count?: number
          user_id?: string | null
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: unknown
          request_count?: number
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      saved_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_dashboard_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reminders: {
        Row: {
          created_at: string
          event_id: string
          id: string
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_dashboard_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_enhanced: {
        Row: {
          action: string
          id: string
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          risk_score: number | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          risk_score?: number | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          risk_score?: number | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_audit_immutable: {
        Row: {
          action: string
          audit_hash: string
          id: string
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          risk_score: number | null
          session_id: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          audit_hash: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          risk_score?: number | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          audit_hash?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          risk_score?: number | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          success: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_config: {
        Row: {
          config_key: string
          config_value: string
          description: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: string
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      security_events_realtime: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          risk_score: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_name: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_name: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_name?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      sensitive_access_rate_limits: {
        Row: {
          access_count: number | null
          created_at: string | null
          id: string
          resource_type: string
          user_id: string
          window_start: string | null
        }
        Insert: {
          access_count?: number | null
          created_at?: string | null
          id?: string
          resource_type: string
          user_id: string
          window_start?: string | null
        }
        Update: {
          access_count?: number | null
          created_at?: string | null
          id?: string
          resource_type?: string
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      translation_keys: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          key_name: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          key_name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          key_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      translations: {
        Row: {
          created_at: string | null
          id: string
          language_code: string
          translated_text: string
          translation_key_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          language_code: string
          translated_text: string
          translation_key_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          language_code?: string
          translated_text?: string
          translation_key_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "translations_translation_key_id_fkey"
            columns: ["translation_key_id"]
            isOneToOne: false
            referencedRelation: "translation_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_history: {
        Row: {
          activity_count: number
          category: string
          created_at: string
          id: string
          last_activity_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_count?: number
          category: string
          created_at?: string
          id?: string
          last_activity_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_count?: number
          category?: string
          created_at?: string
          id?: string
          last_activity_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity_summary_secure: {
        Row: {
          activities_by_category: Json | null
          categories_participated: number | null
          last_activity_date: string | null
          total_activities: number | null
          updated_at: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          activities_by_category?: Json | null
          categories_participated?: number | null
          last_activity_date?: string | null
          total_activities?: number | null
          updated_at?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          activities_by_category?: Json | null
          categories_participated?: number | null
          last_activity_date?: string | null
          total_activities?: number | null
          updated_at?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      user_agreements: {
        Row: {
          agreed_at: string
          agreement_type: string
          agreement_version: string
          created_at: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          agreed_at?: string
          agreement_type: string
          agreement_version?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          agreed_at?: string
          agreement_type?: string
          agreement_version?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_deleted_conversations: {
        Row: {
          conversation_id: string
          conversation_type: string
          created_at: string
          deleted_at: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          conversation_type: string
          created_at?: string
          deleted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          conversation_type?: string
          created_at?: string
          deleted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_deleted_messages: {
        Row: {
          created_at: string
          deleted_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_deleted_notifications: {
        Row: {
          created_at: string
          deleted_at: string
          id: string
          notification_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string
          id?: string
          notification_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string
          id?: string
          notification_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_media: {
        Row: {
          caption: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          media_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          media_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          media_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ratings: {
        Row: {
          created_at: string
          event_id: string
          id: string
          rated_user_id: string
          rating: number
          rating_user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          rated_user_id: string
          rating: number
          rating_user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          rated_user_id?: string
          rating?: number
          rating_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ratings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ratings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_dashboard_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ratings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ratings_rated_user_id_fkey"
            columns: ["rated_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ratings_rating_user_id_fkey"
            columns: ["rating_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      events_dashboard_secure: {
        Row: {
          category: string | null
          completed_at: string | null
          coordinates: Json | null
          created_at: string | null
          date: string | null
          description: string | null
          duration: string | null
          gender_preference: string | null
          host_id: string | null
          id: string | null
          image_url: string | null
          is_recurring: boolean | null
          location: string | null
          max_attendees: number | null
          meetup_spot: string | null
          occurrence_number: number | null
          parent_event_id: string | null
          recurrence_end_count: number | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_pattern: string | null
          recurring_type: string | null
          status: string | null
          time: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          coordinates?: never
          created_at?: string | null
          date?: string | null
          description?: string | null
          duration?: string | null
          gender_preference?: string | null
          host_id?: string | null
          id?: string | null
          image_url?: string | null
          is_recurring?: boolean | null
          location?: string | null
          max_attendees?: number | null
          meetup_spot?: never
          occurrence_number?: number | null
          parent_event_id?: string | null
          recurrence_end_count?: number | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          recurring_type?: string | null
          status?: string | null
          time?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          coordinates?: never
          created_at?: string | null
          date?: string | null
          description?: string | null
          duration?: string | null
          gender_preference?: string | null
          host_id?: string | null
          id?: string | null
          image_url?: string | null
          is_recurring?: boolean | null
          location?: string | null
          max_attendees?: number | null
          meetup_spot?: never
          occurrence_number?: number | null
          parent_event_id?: string | null
          recurrence_end_count?: number | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          recurring_type?: string | null
          status?: string | null
          time?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events_dashboard_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      events_public_view: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string | null
          date: string | null
          description: string | null
          duration: string | null
          gender_preference: string | null
          host_id: string | null
          id: string | null
          image_url: string | null
          is_recurring: boolean | null
          location: string | null
          max_attendees: number | null
          occurrence_number: number | null
          parent_event_id: string | null
          recurrence_end_count: number | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_pattern: string | null
          recurring_type: string | null
          status: string | null
          time: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          duration?: string | null
          gender_preference?: string | null
          host_id?: string | null
          id?: string | null
          image_url?: string | null
          is_recurring?: boolean | null
          location?: string | null
          max_attendees?: number | null
          occurrence_number?: number | null
          parent_event_id?: string | null
          recurrence_end_count?: number | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          recurring_type?: string | null
          status?: string | null
          time?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          duration?: string | null
          gender_preference?: string | null
          host_id?: string | null
          id?: string | null
          image_url?: string | null
          is_recurring?: boolean | null
          location?: string | null
          max_attendees?: number | null
          occurrence_number?: number | null
          parent_event_id?: string | null
          recurrence_end_count?: number | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          recurring_type?: string | null
          status?: string | null
          time?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events_dashboard_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_event_invitation: {
        Args: { p_invitation_id: string }
        Returns: boolean
      }
      accept_invitation_secure: {
        Args: { p_invitation_token: string }
        Returns: Json
      }
      allows_ad_personalization:
        | { Args: never; Returns: boolean }
        | { Args: { user_id: string }; Returns: boolean }
      analyze_security_threats: {
        Args: never
        Returns: {
          count: number
          details: Json
          severity: string
          threat_type: string
        }[]
      }
      analyze_user_behavior: { Args: { p_user_id: string }; Returns: Json }
      archive_conversation: {
        Args: { conversation_id: string; conversation_type: string }
        Returns: boolean
      }
      audit_profile_access: {
        Args: { p_accessor_id: string; p_action: string; p_profile_id: string }
        Returns: undefined
      }
      audit_view_security: {
        Args: never
        Returns: {
          has_auth_check: boolean
          has_privacy_check: boolean
          security_status: string
          view_name: string
        }[]
      }
      auto_complete_past_events: { Args: never; Returns: number }
      can_access_basic_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      can_access_payment_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      can_access_sensitive_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      can_access_sensitive_data_enhanced: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      can_access_sensitive_data_ultra_secure: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      can_invite_users: { Args: { p_user_id: string }; Returns: boolean }
      can_message_user: {
        Args: { recipient_id: string; sender_id: string }
        Returns: boolean
      }
      can_send_notification: {
        Args: { p_notification_type: string; p_user_id: string }
        Returns: boolean
      }
      can_show_recommendations:
        | { Args: never; Returns: boolean }
        | { Args: { p_user_id: string }; Returns: boolean }
      can_use_for_analytics: { Args: { p_user_id: string }; Returns: boolean }
      can_view_event_details:
        | { Args: { event_id: string }; Returns: boolean }
        | { Args: { p_event_id: string; p_user_id: string }; Returns: boolean }
      can_view_meetup_spot: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_profile: {
        Args: { profile_id: string; viewing_user_id: string }
        Returns: string
      }
      check_account_lockout: { Args: { p_email: string }; Returns: boolean }
      check_account_security_status: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      check_hosting_limits: {
        Args: { p_date: string; p_user_id: string }
        Returns: boolean
      }
      check_payment_access_rate_limit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      check_payment_rate_limit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      check_profile_access_rate_limit:
        | {
            Args: {
              p_action_type: string
              p_max_requests?: number
              p_user_id: string
              p_window_minutes?: number
            }
            Returns: boolean
          }
        | {
            Args: { p_action_type: string; p_user_id: string }
            Returns: boolean
          }
      check_rate_limit:
        | {
            Args: {
              p_endpoint: string
              p_max_requests?: number
              p_user_id: string
              p_window_seconds?: number
            }
            Returns: boolean
          }
        | {
            Args: {
              p_endpoint: string
              p_max_requests?: number
              p_user_id: string
              p_window_minutes?: number
            }
            Returns: boolean
          }
        | {
            Args: {
              p_endpoint?: string
              p_ip_address?: unknown
              p_max_requests?: number
              p_user_id?: string
              p_window_minutes?: number
            }
            Returns: boolean
          }
      check_rate_limit_sensitive: {
        Args: { p_resource_type: string; p_user_id: string }
        Returns: boolean
      }
      check_rate_limit_ultra_sensitive: {
        Args: { p_resource_type: string; p_user_id: string }
        Returns: boolean
      }
      check_recurring_activity_limits:
        | {
            Args: { p_is_recurring: boolean; p_user_id: string }
            Returns: boolean
          }
        | {
            Args: {
              p_is_recurring: boolean
              p_recurring_type?: string
              p_user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_is_recurring: boolean
              p_recurrence_pattern?: string
              p_recurring_type?: string
              p_user_id: string
            }
            Returns: boolean
          }
      check_sensitive_access_rate_limit: {
        Args: { p_action_type: string; p_user_id: string }
        Returns: boolean
      }
      check_sensitive_data_permission:
        | {
            Args: { p_table_name: string; p_user_id: string }
            Returns: boolean
          }
        | {
            Args: {
              p_operation?: string
              p_record_id: string
              p_table_name: string
            }
            Returns: boolean
          }
      check_suspicious_access_patterns: { Args: never; Returns: undefined }
      check_user_rating_status: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      check_username_available: {
        Args: { current_user_id?: string; username_to_check: string }
        Returns: boolean
      }
      cleanup_old_audit_logs: { Args: never; Returns: number }
      cleanup_old_security_logs: { Args: never; Returns: number }
      cleanup_orphaned_reminders: {
        Args: never
        Returns: {
          deleted_count: number
        }[]
      }
      cleanup_security_audit_logs: { Args: never; Returns: number }
      cleanup_security_audit_logs_enhanced: { Args: never; Returns: number }
      cleanup_security_events: { Args: never; Returns: number }
      cleanup_unattended_saved_events: { Args: never; Returns: number }
      comprehensive_security_test: {
        Args: never
        Returns: {
          details: string
          status: string
          test_category: string
          test_name: string
        }[]
      }
      create_initial_admin: { Args: { admin_email: string }; Returns: boolean }
      create_recurring_events: { Args: never; Returns: number }
      debug_message_access: {
        Args: { p_event_id: string }
        Returns: {
          can_access: boolean
          event_exists: boolean
          is_host: boolean
          is_participant: boolean
          user_authenticated: boolean
        }[]
      }
      decrypt_pii: { Args: { encrypted_data: string }; Returns: string }
      detect_critical_security_threats: {
        Args: never
        Returns: {
          access_count: number
          recommended_action: string
          severity: string
          threat_type: string
          user_id: string
        }[]
      }
      detect_immediate_threats: { Args: never; Returns: undefined }
      detect_security_threats: {
        Args: never
        Returns: {
          affected_users: number
          description: string
          last_occurrence: string
          severity: string
          threat_type: string
        }[]
      }
      detect_sensitive_data_breach: {
        Args: never
        Returns: {
          last_occurrence: string
          potential_breach_type: string
          user_count: number
        }[]
      }
      detect_sensitive_data_threats: {
        Args: never
        Returns: {
          last_occurrence: string
          risk_assessment: string
          threat_count: number
          threat_type: string
          user_id: string
        }[]
      }
      detect_suspicious_access_patterns: {
        Args: never
        Returns: {
          last_activity: string
          risk_level: string
          suspicious_activity_count: number
          user_id: string
        }[]
      }
      detect_suspicious_sensitive_access: {
        Args: never
        Returns: {
          access_count: number
          last_access: string
          requires_action: boolean
          resource_type: string
          risk_level: string
          user_id: string
        }[]
      }
      discover_events_secure: {
        Args: {
          p_category?: string
          p_limit?: number
          p_location?: string
          p_user_id: string
        }
        Returns: {
          category: string
          current_attendees: number
          description: string
          event_date: string
          event_time: string
          id: string
          image_url: string
          location: string
          max_attendees: number
          title: string
        }[]
      }
      encrypt_pii: { Args: { data: string }; Returns: string }
      encrypt_sensitive_field: {
        Args: { p_data: string; p_field_type?: string }
        Returns: string
      }
      generate_audit_hash: {
        Args: {
          p_action: string
          p_ip_address: unknown
          p_resource_type: string
          p_timestamp: string
          p_user_id: string
        }
        Returns: string
      }
      get_admin_invitations:
        | {
            Args: { requesting_user_id: string; target_subscription_id: string }
            Returns: {
              created_at: string
              email: string
              expires_at: string
              id: string
              invitation_token: string
              invited_by: string
              slot_id: string
              status: string
              subscription_id: string
              updated_at: string
            }[]
          }
        | {
            Args: { p_subscription_id: string }
            Returns: {
              created_at: string
              email_masked: string
              expires_at: string
              id: string
              status: string
            }[]
          }
      get_current_user_role: { Args: never; Returns: string }
      get_dashboard_data_optimized: {
        Args: { p_user_id: string }
        Returns: {
          attendee_count: number
          category: string
          coordinates: Json
          date: string
          description: string
          duration: string
          event_time: string
          host_avatar: string
          host_id: string
          host_name: string
          id: string
          image_url: string
          is_attending: boolean
          is_saved: boolean
          location: string
          max_attendees: number
          meetup_spot: string
          title: string
        }[]
      }
      get_encryption_key: { Args: { p_key_name?: string }; Returns: string }
      get_event_details_optimized: {
        Args: { p_event_id: string; p_user_id?: string }
        Returns: Json
      }
      get_invitation_by_token: {
        Args: { token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          status: string
          subscription_id: string
        }[]
      }
      get_invitation_contact_info: {
        Args: { p_invitation_id: string }
        Returns: {
          created_at: string
          email_domain: string
          invitation_id: string
          status: string
        }[]
      }
      get_invitation_email_by_token: {
        Args: { p_token: string }
        Returns: string
      }
      get_invitation_safe: {
        Args: { p_invitation_token: string }
        Returns: {
          email_masked: string
          expires_at: string
          id: string
          invitation_token: string
          status: string
          subscription_id: string
        }[]
      }
      get_invitations_safe: {
        Args: { p_invitation_token?: string }
        Returns: {
          created_at: string
          email_hash: string
          email_masked: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          slot_id: string
          status: string
          subscription_id: string
          updated_at: string
        }[]
      }
      get_masked_invitation_email:
        | {
            Args: { invitation_id: string; requesting_user_id: string }
            Returns: string
          }
        | { Args: { invitation_id: string }; Returns: string }
      get_minimal_profile: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          id: string
          membership_tier: string
          username: string
        }[]
      }
      get_personalization_level: { Args: { user_id: string }; Returns: string }
      get_public_profile: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          banner_url: string
          bio: string
          created_at: string
          id: string
          interests: string[]
          languages: string[]
          membership_tier: string
          name: string
          reliability_rating: number
          updated_at: string
          username: string
        }[]
      }
      get_public_profile_data: {
        Args: { profile_user_id: string; requesting_user_id: string }
        Returns: {
          avatar_url: string
          banner_url: string
          bio: string
          created_at: string
          id: string
          interests: string[]
          languages: string[]
          membership_tier: string
          name: string
          reliability_rating: number
          username: string
        }[]
      }
      get_public_profile_safe: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          id: string
          membership_tier: string
          name: string
          username: string
        }[]
      }
      get_public_profiles: {
        Args: { requesting_user_id?: string }
        Returns: {
          avatar_url: string
          banner_url: string
          bio: string
          created_at: string
          id: string
          interests: string[]
          languages: string[]
          membership_tier: string
          name: string
          reliability_rating: number
          username: string
        }[]
      }
      get_secure_event_data: {
        Args: { p_event_id: string }
        Returns: {
          category: string
          date: string
          description: string
          host_id: string
          id: string
          location: string
          max_attendees: number
          status: string
          time_slot: string
          title: string
        }[]
      }
      get_secure_payment_profile: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          last_security_check: string
          stripe_customer_id_masked: string
        }[]
      }
      get_secure_user_events: {
        Args: { p_user_id: string }
        Returns: {
          description: string
          event_date: string
          event_time: string
          id: string
          location: string
          status: string
          title: string
        }[]
      }
      get_security_dashboard_data: { Args: never; Returns: Json }
      get_security_dashboard_metrics: {
        Args: never
        Returns: {
          last_updated: string
          metric: string
          severity: string
          value: string
        }[]
      }
      get_security_documentation: {
        Args: never
        Returns: {
          component: string
          justification: string
          linter_note: string
          purpose: string
        }[]
      }
      get_security_hardening_status: {
        Args: never
        Returns: {
          details: string
          metric: string
          status: string
        }[]
      }
      get_security_health_status: { Args: never; Returns: Json }
      get_security_metrics: {
        Args: never
        Returns: {
          last_updated: string
          metric_name: string
          metric_value: string
          risk_level: string
          status: string
        }[]
      }
      get_security_status_enhanced: {
        Args: never
        Returns: {
          last_updated: string
          metric_name: string
          metric_value: string
          risk_level: string
          status: string
        }[]
      }
      get_sensitive_data_security_status: {
        Args: never
        Returns: {
          last_updated: string
          metric_name: string
          metric_value: string
          status: string
        }[]
      }
      get_sensitive_profile_data: {
        Args: { requesting_user_id: string }
        Returns: {
          account_status: string
          birth_month: number
          birth_year: number
          deactivated_at: string
          email: string
          id: string
          phone: string
          stripe_customer_id: string
        }[]
      }
      get_subscription_invitations: {
        Args: { p_subscription_id: string }
        Returns: {
          created_at: string
          email_hash: string
          expires_at: string
          id: string
          status: string
          subscription_id: string
        }[]
      }
      get_unified_dashboard_data: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: Json
      }
      get_user_activity_stats: {
        Args: { p_user_id: string }
        Returns: {
          activity_count: number
          category: string
          last_activity_date: string
          total_activities: number
        }[]
      }
      get_user_conversations_secure: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          conversation_id: string
          conversation_type: string
          last_message_at: string
          last_message_content: string
          other_user_avatar: string
          other_user_id: string
          other_user_name: string
          unread_count: number
        }[]
      }
      get_user_country: { Args: never; Returns: string }
      get_user_friends: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          id: string
          name: string
          reliability_rating: number
          username: string
        }[]
      }
      get_user_invitations: {
        Args: { requesting_user_id: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          slot_id: string
          status: string
          subscription_id: string
          updated_at: string
        }[]
      }
      get_user_language: { Args: never; Returns: string }
      get_user_membership_info: {
        Args: { user_uuid: string }
        Returns: {
          is_admin: boolean
          slot_id: string
          subscription_id: string
          subscription_tier: string
        }[]
      }
      get_user_role: { Args: { check_user_id: string }; Returns: string }
      has_completed_event_ratings: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_invitation_email: {
        Args: { email_address: string }
        Returns: string
      }
      initialize_user_preferences: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      initiate_secure_password_reset: {
        Args: { p_email: string }
        Returns: boolean
      }
      insert_user_ratings: { Args: { ratings_data: Json }; Returns: undefined }
      is_event_host: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      is_event_owner: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      is_event_participant: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      is_friends_with: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      is_subscription_admin: {
        Args: { subscription_id: string; user_id: string }
        Returns: boolean
      }
      is_subscription_member: {
        Args: { subscription_id: string; user_id: string }
        Returns: boolean
      }
      is_system_account: { Args: { user_id: string }; Returns: boolean }
      is_system_query: { Args: never; Returns: boolean }
      is_username_unique: {
        Args: { new_username: string; user_id?: string }
        Returns: boolean
      }
      leave_event: { Args: { p_event_id: string }; Returns: boolean }
      log_balanced_security_event: {
        Args: {
          p_action: string
          p_metadata?: string
          p_resource_id: string
          p_resource_type: string
          p_success?: boolean
        }
        Returns: undefined
      }
      log_emergency_profile_access: {
        Args: { accessed_profile_id: string; reason: string }
        Returns: undefined
      }
      log_invitation_access_attempt: {
        Args: { access_type: string; invitation_id: string; user_id: string }
        Returns: undefined
      }
      log_payment_access: {
        Args: { p_metadata?: Json; p_operation: string; p_user_id: string }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          description: string
          event_type: string
          ip_address: string
          success: boolean
          user_id: string
        }
        Returns: undefined
      }
      log_security_event_immutable: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_resource_id?: string
          p_resource_type: string
          p_risk_score?: number
        }
        Returns: undefined
      }
      log_security_event_realtime: {
        Args: {
          p_event_type: string
          p_metadata?: Json
          p_resource_id?: string
          p_resource_type?: string
          p_risk_score?: number
        }
        Returns: undefined
      }
      log_security_event_secure: {
        Args: {
          p_action: string
          p_metadata?: string
          p_resource_type: string
          p_success: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      log_security_violation: {
        Args: { details?: Json; violation_type: string }
        Returns: undefined
      }
      log_sensitive_access: {
        Args: {
          p_metadata?: Json
          p_operation: string
          p_resource_id: string
          p_table_name: string
          p_user_id: string
        }
        Returns: undefined
      }
      log_sensitive_access_enhanced: {
        Args: {
          p_metadata?: Json
          p_operation: string
          p_resource_id: string
          p_table_name: string
          p_user_id: string
        }
        Returns: undefined
      }
      log_sensitive_access_simple:
        | {
            Args: {
              p_operation: string
              p_resource_id: string
              p_table_name: string
              p_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_operation: string
              p_resource_id: string
              p_table_name: string
              p_user_id: string
            }
            Returns: undefined
          }
      log_sensitive_select_access: {
        Args: {
          p_operation_details?: Json
          p_resource_id?: string
          p_table_name: string
        }
        Returns: undefined
      }
      log_simple_security_event:
        | {
            Args: {
              p_action: string
              p_error_message?: string
              p_resource_id?: string
              p_resource_type?: string
              p_success?: boolean
            }
            Returns: undefined
          }
        | {
            Args: {
              p_action: string
              p_resource_type: string
              p_success?: boolean
              p_user_id: string
            }
            Returns: undefined
          }
      mark_event_message_as_read: {
        Args: { p_message_id: string }
        Returns: boolean
      }
      mark_messages_as_read_batch: {
        Args: { p_message_ids: string[]; p_user_id: string }
        Returns: {
          marked_count: number
          success: boolean
        }[]
      }
      mask_email: { Args: { email: string }; Returns: string }
      mask_sensitive_email: {
        Args: { email_address: string; owner_id: string; viewer_id: string }
        Returns: string
      }
      mask_sensitive_profile_fields: {
        Args: { profile_data: Json }
        Returns: Json
      }
      migrate_profile_pii: { Args: { profile_id: string }; Returns: boolean }
      migrate_sensitive_profile_data: { Args: never; Returns: number }
      monitor_security_events: { Args: never; Returns: Json }
      monitor_sensitive_data_breaches: {
        Args: never
        Returns: {
          affected_users: number
          last_incident: string
          potential_breach_type: string
          risk_level: string
        }[]
      }
      populate_user_activity_history: { Args: never; Returns: number }
      process_scheduled_reminders: { Args: never; Returns: number }
      record_user_agreement: {
        Args: {
          p_agreement_type: string
          p_agreement_version?: string
          p_ip_address?: unknown
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      refresh_dashboard_events: { Args: never; Returns: number }
      refresh_profiles_public_secure: { Args: never; Returns: number }
      refresh_user_activity_summary: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      require_email_confirmation_for_sensitive_access: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      respond_to_friend_request: {
        Args: { friendship_id: string; response: string }
        Returns: boolean
      }
      safe_get_public_profile_data: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          id: string
          membership_tier: string
          name: string
          username: string
        }[]
      }
      sanitize_html_input: { Args: { input_text: string }; Returns: string }
      schedule_2h_reminder: { Args: { p_event_id: string }; Returns: boolean }
      schedule_event_reminders: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      search_public_profiles: {
        Args: { requesting_user_id: string; search_term: string }
        Returns: {
          avatar_url: string
          bio: string
          id: string
          name: string
          reliability_rating: number
          username: string
        }[]
      }
      search_users: {
        Args: { requesting_user_id: string; search_term: string }
        Returns: {
          avatar_url: string
          bio: string
          friendship_status: string
          id: string
          name: string
          reliability_rating: number
          username: string
        }[]
      }
      secure_invitation_access: {
        Args: { p_invitation_id: string; p_viewer_id: string }
        Returns: boolean
      }
      send_friend_request: { Args: { friend_id: string }; Returns: boolean }
      send_pre_event_reminders: { Args: never; Returns: number }
      simple_input_sanitization: {
        Args: { input_text: string }
        Returns: string
      }
      suggest_unique_username: {
        Args: { base_username: string }
        Returns: string[]
      }
      system_check_rate_limit: {
        Args: {
          p_endpoint?: string
          p_ip_address?: unknown
          p_max_requests?: number
          p_user_id?: string
          p_window_minutes?: number
        }
        Returns: boolean
      }
      test_payment_metadata_security: {
        Args: never
        Returns: {
          result: string
          test_name: string
        }[]
      }
      trigger_auto_complete_events: { Args: never; Returns: string }
      trigger_immediate_notifications_for_existing_events: {
        Args: never
        Returns: number
      }
      trigger_pre_event_reminders: { Args: never; Returns: string }
      trigger_security_alert: {
        Args: { p_alert_type: string; p_details?: Json; p_user_id: string }
        Returns: undefined
      }
      unarchive_conversation: {
        Args: { conversation_id: string; conversation_type: string }
        Returns: boolean
      }
      update_user_reliability_rating: {
        Args: { user_id: string }
        Returns: undefined
      }
      user_can_view_event: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      user_can_view_profile_public: {
        Args: { profile_id: string; viewer_id: string }
        Returns: boolean
      }
      validate_and_sanitize_input: {
        Args: { p_input: string; p_input_type?: string; p_max_length?: number }
        Returns: string
      }
      validate_final_security: {
        Args: never
        Returns: {
          details: string
          security_area: string
          status: string
        }[]
      }
      validate_final_security_status: {
        Args: never
        Returns: {
          component: string
          details: string
          status: string
        }[]
      }
      validate_invitation_access:
        | {
            Args: { invitation_id: string; requesting_user_id: string }
            Returns: boolean
          }
        | {
            Args: { p_invitation_token: string }
            Returns: {
              admin_name: string
              can_accept: boolean
              email: string
              expires_at: string
              id: string
              subscription_tier: string
            }[]
          }
      validate_invitation_admin_access: {
        Args: { subscription_id: string; user_id: string }
        Returns: boolean
      }
      validate_invitation_token_access: {
        Args: { p_invitation_id: string; p_user_id: string }
        Returns: boolean
      }
      validate_message_access: {
        Args: { message_id: string; user_id: string }
        Returns: boolean
      }
      validate_payment_access: { Args: { p_user_id: string }; Returns: boolean }
      validate_payment_metadata_access: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      validate_profile_access:
        | {
            Args: { accessing_user_id: string; target_user_id: string }
            Returns: boolean
          }
        | { Args: { profile_id: string }; Returns: boolean }
      validate_security_context: { Args: never; Returns: boolean }
      validate_security_implementation: { Args: never; Returns: Json }
      validate_security_status: { Args: never; Returns: Json }
      validate_sensitive_access: {
        Args: { p_resource_type: string; p_user_id: string }
        Returns: boolean
      }
      validate_sensitive_data_access:
        | {
            Args: { p_table_name: string; p_user_id?: string }
            Returns: boolean
          }
        | { Args: { p_user_id: string }; Returns: boolean }
      validate_sensitive_data_access_enhanced:
        | {
            Args: {
              p_operation?: string
              p_resource_type: string
              p_user_id: string
            }
            Returns: boolean
          }
        | {
            Args: { p_resource_type: string; p_user_id: string }
            Returns: boolean
          }
      validate_sensitive_profile_access: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      validate_ultra_secure_access: {
        Args: { p_resource_type: string; p_user_id: string }
        Returns: boolean
      }
      verify_audit_integrity: {
        Args: never
        Returns: {
          actual_hash: string
          audit_id: string
          expected_hash: string
          integrity_status: string
        }[]
      }
      verify_security_hardening: { Args: never; Returns: string }
      wants_email_notifications: { Args: { user_id: string }; Returns: boolean }
      wants_event_messages: { Args: { user_id: string }; Returns: boolean }
      wants_push_notifications: { Args: { user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
