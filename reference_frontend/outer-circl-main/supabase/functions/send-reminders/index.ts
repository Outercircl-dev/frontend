import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Pre-event reminder process started at:', new Date().toISOString());

    // Call the database function to send pre-event reminders
    const { data, error } = await supabase.rpc('send_pre_event_reminders');

    if (error) {
      console.error('Error sending pre-event reminders:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send pre-event reminders',
          details: error.message 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const reminderCount = data || 0;
    console.log(`Pre-event reminders sent: ${reminderCount} notifications sent`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Pre-event reminders sent successfully`,
        remindersSent: reminderCount,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Unexpected error in send-reminders:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Unexpected error occurred',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);