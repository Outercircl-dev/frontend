-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_net extension to extensions schema
ALTER EXTENSION pg_net SET SCHEMA extensions;