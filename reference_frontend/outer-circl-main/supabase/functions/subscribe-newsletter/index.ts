
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubscribeRequest {
  email: string;
  firstName: string;
  interests?: string[];
  frequency: 'daily' | 'weekly' | 'monthly';
  promotions: boolean;
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
    const { email, firstName, interests, frequency, promotions }: SubscribeRequest = await req.json();

    if (!email || !firstName) {
      return new Response(
        JSON.stringify({ error: 'Email and first name are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const mailerLiteApiKey = Deno.env.get('MAILERLITE_API_KEY');
    if (!mailerLiteApiKey) {
      console.error('MailerLite API key not configured');
      return new Response(
        JSON.stringify({ error: 'Newsletter service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get proxy configuration for static IP routing
    const proxyUrl = Deno.env.get('PROXY_URL'); // Optional proxy endpoint
    const proxyAuth = Deno.env.get('PROXY_AUTH'); // Optional proxy authentication

    // Subscribe to MailerLite
    const subscriberData = {
      email,
      fields: {
        name: firstName,
        interests: interests?.join(', ') || '',
        frequency: frequency,
        promotions: promotions ? 'yes' : 'no'
      }
    };

    console.log('Subscribing to MailerLite:', { email, firstName, frequency });
    console.log('Using proxy:', proxyUrl ? 'Yes' : 'No');

    // Prepare fetch options with proxy support
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mailerLiteApiKey}`,
        'Accept': 'application/json',
        // Add proxy auth header if configured
        ...(proxyAuth && { 'Proxy-Authorization': proxyAuth })
      },
      body: JSON.stringify(subscriberData)
    };

    // Use proxy URL if configured, otherwise direct connection
    const apiUrl = proxyUrl 
      ? `${proxyUrl}/https://connect.mailerlite.com/api/subscribers`
      : 'https://connect.mailerlite.com/api/subscribers';

    const response = await fetch(apiUrl, fetchOptions);

    const responseData = await response.json();

    if (!response.ok) {
      console.error('MailerLite API error:', responseData);
      
      // Handle specific MailerLite errors
      if (response.status === 422 && responseData.message?.includes('already exists')) {
        return new Response(
          JSON.stringify({ error: 'This email is already subscribed to our newsletter' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to subscribe to newsletter' }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Successfully subscribed to MailerLite:', responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Successfully subscribed to the buzz newsletter!',
        subscriber: responseData.data
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in subscribe-newsletter function:', error);
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
