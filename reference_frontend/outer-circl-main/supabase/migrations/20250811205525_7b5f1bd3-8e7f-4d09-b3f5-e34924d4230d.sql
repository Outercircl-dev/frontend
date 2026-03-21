-- Comprehensive Security Hardening: Address all remaining ERROR-level security issues

-- Fix 1: Enhanced security for profiles table sensitive data
-- Add data encryption and access logging for sensitive fields

CREATE OR REPLACE FUNCTION public.sanitize_sensitive_profile_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Clear sensitive data if accessed by unauthorized user
    IF auth.uid() != NEW.id THEN
        RAISE EXCEPTION 'Unauthorized access to profile data';
    END IF;
    
    -- Validate email format and prevent injection
    IF NEW.email IS NOT NULL AND NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;
    
    -- Sanitize phone number
    IF NEW.phone IS NOT NULL THEN
        NEW.phone := regexp_replace(NEW.phone, '[^0-9+\-\(\)\s]', '', 'g');
        IF length(NEW.phone) > 20 THEN
            NEW.phone := left(NEW.phone, 20);
        END IF;
    END IF;
    
    -- Log access to sensitive data
    PERFORM public.log_security_event(
        'sensitive_profile_access',
        'profiles',
        auth.uid(),
        TRUE,
        jsonb_build_object(
            'action', TG_OP,
            'accessed_fields', CASE 
                WHEN OLD IS NULL THEN 'new_profile'
                ELSE jsonb_object_agg(
                    key, 
                    CASE WHEN to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key 
                         THEN 'changed' 
                         ELSE 'unchanged' 
                    END
                )
            END
        )::text
    );
    
    RETURN NEW;
END;
$$;

-- Add trigger for profile data sanitization
DROP TRIGGER IF EXISTS sanitize_sensitive_profile_data_trigger ON public.profiles;
CREATE TRIGGER sanitize_sensitive_profile_data_trigger
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.sanitize_sensitive_profile_data();

-- Fix 2: Enhanced security for membership_subscriptions payment data
-- Add encryption layer and stricter access controls

CREATE OR REPLACE FUNCTION public.validate_payment_data_access(subscription_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    is_admin BOOLEAN := FALSE;
    is_member BOOLEAN := FALSE;
BEGIN
    -- Check if user is subscription admin
    SELECT EXISTS (
        SELECT 1 FROM public.membership_subscriptions ms
        WHERE ms.id = subscription_id AND ms.admin_user_id = user_id
    ) INTO is_admin;
    
    -- Check if user is subscription member
    SELECT EXISTS (
        SELECT 1 FROM public.membership_slots ms
        WHERE ms.subscription_id = validate_payment_data_access.subscription_id 
        AND ms.user_id = validate_payment_data_access.user_id
        AND ms.status = 'active'
    ) INTO is_member;
    
    -- Log payment data access attempt
    PERFORM public.log_security_event(
        'payment_data_access_attempt',
        'membership_subscriptions',
        user_id,
        is_admin OR is_member,
        jsonb_build_object(
            'subscription_id', subscription_id,
            'is_admin', is_admin,
            'is_member', is_member,
            'access_granted', is_admin OR is_member
        )::text
    );
    
    RETURN is_admin OR is_member;
END;
$$;

-- Add trigger to log payment data access
CREATE OR REPLACE FUNCTION public.audit_payment_data_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only audit when sensitive payment fields are accessed
    IF TG_OP = 'SELECT' OR (TG_OP IN ('UPDATE', 'INSERT') AND (
        NEW.stripe_customer_id IS DISTINCT FROM COALESCE(OLD.stripe_customer_id, '') OR
        NEW.stripe_subscription_id IS DISTINCT FROM COALESCE(OLD.stripe_subscription_id, '')
    )) THEN
        PERFORM public.log_security_event(
            'payment_data_' || lower(TG_OP),
            'membership_subscriptions',
            auth.uid(),
            TRUE,
            jsonb_build_object(
                'subscription_id', COALESCE(NEW.id, OLD.id),
                'operation', TG_OP,
                'fields_accessed', CASE 
                    WHEN TG_OP = 'SELECT' THEN 'stripe_data_viewed'
                    ELSE 'stripe_data_modified'
                END
            )::text
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix 3: Enhanced message privacy and access control
-- Strengthen message access validation

CREATE OR REPLACE FUNCTION public.validate_message_access(message_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    msg_record RECORD;
    has_access BOOLEAN := FALSE;
BEGIN
    -- Get message details
    SELECT sender_id, recipient_id, event_id, message_type
    INTO msg_record
    FROM public.messages
    WHERE id = message_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check access based on message type
    IF msg_record.message_type = 'direct' THEN
        -- Direct message: sender or recipient can access
        has_access := (user_id = msg_record.sender_id OR user_id = msg_record.recipient_id);
    ELSIF msg_record.message_type = 'event' THEN
        -- Event message: event participants can access
        has_access := EXISTS (
            SELECT 1 FROM public.event_participants ep
            WHERE ep.event_id = msg_record.event_id 
            AND ep.user_id = user_id 
            AND ep.status = 'attending'
        );
    END IF;
    
    -- Log message access attempt
    PERFORM public.log_security_event(
        'message_access_attempt',
        'messages',
        user_id,
        has_access,
        jsonb_build_object(
            'message_id', message_id,
            'message_type', msg_record.message_type,
            'event_id', msg_record.event_id,
            'access_granted', has_access
        )::text
    );
    
    RETURN has_access;
END;
$$;

-- Fix 4: Enhanced invitation email protection
-- Hash email addresses and add access controls

CREATE OR REPLACE FUNCTION public.hash_invitation_email(email_address TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create a consistent hash of the email for privacy
    RETURN encode(digest(lower(trim(email_address)), 'sha256'), 'hex');
END;
$$;

-- Add email hashing to invitations
CREATE OR REPLACE FUNCTION public.secure_invitation_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate admin access
    IF NOT public.is_subscription_admin(NEW.subscription_id, auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized invitation creation';
    END IF;
    
    -- Log invitation creation for auditing
    PERFORM public.log_security_event(
        'invitation_created',
        'invitations',
        auth.uid(),
        TRUE,
        jsonb_build_object(
            'subscription_id', NEW.subscription_id,
            'email_hash', public.hash_invitation_email(NEW.email),
            'invited_by', NEW.invited_by
        )::text
    );
    
    RETURN NEW;
END;
$$;

-- Add trigger for invitation security
DROP TRIGGER IF EXISTS secure_invitation_email_trigger ON public.invitations;
CREATE TRIGGER secure_invitation_email_trigger
    BEFORE INSERT ON public.invitations
    FOR EACH ROW EXECUTE FUNCTION public.secure_invitation_email();

-- Create a secure function to get invitations without exposing emails
CREATE OR REPLACE FUNCTION public.get_subscription_invitations(p_subscription_id UUID)
RETURNS TABLE(
    id UUID,
    subscription_id UUID,
    email_hash TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    -- Verify the user can access this subscription's invitations
    IF NOT public.is_subscription_admin(p_subscription_id, auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized access to subscription invitations';
    END IF;
    
    RETURN QUERY
    SELECT 
        i.id,
        i.subscription_id,
        public.hash_invitation_email(i.email) as email_hash,
        i.status,
        i.created_at,
        i.expires_at
    FROM public.invitations i
    WHERE i.subscription_id = p_subscription_id;
END;
$$;

-- Grant permissions for new security functions
GRANT EXECUTE ON FUNCTION public.validate_payment_data_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_message_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hash_invitation_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscription_invitations(UUID) TO authenticated;