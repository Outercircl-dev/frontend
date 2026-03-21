import { supabase } from '@/integrations/supabase/client';
import { notificationService } from '@/services/notificationService';

export const sendNotificationToUser = async (
  userId: string,
  title: string,
  content: string,
  type: 'event' | 'message' | 'friend_request' | 'general' = 'general',
  metadata?: Record<string, any>
) => {
  try {
    // Call the edge function to handle notification logic
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        userId,
        title,
        content,
        notificationType: type,
        metadata
      }
    });

    if (error) {
      console.error('Error sending notification:', error);
      return false;
    }

    // Also try to send browser notification if user is online
    if (typeof window !== 'undefined') {
      await notificationService.showNotification({
        title,
        body: content,
        data: { type, ...metadata }
      });
    }

    return true;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
};

export const scheduleEventNotification = async (
  eventId: string,
  eventTitle: string,
  eventDate: string,
  eventTime?: string
) => {
  try {
    // Calculate reminder times (24 hours and 12 hours before)
    const eventDateTime = new Date(`${eventDate}T${eventTime || '12:00:00'}`);
    const reminderTimes = [
      new Date(eventDateTime.getTime() - 24 * 60 * 60 * 1000), // 24 hours before
      new Date(eventDateTime.getTime() - 12 * 60 * 60 * 1000), // 12 hours before
    ];

    // Get all event participants
    const { data: participants } = await supabase
      .from('event_participants')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'attending');

    if (!participants) return;

    // Schedule notifications for each participant
    for (const participant of participants) {
      for (const reminderTime of reminderTimes) {
        if (reminderTime > new Date()) {
          // Schedule browser notification
          notificationService.scheduleEventReminder(
            eventId,
            eventTitle,
            reminderTime
          );

          // Store in database for email notifications
          await sendNotificationToUser(
            participant.user_id,
            'Event Reminder',
            `"${eventTitle}" is coming up soon!`,
            'event',
            { 
              event_id: eventId,
              reminder_time: reminderTime.toISOString(),
              event_date: eventDate,
              event_time: eventTime
            }
          );
        }
      }
    }
  } catch (error) {
    console.error('Error scheduling event notifications:', error);
  }
};