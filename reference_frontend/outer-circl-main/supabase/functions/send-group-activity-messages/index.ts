import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing pre-event group messages...');

    // Find events that need 24-hour group messages (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    // Also find events happening today that may need immediate messages
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const { data: events, error: eventsError } = await supabaseClient
      .from('events')
      .select('id, title, date, time, location, description, host_id')
      .eq('status', 'active')
      .gte('date', todayStart.toISOString().split('T')[0])
      .lt('date', tomorrowEnd.toISOString().split('T')[0]);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return new Response(JSON.stringify({ error: 'Error fetching events' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!events || events.length === 0) {
      console.log('No events found for today or tomorrow');
      return new Response(JSON.stringify({ message: 'No events found for today or tomorrow' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log(`Found ${events.length} events for today/tomorrow`);

    let groupMessagesSent = 0;

    for (const event of events) {
      const eventDate = new Date(event.date);
      const isToday = eventDate.toDateString() === today.toDateString();
      const isTomorrow = eventDate.toDateString() === tomorrow.toDateString();

      // Calculate event datetime
      let eventDateTime = new Date(event.date);
      if (event.time) {
        const [hours, minutes] = event.time.split(':');
        eventDateTime.setHours(parseInt(hours), parseInt(minutes));
      } else {
        eventDateTime.setHours(12, 0); // Default to noon
      }

      const now = new Date();
      const hoursUntilEvent = (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Skip events that have already passed or are too far in the future
      if (hoursUntilEvent < 0 || hoursUntilEvent > 25) {
        continue;
      }

      // Get all participants for this event
      const { data: participants, error: participantsError } = await supabaseClient
        .from('event_participants')
        .select(`
          user_id,
          profiles!inner(id, name)
        `)
        .eq('event_id', event.id)
        .eq('status', 'attending');

      if (participantsError) {
        console.error('Error fetching participants for event:', event.id, participantsError);
        continue;
      }

      if (!participants || participants.length < 2) {
        console.log('Not enough participants for event:', event.id);
        continue;
      }

      // Check if we already sent a group message for this event today
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: existingMessages, error: existingError } = await supabaseClient
        .from('messages')
        .select('id')
        .eq('event_id', event.id)
        .eq('message_type', 'event')
        .gte('created_at', `${todayStr}T00:00:00.000Z`)
        .limit(1);

      if (existingError) {
        console.error('Error checking existing messages:', existingError);
        continue;
      }

      if (existingMessages && existingMessages.length > 0) {
        console.log('Group message already sent for event today:', event.id);
        continue;
      }

      const participantNames = participants.map(p => (p.profiles as any)?.name || 'Someone').join(', ');
      
      let groupMessageContent: string;

      if (isTomorrow) {
        // 24-hour message
        groupMessageContent = `🎉 Hey everyone! Your activity "${event.title}" is happening tomorrow!

👥 Who's attending: ${participantNames}

📍 Location: ${event.location || 'TBD'}
⏰ Time: ${event.time || 'See event details'}

💬 Perfect time to introduce yourselves!
Tomorrow you'll be meeting some amazing new people! Why not break the ice now? Share in the comments:
• Your name and what you're excited about
• A fun fact about yourself  
• Your experience with this type of activity
• What you're hoping to get out of tomorrow's activity

👕 What to wear: Dress comfortably and weather-appropriately. Check the forecast and dress in layers if needed!

✨ Getting to know each other beforehand makes activities 10x better! You'll show up feeling like you already have friends waiting for you.

Can't wait to see you all connect! 🌟`;
      } else if (isToday && hoursUntilEvent <= 24 && hoursUntilEvent > 12) {
        // Today but more than 12 hours away - send 24h style message
        groupMessageContent = `🎉 Hey everyone! Your activity "${event.title}" is happening today!

👥 Who's attending: ${participantNames}

📍 Location: ${event.location || 'TBD'}
⏰ Time: ${event.time || 'See event details'}

💬 Great time to introduce yourselves!
You'll be meeting some amazing people today! Share a quick intro:
• Your name and what you're excited about
• A fun fact about yourself
• Any experience with this activity

👕 What to wear: Check the weather and dress appropriately for the activity!

✨ Early connections lead to lasting friendships - don't be shy, everyone's excited to meet you!

See you today! 🌟`;
      } else if (isToday && hoursUntilEvent <= 12) {
        // Final reminder for today's events within 12 hours
        const timeUntil = hoursUntilEvent > 1 
          ? `${Math.round(hoursUntilEvent)} hours`
          : `${Math.round(hoursUntilEvent * 60)} minutes`;

        groupMessageContent = `🚨 Final reminder! "${event.title}" is happening in ${timeUntil}!

👥 Who's attending: ${participantNames}

📍 Location: ${event.location || 'TBD'}
⏰ Time: ${event.time || 'See event details'}

✅ Last-minute checklist:
• Check the weather and dress accordingly
• Bring water and any personal items you might need
• Plan your route and arrive on time
• Bring your positive energy! 

👋 Last chance to say hi before meeting!
If you haven't introduced yourself yet, now's the perfect time! Just share:
• Your name
• One thing you're looking forward to

🎊 In just ${timeUntil}, you'll be making new memories with new friends. Get ready for an amazing time!

See you there! 🎊`;
      } else {
        // Skip if it doesn't fit our criteria
        continue;
      }

      // Send group message to all participants as individual event messages
      const { error: messageError } = await supabaseClient
        .from('messages')
        .insert({
          sender_id: event.host_id, // Message comes from the host
          event_id: event.id,
          content: groupMessageContent,
          message_type: 'event',
          created_at: new Date().toISOString()
        });

      if (messageError) {
        console.error('Error sending group message for event:', event.id, messageError);
      } else {
        groupMessagesSent++;
        console.log(`Group message sent for event: ${event.id} (${event.title})`);
      }
    }

    console.log(`Successfully sent ${groupMessagesSent} group messages`);

    return new Response(JSON.stringify({ 
      success: true, 
      groupMessagesSent,
      eventsProcessed: events.length 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in send-group-activity-messages function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);