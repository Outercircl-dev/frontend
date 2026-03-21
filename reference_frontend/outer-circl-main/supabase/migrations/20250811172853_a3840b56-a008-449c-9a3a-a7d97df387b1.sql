-- Check what views exist and their definitions
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE schemaname = 'public';