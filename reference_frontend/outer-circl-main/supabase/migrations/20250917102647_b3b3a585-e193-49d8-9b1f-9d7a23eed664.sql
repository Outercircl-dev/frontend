-- Fix the problematic trigger function that's trying to access email field
-- The issue is likely in a trigger that expects email in profiles table
-- but email is stored in profiles_sensitive table

-- Check if there's a trigger causing the email field error
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    -- List all triggers on profiles table
    FOR trigger_rec IN 
        SELECT t.tgname, p.proname 
        FROM pg_trigger t
        JOIN pg_proc p ON t.tgfoid = p.oid
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relname = 'profiles' 
        AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        RAISE NOTICE 'Found trigger: % calling function: %', trigger_rec.tgname, trigger_rec.proname;
    END LOOP;
END $$;