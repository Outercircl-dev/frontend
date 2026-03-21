-- Find security definer functions that might be causing the issue
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND security_type = 'DEFINER';