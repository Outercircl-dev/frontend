-- First, let's fix the cron jobs with proper service role keys and schedules

-- Remove existing jobs
SELECT cron.unschedule('send-pre-event-reminders');
SELECT cron.unschedule('send-group-activity-messages-daily');

-- Create improved cron jobs with proper schedules
-- Send group activity messages twice daily (morning and afternoon to catch different time zones)
SELECT cron.schedule(
  'send-group-activity-messages-daily',
  '0 9,15 * * *', -- 9 AM and 3 PM daily
  $$
  SELECT
    net.http_post(
        url:='https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-group-activity-messages',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Send reminders every 2 hours to catch both 24h and 12h windows
SELECT cron.schedule(
  'send-pre-event-reminders',
  '0 */2 * * *', -- Every 2 hours
  $$
  SELECT
    net.http_post(
      url := 'https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body := '{"action": "send_reminders"}'::jsonb
    ) as request_id;
  $$
);