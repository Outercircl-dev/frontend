import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestEmailRequest {
  testEmail?: string;
  fromEmail?: string;
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
    const { 
      testEmail = 'test@outercircl.com', 
      fromEmail = 'notifications@outercircl.com' 
    }: TestEmailRequest = body;

    console.log(`Testing MailerSend domain verification with email: ${testEmail}`);

    const mailerSendApiKey = Deno.env.get('MAILERSEND_API_KEY');
    if (!mailerSendApiKey) {
      return new Response(
        JSON.stringify({ error: 'MailerSend API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // First, let's check domain verification status
    console.log('Checking domain verification status...');
    
    const domainResponse = await fetch('https://api.mailersend.com/v1/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mailerSendApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    let domainStatus = 'unknown';
    if (domainResponse.ok) {
      const domainData = await domainResponse.json();
      console.log('Domain verification status:', domainData);
      
      const outercirclDomain = domainData.data?.find((domain: any) => 
        domain.name === 'outercircl.com'
      );
      
      if (outercirclDomain) {
        domainStatus = outercirclDomain.domain_settings?.verification_status || 'unknown';
      }
    } else {
      console.error('Failed to check domain status:', await domainResponse.text());
    }

    // Test email content
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🧪 MailerSend Domain Test</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Domain Verification Test</h2>
          
          <p style="color: #333; line-height: 1.6;">
            This is a test email to verify that the outercircl.com domain is properly configured with MailerSend.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Test Details:</h3>
            <p style="color: #333; margin: 5px 0;"><strong>📧 From:</strong> ${fromEmail}</p>
            <p style="color: #333; margin: 5px 0;"><strong>📬 To:</strong> ${testEmail}</p>
            <p style="color: #333; margin: 5px 0;"><strong>📅 Date:</strong> ${new Date().toISOString()}</p>
            <p style="color: #333; margin: 5px 0;"><strong>🏷️ Domain Status:</strong> ${domainStatus}</p>
          </div>
          
          <p style="color: #333; line-height: 1.6;">
            If you're receiving this email, the domain configuration is working correctly!
          </p>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; border-left: 4px solid #28a745;">
            <p style="color: #155724; margin: 0;">
              ✅ Domain verification test completed successfully
            </p>
          </div>
          
          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #666; font-size: 14px; text-align: center;">
            <p>This is an automated test from OuterCircl</p>
            <p>outercircl.com</p>
          </div>
        </div>
      </div>
    `;

    const textContent = `
MailerSend Domain Verification Test

This is a test email to verify that the outercircl.com domain is properly configured with MailerSend.

Test Details:
- From: ${fromEmail}
- To: ${testEmail}
- Date: ${new Date().toISOString()}
- Domain Status: ${domainStatus}

If you're receiving this email, the domain configuration is working correctly!

This is an automated test from OuterCircl
outercircl.com
    `;

    // Send test email
    const emailData = {
      from: {
        email: fromEmail,
        name: 'OuterCircl Test'
      },
      to: [{
        email: testEmail,
        name: 'Domain Test Recipient'
      }],
      subject: '🧪 OuterCircl Domain Verification Test',
      html: htmlContent,
      text: textContent,
      tags: ['domain_test', 'verification']
    };

    console.log('Sending domain verification test email...');

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
        JSON.stringify({ 
          error: 'Failed to send test email',
          status: mailerSendResponse.status,
          details: errorData,
          domainStatus: domainStatus,
          recommendations: [
            'Verify domain in MailerSend dashboard',
            'Check DNS records for outercircl.com',
            'Ensure SPF, DKIM, and DMARC records are configured',
            'Wait up to 24 hours for DNS propagation'
          ]
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const responseData = await mailerSendResponse.json();
    console.log('Domain test email sent successfully:', responseData);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Domain verification test email sent successfully',
        messageId: responseData.message_id,
        domainStatus: domainStatus,
        testDetails: {
          from: fromEmail,
          to: testEmail,
          timestamp: new Date().toISOString()
        },
        nextSteps: domainStatus !== 'verified' ? [
          'Check your email for delivery',
          'Verify domain in MailerSend dashboard',
          'Configure DNS records if needed'
        ] : [
          'Domain is verified and ready to use',
          'Check your email for the test message'
        ]
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in test-mailersend-domain function:', error);
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