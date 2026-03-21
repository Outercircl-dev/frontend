-- Fix Critical Security Issue #1: Remove any views exposing auth.users
-- This addresses the "Exposed Auth Users" error

-- Drop any remaining views that might expose auth.users
DROP VIEW IF EXISTS public.invitations_secure CASCADE;

-- Ensure no other views are exposing auth schema
-- Check for any views that might reference auth.users and remove them safely