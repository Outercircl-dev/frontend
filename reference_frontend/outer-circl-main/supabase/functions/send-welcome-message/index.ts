import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WelcomeMessageRequest {
  eventId: string;
  participantId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('🎉 send-welcome-message function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { eventId, participantId }: WelcomeMessageRequest = await req.json();

    if (!eventId || !participantId) {
      return new Response(
        JSON.stringify({ error: 'Event ID and participant ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, date, time, location, host_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('❌ Event not found:', eventError);
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get participant details
    const { data: participant } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', participantId)
      .single();

    // Get host details
    const { data: host } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', event.host_id)
      .single();

    // Check if welcome message already exists for this participant
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('event_id', eventId)
      .eq('message_type', 'event')
      .eq('sender_id', event.host_id)
      .ilike('content', `%Welcome ${participant?.name || 'to our group'}%`)
      .limit(1);

    if (existingMessage && existingMessage.length > 0) {
      console.log('✅ Welcome message already sent for this participant');
      return new Response(
        JSON.stringify({ message: 'Welcome message already sent', sent: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const participantName = participant?.name || 'New participant';
    const hostName = host?.name || 'Event host';

    const welcomeContent = `🎉 Welcome ${participantName}!

Thanks for joining "${event.title}"! We're excited to have you as part of our group.

📅 **Event Details:**
• Date: ${new Date(event.date).toLocaleDateString()}
• Time: ${event.time || 'TBD'}
• Location: ${event.location || 'TBD'}
• Host: ${hostName}

👋 **Introduce Yourself!**
We'd love to get to know you better! Feel free to share:
• A fun fact about yourself
• What you're most excited about for this activity
• Any experience or tips related to what we'll be doing

Feel free to chat with everyone here before the event - it makes meeting in person so much more natural! 😊`;

    // Send welcome message
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        sender_id: event.host_id,
        event_id: eventId,
        content: welcomeContent,
        message_type: 'event'
      });

    if (messageError) {
      console.error('❌ Error sending welcome message:', messageError);
      return new Response(
        JSON.stringify({ error: 'Failed to send welcome message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notification for the new participant
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: participantId,
        title: `Welcome to ${event.title}!`,
        content: `You've joined "${event.title}" - check out the group chat to introduce yourself!`,
        notification_type: 'event',
        metadata: {
          event_id: eventId,
          event_title: event.title,
          welcome_message: true
        }
      });

    if (notificationError) {
      console.warn('⚠️ Error creating welcome notification:', notificationError);
    }

    console.log(`✅ Welcome message sent for ${participantName} joining ${event.title}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Welcome message sent for ${participantName}`,
        event: event.title,
        participant: participantName
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in send-welcome-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);