-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job to send group activity messages daily at 10 AM
SELECT cron.schedule(
  'send-group-activity-messages-daily',
  '0 10 * * *', -- Every day at 10:00 AM
  $$
  SELECT
    net.http_post(
        url:='https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-group-activity-messages',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);