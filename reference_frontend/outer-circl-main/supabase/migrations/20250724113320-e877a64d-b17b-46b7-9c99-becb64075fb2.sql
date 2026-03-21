-- Send a test notification for rating requests
INSERT INTO public.notifications (
  user_id, 
  title, 
  content, 
  notification_type,
  metadata
)
VALUES (
  'b0c72031-4c30-4d56-ad4d-9a595d1a64cf', -- Dave's user ID
  'New Rating Request',
  'Someone has submitted a reliability rating for you after the "Salthill Morning Dip" activity. Your updated rating is now visible on your profile!',
  'rating_received',
  jsonb_build_object(
    'event_id', '200abd3a-15b5-4d4e-b67e-66f91dfd22a3',
    'event_title', 'Salthill Morning Dip',
    'new_rating', 5.0,
    'action_required', false
  )
);