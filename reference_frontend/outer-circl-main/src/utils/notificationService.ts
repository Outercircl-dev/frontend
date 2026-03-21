import { supabase } from '@/integrations/supabase/client';

export interface NotificationServiceConfig {
  enableEmailDuplication?: boolean;
  enableGroupMessages?: boolean;
  enableRealTimeToasts?: boolean;
}

/**
 * Enhanced notification service that ensures notifications appear in navbar
 * and duplicates email notifications as in-app messages
 */
export class NotificationService {
  private static instance: NotificationService;
  private config: NotificationServiceConfig;

  private constructor(config: NotificationServiceConfig = {}) {
    this.config = {
      enableEmailDuplication: true,
      enableGroupMessages: true,
      enableRealTimeToasts: true,
      ...config
    };
  }

  static getInstance(config?: NotificationServiceConfig): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService(config);
    }
    return NotificationService.instance;
  }

  /**
   * Send enhanced notification that appears in navbar and optionally creates group messages
   */
  async sendEnhancedNotification(params: {
    type: 'pre_activity_reminder' | 'activity_update' | 'general';
    eventId?: string;
    userId?: string;
    userIds?: string[];
    title: string;
    content: string;
    emailContent?: string;
    createGroupMessage?: boolean;
    notificationType?: string;
    metadata?: any;
  }) {
    try {
      const response = await supabase.functions.invoke('enhanced-notification-service', {
        body: {
          ...params,
          createGroupMessage: params.createGroupMessage ?? this.config.enableGroupMessages
        }
      });

      if (response.error) {
        throw new Error(`Failed to send enhanced notification: ${response.error.message}`);
      }

      return response.data;
    } catch (error) {
      console.error('NotificationService: Failed to send enhanced notification:', error);
      throw error;
    }
  }

  /**
   * Send pre-activity reminder that appears in both notifications and group chat
   */
  async sendPreActivityReminder(eventId: string, customMessage?: string) {
    try {
      // Get event details first
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        throw new Error('Event not found');
      }

      const title = `Reminder: ${event.title} is coming up!`;
      const content = customMessage || `Don't forget about "${event.title}" happening soon! Check the group chat for details and connect with other participants.`;

      return await this.sendEnhancedNotification({
        type: 'pre_activity_reminder',
        eventId,
        title,
        content,
        createGroupMessage: true,
        notificationType: 'event',
        metadata: {
          event_title: event.title,
          message_type: 'pre_activity',
          location: event.location,
          time: event.time,
          date: event.date
        }
      });
    } catch (error) {
      console.error('NotificationService: Failed to send pre-activity reminder:', error);
      throw error;
    }
  }

  /**
   * Send activity update that appears in notifications and optionally group chat
   */
  async sendActivityUpdate(eventId: string, title: string, content: string, includeGroupMessage = true) {
    return await this.sendEnhancedNotification({
      type: 'activity_update',
      eventId,
      title,
      content,
      createGroupMessage: includeGroupMessage,
      notificationType: 'event',
      metadata: {
        message_type: 'activity_update'
      }
    });
  }

  /**
   * Ensure email notifications are duplicated as in-app notifications
   */
  async duplicateEmailAsNotification(params: {
    userIds: string[];
    emailSubject: string;
    emailContent: string;
    eventId?: string;
    notificationType?: string;
  }) {
    if (!this.config.enableEmailDuplication) {
      return;
    }

    return await this.sendEnhancedNotification({
      type: 'general',
      userIds: params.userIds,
      title: params.emailSubject,
      content: `📧 ${params.emailContent.substring(0, 200)}${params.emailContent.length > 200 ? '...' : ''}`,
      emailContent: params.emailContent,
      createGroupMessage: false, // Don't create group message for email duplicates
      notificationType: params.notificationType || 'general',
      metadata: {
        source: 'email_duplicate',
        event_id: params.eventId,
        has_email_equivalent: true
      }
    });
  }

  /**
   * Send notification to specific users
   */
  async sendToUsers(userIds: string[], title: string, content: string, metadata?: any) {
    return await this.sendEnhancedNotification({
      type: 'general',
      userIds,
      title,
      content,
      createGroupMessage: false,
      notificationType: 'general',
      metadata
    });
  }

  /**
   * Send notification to event participants
   */
  async sendToEventParticipants(eventId: string, title: string, content: string, includeGroupMessage = false) {
    return await this.sendEnhancedNotification({
      type: 'activity_update',
      eventId,
      title,
      content,
      createGroupMessage: includeGroupMessage,
      notificationType: 'event',
      metadata: {
        event_id: eventId
      }
    });
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();