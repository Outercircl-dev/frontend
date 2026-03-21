import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced preparation tips based on event category
const getPreparationTips = (category: string = 'social', location?: string): string => {
  const categoryTips: Record<string, string[]> = {
    sports: [
      '👟 Wear comfortable athletic shoes and activewear',
      '🥤 Bring water and a small snack for energy',
      '🏃‍♂️ Do a quick warm-up to avoid injury'
    ],
    social: [
      '😊 Bring your best energy and conversation starters',
      '🤝 Be ready to exchange contact info with new connections',
      '📱 Make sure you can easily find the group'
    ],
    food: [
      '🍽️ Come hungry but not overly full',
      '💳 Check payment methods and any dietary notes',
      '📸 Camera ready for delicious moments!'
    ],
    outdoor: [
      '🦟 Pack insect repellent and sunscreen',
      '👟 Wear sturdy shoes suitable for terrain',
      '🎒 Bring essentials in a small backpack'
    ],
    creative: [
      '🎨 Wear comfortable clothes you don\'t mind getting creative in',
      '✨ Come with an open mind and willingness to experiment',
      '📱 Bring inspiration if it helps your creativity'
    ],
    learning: [
      '📝 Bring notepad and pen for key insights',
      '🧠 Come well-rested and ready to absorb new information',
      '❓ Prepare thoughtful questions in advance'
    ]
  };

  const tips = categoryTips[category] || categoryTips.social;
  return tips.slice(0, 3).map(tip => `• ${tip}`).join('\n');
};

// Mock weather advice (in production, integrate with weather API)
const getWeatherAdvice = (location?: string): string => {
  const weatherTips = [
    '☀️ Sunny and warm - bring sunscreen and water',
    '☁️ Cloudy but mild - perfect weather for activities',
    '🌧️ Light rain expected - bring a light jacket or umbrella',
    '⛅ Partly cloudy - comfortable conditions ahead'
  ];
  
  return weatherTips[Math.floor(Math.random() * weatherTips.length)];
};

const handler = async (req: Request): Promise<Response> => {
  console.log('⏰ send-2h-reminder function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find events that need 2-hour reminders
    const now = new Date();
    const { data: events, error } = await supabase
      .from('scheduled_reminders')
      .select(`
        id,
        event_id,
        events!inner(
          id,
          title,
          date,
          time,
          location,
          category,
          meetup_spot,
          host_id,
          status,
          profiles!events_host_id_fkey(name)
        )
      `)
      .eq('reminder_type', '2h')
      .lte('scheduled_for', now.toISOString())
      .is('sent_at', null);

    if (error) {
      console.error('❌ Error fetching scheduled reminders:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reminders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!events || events.length === 0) {
      console.log('✅ No 2-hour reminders to send');
      return new Response(
        JSON.stringify({ message: 'No reminders to send', count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;

    for (const reminder of events) {
      try {
        const event = reminder.events as any;
        
        // Get all attending participants
        const { data: participants } = await supabase
          .from('event_participants')
          .select('user_id, profiles!inner(name)')
          .eq('event_id', event.id)
          .eq('status', 'attending');

        if (!participants || participants.length === 0) continue;

        const preparationTips = getPreparationTips(event.category, event.location);
        const weatherAdvice = getWeatherAdvice(event.location);
        const meetupInfo = event.meetup_spot 
          ? `\n🚩 **Meetup Spot:** ${event.meetup_spot}` 
          : '';

        const enhancedReminderContent = `⏰ **Final Reminder - 2 Hours to Go!**

"${event.title}" starts in just 2 hours!

📍 **Event Details:**
• Time: ${event.time || 'TBD'}
• Location: ${event.location || 'TBD'}${meetupInfo}

🌤️ **Weather Update:**
${weatherAdvice}

🎯 **Quick Preparation Tips:**
${preparationTips}

🚗 **Last-Minute Checklist:**
• Double-check directions and parking options
• Confirm you have the host's contact info
• Charge your phone and bring essentials
• Set a departure reminder for 15 minutes before you need to leave

💬 **Questions?** Reply to this group chat - everyone's here to help!

See you soon! 🌟`;

        // Send enhanced message to event chat
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            sender_id: event.host_id,
            event_id: event.id,
            content: enhancedReminderContent,
            message_type: 'event'
          });

        if (messageError) {
          console.error('❌ Error sending 2h reminder message:', messageError);
          continue;
        }

        // Send enhanced notifications to all participants
        const notifications = participants.map(participant => ({
          user_id: participant.user_id,
          title: `${event.title} starts in 2 hours!`,
          content: `Final reminder with preparation tips: "${event.title}" is coming up soon. Check the group chat for detailed prep advice and last-minute updates.`,
          notification_type: 'event_reminder',
          metadata: {
            event_id: event.id,
            reminder_type: '2h_final',
            event_title: event.title,
            has_preparation_tips: true
          }
        }));

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notificationError) {
          console.warn('⚠️ Error sending 2h reminder notifications:', notificationError);
        }

        // Mark reminder as sent
        await supabase
          .from('scheduled_reminders')
          .update({ sent_at: now.toISOString() })
          .eq('id', reminder.id);

        sentCount++;
        console.log(`✅ Enhanced 2h reminder sent for event: ${event.title}`);

      } catch (eventError) {
        console.error('❌ Error processing event reminder:', eventError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${sentCount} enhanced 2-hour reminders with preparation tips`,
        count: sentCount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in send-2h-reminder:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);