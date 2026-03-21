-- Fix the cron jobs with proper JSON formatting

-- Remove existing jobs again
SELECT cron.unschedule('send-pre-event-reminders');
SELECT cron.unschedule('send-group-activity-messages-daily');

-- Create improved cron jobs with corrected JSON formatting
SELECT cron.schedule(
  'send-group-activity-messages-daily',
  '0 9,15 * * *', -- 9 AM and 3 PM daily
  $$
  SELECT
    net.http_post(
        url:='https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-group-activity-messages',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body:=jsonb_build_object('trigger', 'cron')
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
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('action', 'send_reminders')
    ) as request_id;
  $$
);