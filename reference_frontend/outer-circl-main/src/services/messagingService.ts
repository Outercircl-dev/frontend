import { supabase } from '@/integrations/supabase/client';
import { notificationService } from './notificationService';

export interface MessageData {
  id: string;
  sender_id: string;
  recipient_id?: string;
  event_id?: string;
  content: string;
  message_type: 'direct' | 'event';
  created_at: string;
  read_at?: string;
}

export interface PrivacySettings {
  message_privacy: 'everyone' | 'followers' | 'nobody';
  push_notifications: boolean;
  event_messages: boolean;
}

class MessagingService {
  
  async sendMessage(
    recipientId: string, 
    content: string, 
    eventId?: string
  ): Promise<{ success: boolean; message?: MessageData; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if sender can message the recipient
      const canMessage = await this.checkMessagePermissions(user.id, recipientId);
      if (!canMessage) {
        return { success: false, error: 'You cannot send messages to this user based on their privacy settings' };
      }

      // Insert message
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          event_id: eventId,
          content,
          message_type: eventId ? 'event' : 'direct'
        })
        .select()
        .single() as { data: MessageData | null; error: any };

      if (error) {
        return { success: false, error: error.message };
      }

      // Send notification to recipient
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('name, username')
        .eq('id', user.id)
        .single();

      const senderName = senderProfile?.name || senderProfile?.username || 'Someone';
      
      await notificationService.sendMessageNotification(
        senderName, 
        content, 
        eventId || recipientId
      );

      return { success: true, message };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  async markAsRead(messageId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('recipient_id', user.id);

      return !error;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }

  async getConversations(): Promise<MessageData[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(name, username, avatar_url),
          recipient:profiles!messages_recipient_id_fkey(name, username, avatar_url),
          event:events(title)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false }) as { data: any[] | null; error: any };

      if (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }

      return (messages || []).map(msg => ({
        ...msg,
        message_type: msg.message_type as 'direct' | 'event'
      })) as MessageData[];
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  }

  private async checkMessagePermissions(senderId: string, recipientId: string): Promise<boolean> {
    try {
      // Get recipient's privacy settings
      const { data: settings } = await supabase
        .from('profile_privacy_settings')
        .select('message_privacy')
        .eq('user_id', recipientId)
        .single();

      const messagePrivacy = settings?.message_privacy || 'everyone';

      // If privacy is set to 'everyone', allow messaging
      if (messagePrivacy === 'everyone') {
        return true;
      }

      // If privacy is set to 'nobody', deny messaging
      if (messagePrivacy === 'nobody') {
        return false;
      }

      // If privacy is set to 'followers', check friendship status
      if (messagePrivacy === 'followers') {
        const { data: friendship } = await supabase
          .from('friendships')
          .select('status')
          .or(`and(user_id.eq.${senderId},friend_id.eq.${recipientId}),and(user_id.eq.${recipientId},friend_id.eq.${senderId})`)
          .eq('status', 'accepted')
          .single();

        return !!friendship;
      }

      return false;
    } catch (error) {
      console.error('Error checking message permissions:', error);
      return false;
    }
  }

  async sendEventMessage(eventId: string, content: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if user is a participant in the event
      const { data: participant } = await supabase
        .from('event_participants')
        .select('status')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single();

      if (!participant || participant.status !== 'attending') {
        return false;
      }

      // Send message to event
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          event_id: eventId,
          content,
          message_type: 'event'
        });

      return !error;
    } catch (error) {
      console.error('Error sending event message:', error);
      return false;
    }
  }
}

export const messagingService = new MessagingService();