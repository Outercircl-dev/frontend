import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderRequest {
  eventId?: string;
  reminderType: '24h' | '12h' | '2h';
}

const handler = async (req: Request): Promise<Response> => {
  console.log('⏰ send-enhanced-reminders function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { eventId, reminderType }: ReminderRequest = await req.json();
    console.log(`📅 Processing ${reminderType} reminders for event: ${eventId || 'all events'}`);

    let eventsToProcess = [];

    if (eventId) {
      // Process specific event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('status', 'active')
        .single();

      if (eventError || !event) {
        return new Response(
          JSON.stringify({ error: 'Event not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      eventsToProcess.push(event);
    } else {
      // Find events that need reminders based on timing
      const now = new Date();
      let targetTime: Date;

      switch (reminderType) {
        case '24h':
          targetTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case '12h':
          targetTime = new Date(now.getTime() + 12 * 60 * 60 * 1000);
          break;
        case '2h':
          targetTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
          break;
      }

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'active')
        .gte('date', targetTime.toISOString().split('T')[0])
        .lte('date', new Date(targetTime.getTime() + 60 * 60 * 1000).toISOString().split('T')[0]);

      if (eventsError) {
        console.error('❌ Error fetching events:', eventsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch events' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      eventsToProcess = events || [];
    }

    console.log(`📊 Found ${eventsToProcess.length} events to process`);

    let processedCount = 0;
    let errors: any[] = [];

    for (const event of eventsToProcess) {
      try {
        const eventDateTime = new Date(event.date);
        if (event.time) {
          const [hours, minutes] = event.time.split(':');
          eventDateTime.setHours(parseInt(hours), parseInt(minutes));
        } else {
          eventDateTime.setHours(12, 0);
        }

        // Check if we already sent this reminder type for this event
        const reminderCheckContent = `${reminderType.toUpperCase()} REMINDER`;
        const { data: existingReminder } = await supabase
          .from('messages')
          .select('id')
          .eq('event_id', event.id)
          .eq('message_type', 'event')
          .eq('sender_id', event.host_id)
          .ilike('content', `%${reminderCheckContent}%`)
          .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()) // Last 6 hours
          .limit(1);

        if (existingReminder && existingReminder.length > 0) {
          console.log(`⏭️ ${reminderType} reminder already sent for event: ${event.title}`);
          continue;
        }

        const reminderContent = generateReminderContent({
          eventId: event.id,
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: event.time,
          eventLocation: event.location,
          reminderType
        });

        // Send reminder message
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            sender_id: event.host_id,
            event_id: event.id,
            content: reminderContent,
            message_type: 'event'
          });

        if (messageError) {
          console.error(`❌ Error sending reminder for ${event.title}:`, messageError);
          errors.push({ event: event.title, error: messageError.message });
          continue;
        }

        // Create notifications for all participants
        const { data: participants } = await supabase
          .from('event_participants')
          .select('user_id')
          .eq('event_id', event.id)
          .eq('status', 'attending');

        if (participants && participants.length > 0) {
          const notifications = participants.map(p => ({
            user_id: p.user_id,
            title: `${reminderType.toUpperCase()} Reminder: ${event.title}`,
            content: `Your activity "${event.title}" is happening soon! Check the group chat for details.`,
            notification_type: 'event_reminder' as const,
            metadata: {
              event_id: event.id,
              event_title: event.title,
              reminder_type: reminderType
            }
          }));

          const { error: notificationError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notificationError) {
            console.warn(`⚠️ Error creating notifications for ${event.title}:`, notificationError);
          } else {
            console.log(`✅ Created ${notifications.length} notifications for ${event.title}`);
          }
        }

        processedCount++;
        console.log(`✅ ${reminderType} reminder sent for: ${event.title}`);

      } catch (error: any) {
        console.error(`❌ Error processing event ${event.title}:`, error);
        errors.push({ event: event.title, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} ${reminderType} reminders`,
        processed: processedCount,
        total: eventsToProcess.length,
        errors: errors
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in send-enhanced-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

interface ReminderParams {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  eventLocation?: string;
  reminderType: '24h' | '12h' | '2h';
}

function generateReminderContent(params: ReminderParams): string {
  const eventDateTime = new Date(params.eventDate);
  if (params.eventTime) {
    const [hours, minutes] = params.eventTime.split(':');
    eventDateTime.setHours(parseInt(hours), parseInt(minutes));
  }

  const baseContent = `⏰ **${params.reminderType.toUpperCase()} REMINDER** ⏰

"${params.eventTitle}" is coming up!

📅 **When:** ${eventDateTime.toLocaleDateString()} at ${params.eventTime || 'TBD'}
📍 **Where:** ${params.eventLocation || 'TBD'}`;

  switch (params.reminderType) {
    case '24h':
      return `${baseContent}

🌤️ **24 Hours to Go!**
Time to start getting excited! Here's what to do:

✅ **Weather Check:** Look up the forecast and dress appropriately
✅ **What to Bring:** Water, comfortable shoes, and a positive attitude!
✅ **Plan Your Route:** Check traffic and transit options
✅ **Contact Info:** Save the host's contact details just in case

💭 **Getting Nervous?** That's totally normal! Everyone else is probably feeling the same way. Remember, we're all here to have fun and meet new people.

Can't wait to see everyone tomorrow! 🎉`;

    case '12h':
      return `${baseContent}

🚀 **12 Hours to Go!**
We're getting close! Final preparations:

👥 **Meet Your Fellow Participants:**
Take a moment to introduce yourself in this chat if you haven't already! It makes meeting in person so much easier.

🎒 **Final Checklist:**
• Comfortable clothing and shoes ✓
• Water bottle ✓
• Snacks if it's a longer activity ✓
• Phone charged ✓
• Positive energy ✓

💬 **Icebreaker Time!**
While we're all here, let's break the ice:
• What's one thing you're hoping to get out of this activity?
• Any fun facts about yourself you'd like to share?

See you all soon! The excitement is building! 🌟`;

    case '2h':
      return `${baseContent}

🔥 **FINAL CALL - 2 Hours to Go!**

This is it! Hope everyone is getting excited!

🚨 **Last-Minute Logistics:**
• Double-check the meeting point: ${params.eventLocation || 'TBD'}
• Leave a bit early to account for traffic/transit delays
• Keep your phone handy in case you need to reach the group

📱 **Having Trouble Finding Us?**
Look for friendly faces and don't hesitate to ask around. Most people are happy to help!

🎯 **What to Expect:**
• We'll do a quick round of introductions
• Everyone will be super welcoming
• Just be yourself and have fun!

Let's make this an awesome experience for everyone! See you very soon! 🚀🎉

Any last-minute questions? Drop them in the chat!`;

    default:
      return baseContent;
  }
}

serve(handler);