import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  console.log('🧪 test-mailersend-simple function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mailersendApiKey = Deno.env.get('MAILERSEND_API_KEY');

    if (!mailersendApiKey) {
      throw new Error('MailerSend API key not configured');
    }

    const { testEmail = 'christie.lau7@gmail.com' } = await req.json();
    console.log(`📧 Testing MailerSend with email: ${testEmail}`);

    // Test different sender domains to find which one works
  const testDomains = [
    'noreply@outercircl.com',
    'hello@outercircl.com', 
    'support@outercircl.com',
    'notifications@outercircl.com'
  ];

  const results = [];

  for (const senderEmail of testDomains) {
    try {
      console.log(`🔄 Testing sender domain: ${senderEmail}`);
      
      const response = await fetch('https://api.mailersend.com/v1/email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mailersendApiKey}`,
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          from: {
            email: senderEmail,
            name: 'outercircl Test'
          },
          to: [{
            email: testEmail,
            name: 'Test Recipient'
          }],
          subject: `Test Email from ${senderEmail}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>MailerSend Domain Test</h2>
              <p>This is a test email from <strong>${senderEmail}</strong></p>
              <p>If you receive this, the domain is working correctly!</p>
              <p>Test time: ${new Date().toISOString()}</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="https://outercircl.com/event/10cde423-a455-4a06-846a-ddd09ece9331?action=rate" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                  Test Rating Link
                </a>
              </div>
            </div>
          `,
          text: `MailerSend Domain Test - This is a test email from ${senderEmail}. Test time: ${new Date().toISOString()}. Test rating link: https://outercircl.com/event/10cde423-a455-4a06-846a-ddd09ece9331?action=rate`,
          tags: ['domain-test', 'transactional']
        })
      });

        if (response.ok) {
          let responseData = {};
          try {
            const responseText = await response.text();
            if (responseText.trim()) {
              responseData = JSON.parse(responseText);
            }
          } catch (parseError) {
            console.warn(`⚠️ Could not parse success response for ${senderEmail}:`, parseError);
          }
          
          console.log(`✅ Success with ${senderEmail}:`, responseData);
          results.push({
            sender: senderEmail,
            status: 'success',
            response: responseData
          });
        } else {
          let errorData = {};
          try {
            const errorText = await response.text();
            if (errorText.trim()) {
              errorData = JSON.parse(errorText);
            }
          } catch (parseError) {
            console.warn(`⚠️ Could not parse error response for ${senderEmail}:`, parseError);
            errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
          }
          
          console.error(`❌ Failed with ${senderEmail}:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          results.push({
            sender: senderEmail,
            status: 'failed',
            error: {
              status: response.status,
              statusText: response.statusText,
              details: errorData
            }
          });
        }

        // Increased delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Exception with ${senderEmail}:`, error);
        results.push({
          sender: senderEmail,
          status: 'exception',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Also test MailerSend API connectivity
    console.log('🔗 Testing MailerSend API connectivity...');
    try {
      const apiTestResponse = await fetch('https://api.mailersend.com/v1/domains', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mailersendApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      let domainInfo = null;
      if (apiTestResponse.ok) {
        domainInfo = await apiTestResponse.json();
        console.log('✅ API connectivity successful, domains:', domainInfo);
      } else {
        const errorData = await apiTestResponse.json().catch(() => ({}));
        console.error('❌ API connectivity failed:', errorData);
      }

      return new Response(
        JSON.stringify({
          message: 'MailerSend domain test completed',
          testEmail,
          results,
          apiConnectivity: apiTestResponse.ok ? 'success' : 'failed',
          domainInfo: domainInfo,
          recommendation: getRecommendation(results)
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );

    } catch (apiError) {
      console.error('❌ API test exception:', apiError);
      
      return new Response(
        JSON.stringify({
          message: 'MailerSend domain test completed',
          testEmail,
          results,
          apiConnectivity: 'exception',
          apiError: apiError instanceof Error ? apiError.message : String(apiError),
          recommendation: getRecommendation(results)
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

  } catch (error: any) {
    console.error('❌ Error in test-mailersend-simple:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

function getRecommendation(results: any[]): string {
  const successful = results.filter(r => r.status === 'success');
  
  if (successful.length > 0) {
    return `Use ${successful[0].sender} as your sender email - it's verified and working!`;
  }
  
  // Check for trial account limitations first
  const trialErrors = results.filter(r => 
    r.error?.details?.message?.includes('Trial accounts can only send emails to the administrator\'s email') ||
    r.error?.details?.message?.includes('#MS42225')
  );
  
  if (trialErrors.length > 0) {
    return 'TRIAL ACCOUNT LIMITATION: Your MailerSend account can only send emails to the administrator\'s email address. To send to other recipients, upgrade your MailerSend plan or test with the administrator\'s email address.';
  }
  
  const errorCodes = results
    .filter(r => r.error?.status)
    .map(r => r.error.status)
    .filter((v, i, a) => a.indexOf(v) === i);
  
  if (errorCodes.includes(429)) {
    return 'Rate limit exceeded (429). Please wait a moment before testing again. Consider upgrading your MailerSend plan for higher rate limits.';
  }
    
  if (errorCodes.includes(422)) {
    return 'Error 422 suggests domain not verified or request format issue. Check MailerSend dashboard for domain verification status.';
  }
  
  if (errorCodes.includes(401)) {
    return 'Error 401 suggests invalid API key. Check your MailerSend API key configuration in Supabase secrets.';
  }
  
  // Check for parsing errors (likely rate limiting or other issues)
  const exceptions = results.filter(r => r.status === 'exception');
  if (exceptions.length > 0) {
    return 'Network or parsing errors occurred. This may be due to rate limiting or connectivity issues. Try again in a few minutes.';
  }
  
  return 'All domains failed. Check MailerSend dashboard for domain verification and API key validity.';
}

serve(handler);