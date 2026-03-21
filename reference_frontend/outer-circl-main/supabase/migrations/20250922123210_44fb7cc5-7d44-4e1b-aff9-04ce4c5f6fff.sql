-- Fix search path for existing functions without changing parameters

-- Add secure search path to functions that don't have it yet
ALTER FUNCTION public.wants_email_notifications(uuid) SET search_path = '';
ALTER FUNCTION public.is_friends_with(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.is_event_host(uuid, uuid) SET search_path = '';  
ALTER FUNCTION public.is_event_participant(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.is_subscription_admin(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.is_subscription_member(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.can_view_profile(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.cleanup_unattended_saved_events() SET search_path = '';