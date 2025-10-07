-- ============================================================================
-- Supabase Seed File - Loads coordinators sample data
-- ============================================================================
-- This file loads coordinator/admin user data directly into the raw_users table
-- for ETL processing into the main application schema.
--
-- Note: Raw table schemas are created by migration 20251005130800_raw_tables_schema.sql
-- This file handles both data definition and loading.
--
-- Usage: Run individually as needed: \i supabase/seeds/05_seed_users.sql
-- ============================================================================

TRUNCATE TABLE raw_users;

-- ============================================================================
-- Coordinator Data
-- ============================================================================
INSERT INTO raw_users (email, role, name, title, company, phone, linkedin_url) VALUES
('coordinator1@example.com', 'coordinator', 'Sarah Coordinator', 'Program Manager', 'Capital Factory', '+1-512-555-0201', 'https://linkedin.example/in/sarah-coordinator'),
('coordinator2@example.com', 'coordinator', 'Mike Coordinator', 'Senior Coordinator', 'Capital Factory', '+1-512-555-0202', 'https://linkedin.example/in/mike-coordinator'),
('coordinator3@example.com', 'coordinator', 'Alex Rodriguez', 'Community Manager', 'Capital Factory', '+1-512-555-0203', 'https://linkedin.example/in/alex-rodriguez'),
('coordinator4@example.com', 'coordinator', 'Jessica Chen', 'Partnership Manager', 'Capital Factory', '+1-512-555-0204', 'https://linkedin.example/in/jessica-chen'),
('coordinator5@example.com', 'coordinator', 'David Kim', 'Operations Coordinator', 'Capital Factory', '+1-512-555-0205', 'https://linkedin.example/in/david-kim');

-- ============================================================================
-- SQL Logic
-- ============================================================================

-- Log the loaded data
SELECT 'Loaded ' || COUNT(*) || ' coordinators' as result FROM raw_users;
