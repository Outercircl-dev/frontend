import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId: string;
  subject: string;
  content: string;
  notificationType: string;
  eventId?: string;
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
    const { userId, subject, content, notificationType, eventId }: NotificationRequest = await req.json();

    if (!userId || !subject || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user profile and email from auth.users
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();

    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

    // Get event details if eventId is provided for better subject line
    let eventTitle = null;
    if (eventId) {
      const { data: eventData } = await supabase
        .from('events')
        .select('title')
        .eq('id', eventId)
        .single();
      eventTitle = eventData?.title;
    }

    if (profileError || !profile) {
      console.error('Failed to get user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (authError || !authUser?.user?.email) {
      console.error('Failed to get user email:', authError);
      return new Response(
        JSON.stringify({ error: 'User email not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user wants email notifications
    const { data: preferences } = await supabase
      .from('profile_privacy_settings')
      .select('email_notifications')
      .eq('user_id', userId)
      .single();

    if (preferences?.email_notifications === false) {
      console.log('User has disabled email notifications:', userId);
      return new Response(
        JSON.stringify({ message: 'Email notifications disabled for user' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const mailerSendApiKey = Deno.env.get('MAILERSEND_API_KEY');
    if (!mailerSendApiKey) {
      console.error('MailerSend API key not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Prepare email subject with activity name for event reminders
    let emailSubject = subject;
    if (notificationType === 'event_reminder' && eventTitle) {
      emailSubject = `REMINDER: ${eventTitle}`;
    }

    // Prepare email content based on notification type
    let htmlContent = content.replace(/\n/g, '<br>');
    
    // Add event-specific styling for event notifications
    if (notificationType.includes('event') || notificationType.includes('reminder')) {
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">${subject}</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              ${htmlContent}
            </div>
            ${eventId ? `
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://outercircl.com/event/${eventId}" 
                   style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  View Event Details
                </a>
              </div>
            ` : ''}
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #666; font-size: 14px; text-align: center;">
              <p>You're receiving this because you're part of the OuterCircl community.</p>
              <p>Update your notification preferences in your account settings.</p>
            </div>
          </div>
        </div>
      `;
    } else {
      // Simple styling for other notifications
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">${subject}</h2>
            <div style="color: #333; line-height: 1.6;">
              ${htmlContent}
            </div>
          </div>
        </div>
      `;
    }

    // Send email via MailerSend
    console.log('Sending email via MailerSend:', { email: authUser.user.email, subject: emailSubject });

    const emailData = {
      from: {
        email: 'notifications@outercircl.com',
        name: 'OuterCircl Notifications'
      },
      to: [{
        email: authUser.user.email,
        name: profile.name || authUser.user.email
      }],
      subject: emailSubject,
      html: htmlContent,
      text: content,
      tags: [notificationType, 'transactional']
    };

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
      console.error('MailerSend API error:', mailerSendResponse.status, errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email notification', details: errorData }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const responseData = await mailerSendResponse.json();
    console.log('Email sent successfully via MailerSend:', responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email notification sent successfully',
        messageId: responseData.message_id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in send-mailerlite-notification function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);