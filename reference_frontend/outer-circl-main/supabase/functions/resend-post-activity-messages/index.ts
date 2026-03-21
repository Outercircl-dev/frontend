import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendRequest {
  targetDate?: string; // YYYY-MM-DD format, defaults to '2025-09-19'
  dryRun?: boolean;    // If true, only logs what would be sent
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { targetDate = '2025-09-19', dryRun = false }: ResendRequest = body;

    console.log(`Starting post-activity message resend for date: ${targetDate}, dryRun: ${dryRun}`);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all events from the target date with confirmed participants
    const { data: eventParticipants, error: queryError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        date,
        time,
        location,
        event_participants!inner (
          user_id,
          status,
          profiles:user_id (
            name,
            id
          )
        )
      `)
      .eq('date', targetDate)
      .in('event_participants.status', ['confirmed', 'attending']);

    if (queryError) {
      console.error('Error fetching events:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch events', details: queryError }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!eventParticipants || eventParticipants.length === 0) {
      console.log(`No events found for date ${targetDate} with confirmed/attending participants`);
      return new Response(
        JSON.stringify({ 
          message: `No events found for ${targetDate} with confirmed/attending participants`,
          eventsProcessed: 0,
          emailsSent: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const mailerSendApiKey = Deno.env.get('MAILERSEND_API_KEY');
    if (!mailerSendApiKey && !dryRun) {
      console.error('MailerSend API key not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let totalEmailsSent = 0;
    let totalErrors = 0;
    const processedEvents = new Set();
    const errors: string[] = [];

    // Process each event and its participants
    for (const event of eventParticipants) {
      processedEvents.add(event.id);
      console.log(`Processing event: ${event.title} (${event.id})`);

      // Get all participants for this event
      const participants = Array.isArray(event.event_participants) 
        ? event.event_participants 
        : [event.event_participants];

      for (const participant of participants) {
        try {
          // Get user email from auth.users
          const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(participant.user_id);
          
          if (authError || !authUser?.user?.email) {
            console.error(`Failed to get email for user ${participant.user_id}:`, authError);
            errors.push(`No email found for user ${participant.user_id}`);
            totalErrors++;
            continue;
          }

          // Check if user wants email notifications
          const { data: preferences } = await supabase
            .from('profile_privacy_settings')
            .select('email_notifications')
            .eq('user_id', participant.user_id)
            .single();

          if (preferences?.email_notifications === false) {
            console.log(`User ${participant.user_id} has disabled email notifications`);
            continue;
          }

          // Prepare post-activity message content
          const participantName = (participant.profiles as any)?.name || authUser?.user?.email || 'Unknown User';
          const subject = `Thank you for joining: ${event.title}`;
          
          const content = `Hi ${participantName},

Thank you for participating in "${event.title}" on ${event.date}!

We hope you had a great time and made some new connections. Your participation helps make the OuterCircl community vibrant and exciting.

Here are a few ways to stay engaged:
• Share your experience and photos with the community
• Connect with other participants you met
• Explore upcoming activities that might interest you
• Consider hosting your own activity

Event Details:
📅 ${event.date} at ${event.time}
📍 ${event.location}
📝 ${event.description}

Thank you for being part of OuterCircl!

Best regards,
The OuterCircl Team`;

          const htmlContent = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Thanks for joining us! 🎉</h1>
              </div>
              <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hi ${participantName},</p>
                
                <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
                  Thank you for participating in <strong>"${event.title}"</strong> on ${event.date}!
                </p>
                
                <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
                  We hope you had a great time and made some new connections. Your participation helps make the OuterCircl community vibrant and exciting.
                </p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                  <h3 style="color: #333; margin-top: 0;">Event Details:</h3>
                  <p style="color: #333; margin: 5px 0;"><strong>📅 Date:</strong> ${event.date} at ${event.time}</p>
                  <p style="color: #333; margin: 5px 0;"><strong>📍 Location:</strong> ${event.location}</p>
                  <p style="color: #333; margin: 5px 0;"><strong>📝 Description:</strong> ${event.description}</p>
                </div>
                
                <h3 style="color: #333;">Stay engaged with OuterCircl:</h3>
                <ul style="color: #333; line-height: 1.6;">
                  <li>Share your experience and photos with the community</li>
                  <li>Connect with other participants you met</li>
                  <li>Explore upcoming activities that might interest you</li>
                  <li>Consider hosting your own activity</li>
                </ul>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://outercircl.com/dashboard" 
                     style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                    Explore More Activities
                  </a>
                </div>
                
                <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #666; font-size: 14px; text-align: center;">
                  <p>Thank you for being part of OuterCircl!</p>
                  <p>The OuterCircl Team</p>
                </div>
              </div>
            </div>
          `;

          if (dryRun) {
            console.log(`[DRY RUN] Would send post-activity email to: ${authUser.user.email}`);
            console.log(`[DRY RUN] Subject: ${subject}`);
            totalEmailsSent++;
            continue;
          }

          // Send email via MailerSend
          const emailData = {
            from: {
              email: 'notifications@outercircl.com',
              name: 'OuterCircl Team'
            },
            to: [{
              email: authUser.user.email,
              name: participantName
            }],
            subject: subject,
            html: htmlContent,
            text: content,
            tags: ['post_activity', 'resend_test', targetDate]
          };

          console.log(`Sending post-activity email to: ${authUser.user.email}`);

          const mailerSendResponse = await fetch('https://api.mailersend.com/v1/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mailerSendApiKey}`,
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(emailData)
          });

          if (!mailerSendResponse.ok) {
            const errorData = await mailerSendResponse.text();
            console.error(`MailerSend API error for ${authUser.user.email}:`, mailerSendResponse.status, errorData);
            errors.push(`Failed to send to ${authUser.user.email}: ${errorData}`);
            totalErrors++;
          } else {
            const responseData = await mailerSendResponse.json();
            console.log(`Email sent successfully to ${authUser.user.email}:`, responseData.message_id);
            totalEmailsSent++;
          }

          // Add delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Error processing participant ${participant.user_id}:`, error);
          errors.push(`Error processing user ${participant.user_id}: ${error instanceof Error ? error.message : String(error)}`);
          totalErrors++;
        }
      }
    }

    const summary = {
      success: true,
      targetDate,
      dryRun,
      eventsProcessed: processedEvents.size,
      emailsSent: totalEmailsSent,
      errors: totalErrors,
      errorMessages: errors.slice(0, 10), // Limit error messages to avoid huge responses
      message: dryRun 
        ? `Dry run completed for ${targetDate}` 
        : `Post-activity messages resent for ${targetDate}`
    };

    console.log('Resend operation completed:', summary);

    return new Response(
      JSON.stringify(summary),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in resend-post-activity-messages function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);