import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  userId: string;
  title: string;
  content: string;
  notificationType: 'event' | 'message' | 'friend_request' | 'general';
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, title, content, notificationType, metadata }: NotificationRequest = await req.json()

    // Check user's notification preferences
    const { data: settings } = await supabase
      .from('profile_privacy_settings')
      .select('push_notifications, email_notifications, event_messages')
      .eq('user_id', userId)
      .single()

    // Determine if notification should be sent based on type and preferences
    let shouldSend = false;
    
    if (settings) {
      switch (notificationType) {
        case 'event':
          shouldSend = settings.event_messages && settings.push_notifications;
          break;
        case 'message':
        case 'friend_request':
          shouldSend = settings.push_notifications;
          break;
        default:
          shouldSend = settings.push_notifications;
      }
    } else {
      // Default to sending if no preferences found
      shouldSend = true;
    }

    if (!shouldSend) {
      return new Response(
        JSON.stringify({ message: 'Notification blocked by user preferences' }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    }

    // Insert notification into database
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        content,
        notification_type: notificationType,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification,
        message: 'Notification sent successfully' 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )

  } catch (error) {
    console.error('Error sending notification:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )
  }
})