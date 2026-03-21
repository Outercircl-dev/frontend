import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

class NotificationService {
  private permissionGranted = false;
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return this.permissionGranted;

    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notifications');
        return false;
      }

      // Check current permission
      if (Notification.permission === 'granted') {
        this.permissionGranted = true;
      } else if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        this.permissionGranted = permission === 'granted';
      }

      this.isInitialized = true;
      return this.permissionGranted;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  async showNotification(options: NotificationOptions): Promise<void> {
    try {
      // Check if user has enabled notifications in settings
      const canSend = await this.checkUserPreferences(options.data?.type || 'general');
      
      if (!canSend) {
        console.log('Notification blocked by user preferences');
        return;
      }

      // Initialize if not done already
      await this.initialize();

      if (!this.permissionGranted) {
        // Fallback to toast notification
        toast(options.title, {
          description: options.body,
        });
        return;
      }

      // Show browser notification
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge,
        tag: options.tag,
        data: options.data,
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle click event
      notification.onclick = () => {
        window.focus();
        if (options.data?.url) {
          window.location.href = options.data.url;
        }
        notification.close();
      };

    } catch (error) {
      console.error('Failed to show notification:', error);
      // Fallback to toast
      toast(options.title, {
        description: options.body,
      });
    }
  }

  private async checkUserPreferences(type: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: settings } = await supabase
        .from('profile_privacy_settings')
        .select('push_notifications, email_notifications, event_messages')
        .eq('user_id', user.id)
        .single();

      if (!settings) return true; // Default to allow if no settings

      // Check based on notification type
      switch (type) {
        case 'event':
        case 'event_reminder':
          return settings.event_messages && settings.push_notifications;
        case 'message':
        case 'friend_request':
          return settings.push_notifications;
        case 'email':
          return settings.email_notifications;
        default:
          return settings.push_notifications;
      }
    } catch (error) {
      console.error('Error checking user preferences:', error);
      return false;
    }
  }

  async scheduleEventReminder(eventId: string, eventTitle: string, reminderTime: Date): Promise<void> {
    try {
      const now = new Date();
      const timeUntilReminder = reminderTime.getTime() - now.getTime();

      if (timeUntilReminder > 0) {
        setTimeout(() => {
          this.showNotification({
            title: 'Event Reminder',
            body: `"${eventTitle}" is starting soon!`,
            icon: '/favicon.ico',
            tag: `event-reminder-${eventId}`,
            data: {
              type: 'event_reminder',
              eventId,
              url: `/event/${eventId}`
            }
          });
        }, timeUntilReminder);
      }
    } catch (error) {
      console.error('Failed to schedule reminder:', error);
    }
  }

  async sendMessageNotification(senderName: string, message: string, conversationId: string): Promise<void> {
    await this.showNotification({
      title: `New message from ${senderName}`,
      body: message,
      tag: `message-${conversationId}`,
      data: {
        type: 'message',
        conversationId,
        url: `/messages?conversation=${conversationId}`
      }
    });
  }

  async sendFriendRequestNotification(senderName: string, requestId: string): Promise<void> {
    await this.showNotification({
      title: 'New Friend Request',
      body: `${senderName} sent you a friend request`,
      tag: `friend-request-${requestId}`,
      data: {
        type: 'friend_request',
        requestId,
        url: '/notifications'
      }
    });
  }
}

export const notificationService = new NotificationService();