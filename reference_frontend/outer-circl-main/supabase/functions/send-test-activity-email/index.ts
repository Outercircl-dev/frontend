import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestEmailRequest {
  eventId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize Resend client
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Get the current user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Set the auth header for the supabase client
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { eventId }: TestEmailRequest = await req.json();

    // Target specific event ID - Morning Dip - Salthill
    const targetEventId = eventId || '13141d2c-26d6-462e-b3db-db153e5dbee2';

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', targetEventId)
      .single();

    if (eventError || !event) {
      console.error('Event fetch error:', eventError);
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all confirmed participants
    const { data: participants, error: participantsError } = await supabase
      .from('event_participants')
      .select(`
        user_id,
        profiles:profiles(name, email)
      `)
      .eq('event_id', targetEventId)
      .eq('status', 'attending');

    if (participantsError) {
      console.error('Participants fetch error:', participantsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch participants' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!participants || participants.length === 0) {
      return new Response(JSON.stringify({ error: 'No confirmed participants found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${participants.length} participants for test email`);

    // Prepare email content
    const subject = 'TEST: Morning Dip - Salthill - Tomorrow 9:30 AM';
    const eventUrl = `https://outercircl.com/event/${targetEventId}`;
    
    console.log(`Generated event URL: ${eventUrl}`);
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; margin-bottom: 20px;">🌅 Morning Dip - Salthill Tomorrow!</h2>
        
        <p>Hi there!</p>
        
        <p><strong>This is a test email for your upcoming activity:</strong></p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1e40af;">${event.title}</h3>
          <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${event.date}</p>
          <p style="margin: 5px 0;"><strong>⏰ Time:</strong> ${event.time || 'TBD'}</p>
          <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${event.location || 'TBD'}</p>
        </div>
        
        <p>Get ready for an invigorating start to your day! The morning dip at Salthill is going to be refreshing and energizing. 🏊‍♀️</p>
        
        <p><strong>What to bring:</strong></p>
        <ul>
          <li>Towel and swimwear</li>
          <li>Warm clothes for after</li>
          <li>Positive energy and excitement!</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${eventUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Activity Details
          </a>
        </div>
        
        <p>Looking forward to seeing you bright and early tomorrow! 🌅</p>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          <em>This is a test email. If you have any questions, please contact us through the app.</em>
        </p>
      </div>
    `;

    // Send emails to all participants
    const emailPromises = participants.map(async (participant: any) => {
      if (!participant.profiles?.email) {
        console.log(`Skipping participant ${participant.user_id} - no email found`);
        return null;
      }

      try {
        const emailResponse = await resend.emails.send({
          from: 'OuterCircl <noreply@outercircl.com>',
          to: [participant.profiles.email],
          subject: subject,
          html: emailContent,
        });

        console.log(`Email sent successfully to ${participant.profiles.email}:`, emailResponse);
        return emailResponse;
      } catch (error) {
        console.error(`Failed to send email to ${participant.profiles.email}:`, error);
        return { error: error instanceof Error ? error.message : String(error), email: participant.profiles.email };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(result => result && !result.error).length;
    const failed = results.filter(result => result && result.error).length;

    console.log(`Test email results: ${successful} successful, ${failed} failed`);

    return new Response(JSON.stringify({ 
      message: `Test emails sent to ${successful} participants`,
      successful,
      failed,
      eventTitle: event.title 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-test-activity-email function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);