import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestMessageRequest {
  eventId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { eventId }: TestMessageRequest = await req.json();

    // Find an event to test with - either specified eventId or first event user is attending
    let targetEventId = eventId;
    
    if (!targetEventId) {
      // Find the first upcoming event the user is attending
      const { data: participantEvents, error: participantError } = await supabase
        .from('event_participants')
        .select(`
          event_id,
          event:events(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'attending');

      if (participantError) {
        console.error('Error fetching participant events:', participantError);
        return new Response(JSON.stringify({ error: 'Failed to find events' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find an upcoming event
      const upcomingEvent = participantEvents?.find((pe: any) => {
        const event = pe.event;
        if (!event?.date) return false;
        
        let eventDateTime = new Date(event.date);
        if (event.time) {
          const [hours, minutes] = event.time.split(':');
          eventDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        }
        
        return eventDateTime > new Date();
      });

      if (!upcomingEvent) {
        return new Response(JSON.stringify({ error: 'No upcoming events found that you are attending' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      targetEventId = upcomingEvent.event_id;
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', targetEventId)
      .single();

    if (eventError || !event) {
      console.error('Error fetching event:', eventError);
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all participants for this event
    const { data: participants, error: participantsError } = await supabase
      .from('event_participants')
      .select(`
        user_id,
        user:profiles(name, username)
      `)
      .eq('event_id', targetEventId)
      .eq('status', 'attending');

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch participants' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get participant names for the group message
    const participantNames = participants?.map((p: any) => p.user?.name || 'Someone').join(', ') || 'No participants';
    
    // Create 24-hour style pre-activity message
    const sampleMessage = `🎉 Hey everyone! Your activity "${event.title}" is happening tomorrow!

👥 Who's attending: ${participantNames}

📍 Location: ${event.location || 'TBD'}
⏰ Time: ${event.time || 'See event details'}

💬 Perfect time to introduce yourselves!
Tomorrow you'll be meeting some amazing new people! Why not break the ice now? Share in the comments:
• Your name and what you're excited about
• A fun fact about yourself  
• Your experience with this type of activity
• What you're hoping to get out of tomorrow's activity

👕 What to wear: Dress comfortably and weather-appropriately. Check the forecast and dress in layers if needed! For a morning dip, bring:
• Swimwear and towel
• Warm clothes for after
• Water bottle
• Maybe a warm drink for afterwards!

✨ Getting to know each other beforehand makes activities 10x better! You'll show up feeling like you already have friends waiting for you.

Can't wait to see you all connect and enjoy the refreshing morning dip! 🌟🏊‍♀️

*This is a test of our 24-hour pre-activity messaging system*`;

    // Send single group message to event chat from OuterCircl system
    try {
      // First, try to find an existing OuterCircl system account
      const { data: systemProfile, error: systemError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', 'outercircl_system')
        .single();

      // If no system account found, use the host as fallback
      const senderId = systemProfile?.id || event.host_id;

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: senderId,
          event_id: targetEventId,
          content: sampleMessage,
          message_type: 'event',
          created_at: new Date().toISOString()
        });

      if (messageError) {
        console.error('Error sending group message:', messageError);
        return new Response(JSON.stringify({ 
          error: 'Failed to send group message',
          details: messageError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Test 24-hour group message sent for event: ${event.title} from ${senderId === event.host_id ? 'host' : 'OuterCircl system'}`);
      
      // Also create notifications for all participants
      for (const participant of participants || []) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: participant.user_id,
            title: 'Test Pre-Activity Message',
            content: `OuterCircl sent a test message for "${event.title}". Check the activity chat!`,
            notification_type: 'event',
            metadata: {
              event_id: targetEventId,
              event_title: event.title,
              message_type: 'test_pre_activity'
            }
          });

        if (notificationError) {
          console.error('Error creating notification for participant:', participant.user_id, notificationError);
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        event: {
          id: event.id,
          title: event.title,
          date: event.date,
          time: event.time,
          location: event.location
        },
        participants_count: participants?.length || 0,
        participants_names: participantNames,
        messages_sent: participants?.length || 0, // This is what the frontend expects
        message: 'Test 24-hour pre-activity group message sent successfully'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Error processing group message:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to send group message',
        details: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    console.error('Error in send-test-pre-activity-message function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);