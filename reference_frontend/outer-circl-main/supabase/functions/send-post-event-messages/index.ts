import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendPostEventMessagesRequest {
  eventId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize Resend for email notifications
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const { eventId }: SendPostEventMessagesRequest = await req.json();

    if (!eventId) {
      return new Response(JSON.stringify({ error: 'Event ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log('Processing post-event messages for event:', eventId);

    // Get event details
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('id, title, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('Error fetching event:', eventError);
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Only process completed events
    if (event.status !== 'completed') {
      return new Response(JSON.stringify({ error: 'Event must be completed to send post-event messages' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get all participants who attended the event
    const { data: participants, error: participantsError } = await supabaseClient
      .from('event_participants')
      .select(`
        user_id,
        profiles!inner(id, name, email)
      `)
      .eq('event_id', eventId)
      .eq('status', 'attending');

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      return new Response(JSON.stringify({ error: 'Error fetching participants' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!participants || participants.length < 2) {
      console.log('Not enough participants to send messages');
      return new Response(JSON.stringify({ message: 'Not enough participants to send messages' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log(`Found ${participants.length} participants`);

    let messagesSent = 0;
    let emailsSent = 0;

    // Send direct messages and emails to each participant about rating others
    for (const participant of participants) {
      const otherParticipants = participants.filter(p => p.user_id !== participant.user_id);
      
      if (otherParticipants.length === 0) continue;

      const otherNames = otherParticipants.map(p => (p.profiles as any)?.name || 'Anonymous').join(', ');
      const participantProfile = participant.profiles as any;
      
      const messageContent = `Hi! 🌟 Thanks for attending "${event.title}"! 

How was your experience with the other participants? You can now rate ${otherNames} to help build our community's reliability system.

Rating your fellow participants is optional but helps everyone find trustworthy activity buddies. Simply reply with ratings (1-5 stars) for each person, or just let us know how it went!

Hope you had a great time! 🎉`;

      // Insert direct message
      const { error: messageError } = await supabaseClient
        .from('messages')
        .insert({
          sender_id: '00000000-0000-0000-0000-000000000000', // System sender
          recipient_id: participant.user_id,
          event_id: eventId,
          content: messageContent,
          message_type: 'post_event_rating',
          created_at: new Date().toISOString()
        });

      if (messageError) {
        console.error('Error sending message to participant:', participant.user_id, messageError);
      } else {
        messagesSent++;
        console.log('Message sent to participant:', participant.user_id);
      }

      // Send email notification if user has email
      if (participantProfile?.email) {
        try {
          const websiteUrl = 'https://bommnpdpzmvqufurwwik.lovable.app';
          const ratingUrl = `${websiteUrl}/notifications?highlight=rating&event=${eventId}`;
          
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Rate Activity Participants - OuterCircl</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">OuterCircl</h1>
                  <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Rate Activity Participants</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px;">
                  <h2 style="color: #1a202c; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Thanks for attending "${event.title}"! 🌟</h2>
                  
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    How was your experience with the other participants? You can now rate <strong>${otherNames}</strong> to help build our community's reliability system.
                  </p>
                  
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                    Rating your fellow participants is optional but helps everyone find trustworthy activity buddies and creates a better community experience for all.
                  </p>
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${ratingUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                      Rate Activity Participants
                    </a>
                  </div>
                  
                  <div style="background-color: #f7fafc; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                    <p style="color: #4a5568; font-size: 14px; line-height: 1.5; margin: 0;">
                      <strong>Why rate participants?</strong><br>
                      • Helps build trust in our community<br>
                      • Makes it easier to find reliable activity partners<br>
                      • Improves the overall experience for everyone
                    </p>
                  </div>
                  
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
                    Hope you had a great time! We look forward to seeing you at more activities. 🎉
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f7fafc; padding: 30px 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="color: #718096; font-size: 14px; margin: 0 0 10px 0;">
                    You're receiving this because you attended an OuterCircl activity.
                  </p>
                  <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                    OuterCircl - Building meaningful connections through shared activities
                  </p>
                </div>
              </div>
            </body>
            </html>
          `;

          const emailResponse = await resend.emails.send({
            from: 'OuterCircl Activities <activities@outercircl.com>',
            to: [participantProfile.email],
            subject: `Rate Activity Participants - ${event.title}`,
            html: emailHtml,
            text: `Thanks for attending "${event.title}"! 

Rate your fellow participants: ${otherNames}

Visit ${ratingUrl} to rate participants and help build our community's reliability system.

Hope you had a great time!
- OuterCircl Team`
          });

          if (emailResponse.error) {
            console.error('Error sending email to participant:', participant.user_id, emailResponse.error);
          } else {
            emailsSent++;
            console.log('Email sent to participant:', participant.user_id, participantProfile.email);
          }
        } catch (emailError) {
          console.error('Error sending email to participant:', participant.user_id, emailError);
        }
      }
    }

    console.log(`Successfully sent ${messagesSent} post-event messages and ${emailsSent} emails`);

    return new Response(JSON.stringify({ 
      success: true, 
      messagesSent,
      emailsSent,
      eventId 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in send-post-event-messages function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);