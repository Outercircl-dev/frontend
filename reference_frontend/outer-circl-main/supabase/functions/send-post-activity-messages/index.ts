import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PostActivityRequest {
  eventId: string;
  messageType?: 'reliability_rating' | 'feedback' | 'thank_you';
}

interface Participant {
  user_id: string;
  email: string;
  name: string;
}

interface EventDetails {
  id: string;
  title: string;
  date: string;
  location: string;
  host_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('🚀 send-post-activity-messages function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mailersendApiKey = Deno.env.get('MAILERSEND_API_KEY')!;

    if (!mailersendApiKey) {
      throw new Error('MailerSend API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { eventId, messageType = 'reliability_rating' }: PostActivityRequest = await req.json();
    console.log(`📧 Processing ${messageType} messages for event: ${eventId}`);

    // Get event details
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        date,
        location,
        host_id
      `)
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      console.error('❌ Event not found:', eventError);
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get host profile separately
    const { data: hostProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', eventData.host_id)
      .single();

    const eventDetails: EventDetails = {
      id: eventData.id,
      title: eventData.title,
      date: eventData.date,
      location: eventData.location || 'TBD',
      host_name: hostProfile?.name || 'Event Host'
    };

    // Get all participants with their profile data
    const { data: participantsData, error: participantsError } = await supabase
      .from('event_participants')
      .select(`
        user_id
      `)
      .eq('event_id', eventId)
      .eq('status', 'attending');

    if (participantsError) {
      console.error('❌ Error fetching participants:', participantsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch participants' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!participantsData || participantsData.length === 0) {
      console.log('⚠️ No participants found for event');
      return new Response(
        JSON.stringify({ message: 'No participants found', sent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`📊 Found ${participantsData.length} participants`);

    // Get participant details separately to avoid foreign key issues
    const participants: Participant[] = [];
    
    for (const participant of participantsData) {
      try {
        // Get profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', participant.user_id)
          .single();

        // Get email from sensitive profiles
        const { data: sensitiveProfile } = await supabase
          .from('profiles_sensitive')
          .select('email')
          .eq('id', participant.user_id)
          .single();

        if (sensitiveProfile?.email && profile?.name) {
          participants.push({
            user_id: participant.user_id,
            email: sensitiveProfile.email,
            name: profile.name
          });
        }
      } catch (error) {
        console.warn(`⚠️ Could not get details for participant ${participant.user_id}:`, error);
      }
    }

    console.log(`📊 Found ${participants.length} participants with email addresses`);

    // Send emails using MailerSend
    const emailPromises = participants.map(async (participant) => {
      try {
        const emailContent = generateEmailContent(messageType, participant, eventDetails);
        
        const response = await fetch('https://api.mailersend.com/v1/email', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mailersendApiKey}`,
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({
            from: {
              email: 'noreply@outercircl.com',
              name: 'outercircl'
            },
            to: [{
              email: participant.email,
              name: participant.name
            }],
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            tags: ['post-activity', messageType, 'transactional']
          })
        });

        if (!response.ok) {
          let errorData = {};
          try {
            const errorText = await response.text();
            if (errorText.trim()) {
              errorData = JSON.parse(errorText);
            }
          } catch (parseError) {
            console.warn(`⚠️ Could not parse MailerSend error response for ${participant.email}:`, parseError);
            errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
          }
          
          console.error(`❌ MailerSend error for ${participant.email}:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          throw new Error(`MailerSend API error: ${response.status}`);
        }

        console.log(`✅ Email sent successfully to ${participant.email}`);
        return { success: true, email: participant.email };
      } catch (error) {
        console.error(`❌ Failed to send email to ${participant.email}:`, error);
        return { success: false, email: participant.email, error: error instanceof Error ? error.message : String(error) };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    console.log(`📈 Email sending completed: ${successful}/${results.length} successful`);

    if (failed.length > 0) {
      console.error('❌ Failed emails:', failed);
    }

    // Create notifications for participants who successfully received emails
    if (successful > 0) {
      try {
        const successfulParticipants = participants.filter(participant => 
          results.some(r => r.success && r.email === participant.email)
        );
        
        if (successfulParticipants.length > 0) {
          const notifications = successfulParticipants.map(participant => ({
            user_id: participant.user_id,
            title: 'Rate event participants',
            content: `Please rate your fellow participants from "${eventDetails.title}" to help build community trust.`,
            notification_type: 'rating_request',
            metadata: {
              event_id: eventId,
              event_title: eventDetails.title
            }
          }));
          
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert(notifications);
            
          if (notificationError) {
            console.error('❌ Error creating notifications:', notificationError);
          } else {
            console.log(`✅ Created ${notifications.length} notifications for rating requests`);
          }
        }
      } catch (notificationError) {
        console.error('❌ Error creating notifications:', notificationError);
        // Don't fail the function if notification creation fails
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Post-activity messages processed',
        event: eventDetails,
        sent: successful,
        failed: failed.length,
        failures: failed.map(f => ({ email: f.email, error: f.error }))
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('❌ Error in send-post-activity-messages:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

function generateEmailContent(
  messageType: string,
  participant: Participant,
  event: EventDetails
) {
  const baseUrl = 'https://outercircl.com';
  
  switch (messageType) {
    case 'reliability_rating':
      return {
        subject: `Rate your experience - ${event.title}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; color: white; margin-bottom: 30px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600;">How was your activity?</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">We'd love to hear about your experience!</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hi ${participant.name},</p>
              
              <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
                Thanks for joining <strong>${event.title}</strong> on ${new Date(event.date).toLocaleDateString()}! 
                We hope you had a great time.
              </p>
              
              <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 30px;">
                To help build trust in our community, please take a moment to rate your fellow participants. 
                Your feedback helps others know who they can count on for future activities.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/event/${event.id}?action=rate" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                  Rate Participants
                </a>
              </div>
              
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 18px;">Activity Details:</h3>
                <p style="margin: 5px 0; color: #6b7280;"><strong>Event:</strong> ${event.title}</p>
                <p style="margin: 5px 0; color: #6b7280;"><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                <p style="margin: 5px 0; color: #6b7280;"><strong>Location:</strong> ${event.location}</p>
                <p style="margin: 5px 0; color: #6b7280;"><strong>Hosted by:</strong> ${event.host_name}</p>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                Rating is anonymous and helps maintain the quality of our community. 
                Thank you for being part of outercircl!
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 14px; color: #9ca3af; margin: 0;">
                This is a transactional email from outercircl. 
                <a href="${baseUrl}/unsubscribe" style="color: #667eea;">Manage preferences</a>
              </p>
            </div>
          </div>
        `,
        text: `Hi ${participant.name},

Thanks for joining ${event.title} on ${new Date(event.date).toLocaleDateString()}!

Please take a moment to rate your fellow participants to help build trust in our community.

Visit: ${baseUrl}/event/${event.id}?action=rate

Activity Details:
- Event: ${event.title}
- Date: ${new Date(event.date).toLocaleDateString()}
- Location: ${event.location}
- Hosted by: ${event.host_name}

Thank you for being part of outercircl!
        `
      };
      
    default:
      return {
        subject: `Thank you for joining ${event.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Thank you for participating!</h2>
            <p>Hi ${participant.name},</p>
            <p>Thank you for joining ${event.title}. We hope you had a great experience!</p>
          </div>
        `,
        text: `Hi ${participant.name}, Thank you for joining ${event.title}. We hope you had a great experience!`
      };
  }
}

serve(handler);