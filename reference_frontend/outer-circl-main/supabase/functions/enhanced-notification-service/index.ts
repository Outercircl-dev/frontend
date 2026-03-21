import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      type,
      eventId,
      userId,
      userIds,
      title,
      content,
      emailContent,
      createGroupMessage = true,
      notificationType = 'event',
      metadata = {}
    }: NotificationRequest = await req.json();

    console.log(`[ENHANCED-NOTIFICATION] Processing ${type} notification`);

    let targetUserIds: string[] = [];
    let event: any = null;

    // Determine target users
    if (userId) {
      targetUserIds = [userId];
    } else if (userIds) {
      targetUserIds = userIds;
    } else if (eventId) {
      // Get all participants for the event
      const { data: participants, error: participantsError } = await supabase
        .from('event_participants')
        .select('user_id, profiles:user_id(name, email)')
        .eq('event_id', eventId)
        .eq('status', 'attending');

      if (participantsError) {
        throw new Error(`Failed to fetch participants: ${participantsError.message}`);
      }

      targetUserIds = participants?.map(p => p.user_id) || [];

      // Get event details if needed
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) {
        throw new Error(`Failed to fetch event: ${eventError.message}`);
      }

      event = eventData;
    }

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No target users specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ENHANCED-NOTIFICATION] Targeting ${targetUserIds.length} users`);

    // Create in-app notifications for all users
    const notificationResults = [];
    for (const targetUserId of targetUserIds) {
      try {
        const { data: notificationData, error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: targetUserId,
            title,
            content,
            notification_type: notificationType,
            metadata: {
              ...metadata,
              event_id: eventId,
              source: 'enhanced_service',
              has_email_equivalent: !!emailContent
            }
          })
          .select()
          .single();

        if (notificationError) {
          console.error(`Failed to create notification for user ${targetUserId}:`, notificationError);
        } else {
          notificationResults.push(notificationData);
          console.log(`Created notification for user ${targetUserId}`);
        }
      } catch (error) {
        console.error(`Error creating notification for user ${targetUserId}:`, error);
      }
    }

    // Create group message if requested and eventId is provided
    let groupMessageResult = null;
    if (createGroupMessage && eventId && event) {
      try {
        // Enhanced group message content for pre-activity reminders
        let groupMessageContent = content;
        
        if (type === 'pre_activity_reminder') {
          const timeUntilEvent = calculateTimeUntilEvent(event);
          const participantNames = await getParticipantNames(supabase, eventId);
          
          groupMessageContent = `🚨 ${event.title} is happening ${timeUntilEvent}!

👥 Who's attending: ${participantNames}

📍 ${event.location || 'Location TBD'} at ${event.time || 'Time TBD'}

${content}

💬 Perfect time to connect! Break the ice here:
• Share your name and what you're excited about
• Ask questions or share tips with the group
• Connect with your activity buddies before you meet!

This is your group chat - use it to coordinate, ask questions, and get to know each other! 🌟`;
        }

        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .insert({
            sender_id: event.host_id, // Use host as sender, or could use system account
            event_id: eventId,
            content: groupMessageContent,
            message_type: 'event',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (messageError) {
          console.error('Failed to create group message:', messageError);
        } else {
          groupMessageResult = messageData;
          console.log(`Created group message for event ${eventId}`);
        }
      } catch (error) {
        console.error('Error creating group message:', error);
      }
    }

    // If email content is provided, you could integrate with email service here
    // This ensures email notifications are always accompanied by in-app notifications
    if (emailContent) {
      console.log(`[ENHANCED-NOTIFICATION] Email content provided - would send emails to ${targetUserIds.length} users`);
      // TODO: Integrate with email service (Resend, MailerSend, etc.)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Enhanced notifications sent successfully`,
        notificationsCreated: notificationResults.length,
        groupMessageCreated: !!groupMessageResult,
        targetUsers: targetUserIds.length,
        type,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[ENHANCED-NOTIFICATION] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to send enhanced notifications',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

// Helper functions
async function getParticipantNames(supabase: any, eventId: string): Promise<string> {
  try {
    const { data: participants } = await supabase
      .from('event_participants')
      .select('profiles:user_id(name)')
      .eq('event_id', eventId)
      .eq('status', 'attending');
    
    return participants?.map((p: any) => p.profiles?.name || 'Someone').join(', ') || 'Participants';
  } catch (error) {
    return 'Participants';
  }
}

function calculateTimeUntilEvent(event: any): string {
  try {
    const eventDate = new Date(event.date);
    if (event.time) {
      const [hours, minutes] = event.time.split(':');
      eventDate.setHours(parseInt(hours), parseInt(minutes));
    }
    
    const now = new Date();
    const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntil > 24) {
      const daysUntil = Math.ceil(hoursUntil / 24);
      return `in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;
    } else if (hoursUntil > 1) {
      return `in ${Math.round(hoursUntil)} hours`;
    } else if (hoursUntil > 0) {
      const minutesUntil = Math.round(hoursUntil * 60);
      return `in ${minutesUntil} minutes`;
    } else {
      return 'soon';
    }
  } catch (error) {
    return 'soon';
  }
}

serve(handler);