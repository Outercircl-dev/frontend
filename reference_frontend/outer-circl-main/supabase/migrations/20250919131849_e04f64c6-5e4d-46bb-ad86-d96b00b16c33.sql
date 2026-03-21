-- Create table for tracking user-deleted notifications
CREATE TABLE IF NOT EXISTS public.user_deleted_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_id UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_deleted_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own deleted notifications" 
ON public.user_deleted_notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own deleted notifications" 
ON public.user_deleted_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Prevent updates and deletes to maintain audit trail
CREATE POLICY "No updates allowed" 
ON public.user_deleted_notifications 
FOR UPDATE 
USING (false);

CREATE POLICY "No deletes allowed" 
ON public.user_deleted_notifications 
FOR DELETE 
USING (false);

-- Add archive column to notifications table for soft archiving
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_deleted_notifications_user_id 
ON public.user_deleted_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_user_deleted_notifications_notification_id 
ON public.user_deleted_notifications(notification_id);

CREATE INDEX IF NOT EXISTS idx_notifications_archived_at 
ON public.notifications(archived_at) WHERE archived_at IS NOT NULL;