-- Check view options for security_barrier
SELECT 
  schemaname, 
  viewname,
  unnest(CASE 
    WHEN reloptions IS NULL THEN ARRAY['None']
    ELSE reloptions 
  END) as option
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname
WHERE schemaname = 'public';