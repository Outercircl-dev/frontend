
-- Create profile privacy settings table
CREATE TABLE public.profile_privacy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_visibility TEXT NOT NULL DEFAULT 'friends' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  allow_friend_requests BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create friendships table
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Create profile view permissions table
CREATE TABLE public.profile_view_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_owner_id, viewer_id),
  CHECK (profile_owner_id != viewer_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profile_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_view_permissions ENABLE ROW LEVEL SECURITY;

-- Profile privacy settings policies
CREATE POLICY "Users can view their own privacy settings" 
  ON public.profile_privacy_settings 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings" 
  ON public.profile_privacy_settings 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Friendships policies
CREATE POLICY "Users can view their own friendships" 
  ON public.friendships 
  FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendship requests" 
  ON public.friendships 
  FOR INSERT 
  WITH CHECK (auth.uid() = requested_by AND (auth.uid() = user_id OR auth.uid() = friend_id));

CREATE POLICY "Users can update friendships they're involved in" 
  ON public.friendships 
  FOR UPDATE 
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Profile view permissions policies
CREATE POLICY "Profile owners can manage view permissions" 
  ON public.profile_view_permissions 
  FOR ALL 
  USING (auth.uid() = profile_owner_id);

CREATE POLICY "Viewers can see their granted permissions" 
  ON public.profile_view_permissions 
  FOR SELECT 
  USING (auth.uid() = viewer_id);

-- Function to check if user can view another user's profile
CREATE OR REPLACE FUNCTION public.can_view_profile(profile_owner_id UUID, viewer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  privacy_setting TEXT;
  is_friend BOOLEAN := false;
  has_permission BOOLEAN := false;
BEGIN
  -- Profile owner can always view their own profile
  IF profile_owner_id = viewer_id THEN
    RETURN true;
  END IF;
  
  -- Get privacy setting
  SELECT profile_visibility INTO privacy_setting
  FROM public.profile_privacy_settings
  WHERE user_id = profile_owner_id;
  
  -- Default to friends if no setting exists
  IF privacy_setting IS NULL THEN
    privacy_setting := 'friends';
  END IF;
  
  -- If profile is public, allow access
  IF privacy_setting = 'public' THEN
    RETURN true;
  END IF;
  
  -- Check if they are friends
  SELECT EXISTS(
    SELECT 1 FROM public.friendships 
    WHERE ((user_id = profile_owner_id AND friend_id = viewer_id) 
           OR (user_id = viewer_id AND friend_id = profile_owner_id))
    AND status = 'accepted'
  ) INTO is_friend;
  
  -- If privacy is friends and they are friends, allow access
  IF privacy_setting = 'friends' AND is_friend THEN
    RETURN true;
  END IF;
  
  -- Check for explicit permission
  SELECT permission_granted INTO has_permission
  FROM public.profile_view_permissions
  WHERE profile_owner_id = can_view_profile.profile_owner_id 
    AND viewer_id = can_view_profile.viewer_id;
  
  RETURN COALESCE(has_permission, false);
END;
$$;

-- Add default privacy settings for existing users
INSERT INTO public.profile_privacy_settings (user_id, profile_visibility)
SELECT id, 'friends' 
FROM public.profiles 
WHERE id NOT IN (SELECT user_id FROM public.profile_privacy_settings);
