import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  eventId: string;
  action?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[IMMEDIATE-NOTIFICATIONS] Function started')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { eventId }: NotificationRequest = await req.json()
    
    if (!eventId) {
      console.error('[IMMEDIATE-NOTIFICATIONS] No eventId provided')
      return new Response(
        JSON.stringify({ error: 'Event ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[IMMEDIATE-NOTIFICATIONS] Processing event: ${eventId}`)

    // Get event details
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      console.error('[IMMEDIATE-NOTIFICATIONS] Error fetching event:', eventError)
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if event is within 24 hours
    const eventDateTime = new Date(event.date)
    if (event.time) {
      const [hours, minutes] = event.time.split(':')
      eventDateTime.setHours(parseInt(hours), parseInt(minutes))
    } else {
      eventDateTime.setHours(12, 0); // Default to noon
    }

    const now = new Date()
    const hoursUntilEvent = (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilEvent > 24 || hoursUntilEvent < 0) {
      console.log(`[IMMEDIATE-NOTIFICATIONS] Event not within 24 hours (${hoursUntilEvent.toFixed(1)}h), skipping`)
      return new Response(
        JSON.stringify({ message: 'Event not within 24 hours', hoursUntilEvent }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[IMMEDIATE-NOTIFICATIONS] Event is within 24 hours (${hoursUntilEvent.toFixed(1)}h), sending notifications`)

    // Get all participants who are attending
    const { data: participants, error: participantsError } = await supabaseClient
      .from('event_participants')
      .select(`
        user_id,
        profiles:user_id (name, email)
      `)
      .eq('event_id', eventId)
      .eq('status', 'attending')

    if (participantsError) {
      console.error('[IMMEDIATE-NOTIFICATIONS] Error fetching participants:', participantsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch participants' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!participants || participants.length === 0) {
      console.log('[IMMEDIATE-NOTIFICATIONS] No participants found')
      return new Response(
        JSON.stringify({ message: 'No participants to notify' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[IMMEDIATE-NOTIFICATIONS] Found ${participants.length} participants to notify`)

    // Check if we already sent an immediate message for this event
    const { data: existingMessages, error: existingError } = await supabaseClient
      .from('messages')
      .select('id')
      .eq('event_id', eventId)
      .eq('message_type', 'event')
      .eq('sender_id', event.host_id)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
      .limit(1);

    if (existingError) {
      console.error('[IMMEDIATE-NOTIFICATIONS] Error checking existing messages:', existingError);
    } else if (existingMessages && existingMessages.length > 0) {
      console.log('[IMMEDIATE-NOTIFICATIONS] Immediate message already sent recently for this event');
      return new Response(
        JSON.stringify({ message: 'Immediate message already sent recently' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create immediate group message content
    const timeUntil = hoursUntilEvent > 1 
      ? `${Math.round(hoursUntilEvent)} hours`
      : `${Math.round(hoursUntilEvent * 60)} minutes`

    const participantNames = participants.map(p => (p.profiles as any)?.name || 'Someone').join(', ');

    const groupMessageContent = `🚨 Activity confirmed! "${event.title}" is happening in ${timeUntil}!

👥 Who's attending: ${participantNames}

📍 Location: ${event.location || 'TBD'}
⏰ Time: ${event.time || 'See event details'}

✅ Quick checklist for everyone:
• Check the weather and dress appropriately
• Bring water and any personal items you might need
• Plan your route and arrive on time
• Bring your positive energy and smiles! 😊

👋 Let's introduce ourselves!
Since we're meeting soon, why not break the ice right here? Share a quick intro with everyone:
• What's your name and one fun fact about yourself?
• What are you most excited about for this activity?
• Any tips or experience you can share with the group?

Introductions make activities so much better - we'll feel like friends before we even meet! Plus, it helps everyone feel more comfortable and excited.

🎉 This activity is confirmed and happening soon! Can't wait to meet you all and have an amazing time together!

See you there! 🌟`

    // Send group message 
    try {
      const { error: messageError } = await supabaseClient
        .from('messages')
        .insert({
          sender_id: event.host_id, // Message comes from the host
          event_id: eventId,
          content: groupMessageContent,
          message_type: 'event',
          created_at: new Date().toISOString()
        })

      if (messageError) {
        console.error('[IMMEDIATE-NOTIFICATIONS] Failed to send group message:', messageError)
        return new Response(
          JSON.stringify({ error: 'Failed to send group message' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log(`[IMMEDIATE-NOTIFICATIONS] Sent immediate group message for event: ${event.title}`)

    } catch (error) {
      console.error('[IMMEDIATE-NOTIFICATIONS] Error sending group message:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to send group message' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent immediate group message for event: ${event.title}`,
        participantCount: participants.length,
        eventTitle: event.title,
        timeUntilEvent: timeUntil
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('[IMMEDIATE-NOTIFICATIONS] Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})