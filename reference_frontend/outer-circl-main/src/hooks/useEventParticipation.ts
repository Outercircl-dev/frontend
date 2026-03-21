import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useEventParticipation = () => {

  const joinEvent = useCallback(async (eventId: string, userId: string) => {
    try {
      // Check if already participating
      const { data: existingParticipation, error: checkError } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingParticipation?.status === 'attending') {
        return { success: false, message: 'Already attending this event' };
      }

      let result;
      if (existingParticipation) {
        // Update existing participation to attending
        result = await supabase
          .from('event_participants')
          .update({ 
            status: 'attending', 
            updated_at: new Date().toISOString() 
          })
          .eq('event_id', eventId)
          .eq('user_id', userId);
      } else {
        // Create new participation
        result = await supabase
          .from('event_participants')
          .insert({
            event_id: eventId,
            user_id: userId,
            status: 'attending',
            joined_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        // Send welcome message via edge function
        if (!result.error) {
          try {
            await supabase.functions.invoke('send-welcome-message', {
              body: { eventId, participantId: userId }
            });
          } catch (welcomeError) {
            console.warn('Welcome message failed:', welcomeError);
          }
        }
      }

      if (result.error) throw result.error;

      return { 
        success: true, 
        message: "You're now attending this activity!",
        welcomeMessageSent: true // Database trigger handles this
      };

    } catch (error: any) {
      console.error('Error joining event:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to join event' 
      };
    }
  }, []);

  const leaveEvent = useCallback(async (eventId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) throw error;

      return { 
        success: true, 
        message: "You've left this activity" 
      };

    } catch (error: any) {
      console.error('Error leaving event:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to leave event' 
      };
    }
  }, []);

  const toggleEventParticipation = useCallback(async (
    eventId: string, 
    userId: string, 
    currentlyAttending: boolean
  ) => {
    if (currentlyAttending) {
      return await leaveEvent(eventId, userId);
    } else {
      return await joinEvent(eventId, userId);
    }
  }, [joinEvent, leaveEvent]);

  return {
    joinEvent,
    leaveEvent,
    toggleEventParticipation
  };
};