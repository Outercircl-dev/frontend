-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Test the group activity messages function manually
SELECT
  net.http_post(
      url:='https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-group-activity-messages',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body:=jsonb_build_object('trigger', 'manual_test')
  ) as request_id;