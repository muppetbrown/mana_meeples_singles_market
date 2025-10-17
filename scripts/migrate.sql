-- Example: tighten search path and ensure pg_trgm is enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- Optional: you can create read-only role for web if desired
-- CREATE ROLE web_ro LOGIN PASSWORD '***';
-- GRANT CONNECT ON DATABASE current_database() TO web_ro;
-- GRANT USAGE ON SCHEMA public TO web_ro;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO web_ro;