-- Create function to notify users about new messages
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_name TEXT;
  conversation_id TEXT;
BEGIN
  -- Get sender name
  SELECT name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Create conversation identifier based on message type
  IF NEW.message_type = 'direct' THEN
    conversation_id := NEW.sender_id || '_' || NEW.recipient_id;
  ELSE
    conversation_id := NEW.event_id::text;
  END IF;

  -- Notify the recipient (if not the sender)
  IF NEW.recipient_id IS NOT NULL AND NEW.recipient_id != NEW.sender_id THEN
    INSERT INTO public.notifications (
      user_id, 
      title, 
      content, 
      notification_type,
      -- Store additional data as JSONB in a metadata column we'll add
      created_at
    )
    VALUES (
      NEW.recipient_id,
      'New Message',
      COALESCE(sender_name, 'Someone') || ' sent you a message',
      'message',
      NEW.created_at
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS notify_new_message ON public.messages;
CREATE TRIGGER notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

-- Add metadata column to notifications table to store additional data like message_id, event_id, etc.
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Update existing function to include metadata for message notifications
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Get sender name
  SELECT name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Notify the recipient (if not the sender and recipient exists)
  IF NEW.recipient_id IS NOT NULL AND NEW.recipient_id != NEW.sender_id THEN
    INSERT INTO public.notifications (
      user_id, 
      title, 
      content, 
      notification_type,
      metadata,
      created_at
    )
    VALUES (
      NEW.recipient_id,
      'New Message',
      COALESCE(sender_name, 'Someone') || ' sent you a message',
      'message',
      jsonb_build_object(
        'message_id', NEW.id,
        'sender_id', NEW.sender_id,
        'message_type', NEW.message_type,
        'event_id', NEW.event_id
      ),
      NEW.created_at
    );
  END IF;

  RETURN NEW;
END;
$$;