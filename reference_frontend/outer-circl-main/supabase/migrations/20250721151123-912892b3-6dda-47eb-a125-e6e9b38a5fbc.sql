-- Create table to track messages that users have deleted from their view
CREATE TABLE public.user_deleted_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure a user can only delete a message once
  UNIQUE(user_id, message_id)
);

-- Enable RLS
ALTER TABLE public.user_deleted_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can insert their own deleted messages" 
ON public.user_deleted_messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own deleted messages" 
ON public.user_deleted_messages 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create table to track conversations that users have deleted from their view
CREATE TABLE public.user_deleted_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id TEXT NOT NULL, -- Can be user_id for direct messages or event_id for event chats
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('direct', 'event')),
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure a user can only delete a conversation once
  UNIQUE(user_id, conversation_id, conversation_type)
);

-- Enable RLS
ALTER TABLE public.user_deleted_conversations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can insert their own deleted conversations" 
ON public.user_deleted_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own deleted conversations" 
ON public.user_deleted_conversations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deleted conversations" 
ON public.user_deleted_conversations 
FOR DELETE 
USING (auth.uid() = user_id);