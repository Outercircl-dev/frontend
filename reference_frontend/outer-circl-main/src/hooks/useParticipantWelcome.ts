import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useParticipantWelcome = () => {
  const sendWelcomeMessage = useCallback(async (eventId: string, participantId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-welcome-message', {
        body: { eventId, participantId }
      });

      if (error) {
        console.error('Error sending welcome message:', error);
        return false;
      }

      console.log('Welcome message sent successfully:', data);
      return true;
    } catch (error) {
      console.error('Error invoking welcome message function:', error);
      return false;
    }
  }, []);

  return { sendWelcomeMessage };
};