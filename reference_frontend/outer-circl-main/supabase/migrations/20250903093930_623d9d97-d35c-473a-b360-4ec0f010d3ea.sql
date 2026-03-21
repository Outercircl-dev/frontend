-- First, let's see all triggers on the events table
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'events' 
AND event_object_schema = 'public';

-- Also check what functions might have event_id references
SELECT routine_name, routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_definition ILIKE '%event_id%'
AND routine_name NOT IN ('can_view_event_details', 'check_user_rating_status', 'is_event_owner', 'leave_event')
ORDER BY routine_name;