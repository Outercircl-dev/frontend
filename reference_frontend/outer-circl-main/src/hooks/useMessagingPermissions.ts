import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/components/OptimizedProviders';

export interface MessagingPermissions {
  canReceiveFromEveryone: boolean;
  canReceiveFromFollowers: boolean;
  canReceiveEventMessages: boolean;
  canReceivePushNotifications: boolean;
  canReceiveEmailNotifications: boolean;
  isLoading: boolean;
}

export const useMessagingPermissions = () => {
  const { user } = useAppContext();
  const [permissions, setPermissions] = useState<MessagingPermissions>({
    canReceiveFromEveryone: true,
    canReceiveFromFollowers: true,
    canReceiveEventMessages: true,
    canReceivePushNotifications: true,
    canReceiveEmailNotifications: true,
    isLoading: true,
  });

  useEffect(() => {
    const loadPermissions = async () => {
      if (!user) {
        setPermissions(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const { data: settings } = await supabase
          .from('profile_privacy_settings')
          .select('message_privacy, event_messages, push_notifications, email_notifications')
          .eq('user_id', user.id)
          .single();

        if (settings) {
          setPermissions({
            canReceiveFromEveryone: settings.message_privacy === 'everyone',
            canReceiveFromFollowers: settings.message_privacy === 'followers',
            canReceiveEventMessages: settings.event_messages ?? true,
            canReceivePushNotifications: settings.push_notifications ?? true,
            canReceiveEmailNotifications: settings.email_notifications ?? true,
            isLoading: false,
          });
        } else {
          // Use defaults if no settings found
          setPermissions(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error loading messaging permissions:', error);
        setPermissions(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadPermissions();
  }, [user]);

  return permissions;
};