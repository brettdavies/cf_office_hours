-- ============================================================================
-- Supabase Seed File - Loads technologies sample data
-- ============================================================================
-- This file loads technology taxonomy data directly into the raw_technologies table
-- for ETL processing into the main application schema.
--
-- Note: Raw table schemas are created by migration 20251005130800_raw_tables_schema.sql
-- This file handles both data definition and loading.
--
-- Usage: Run individually as needed: \i supabase/seeds/02_seed_technologies.sql
-- ============================================================================

TRUNCATE TABLE raw_technologies;

-- ============================================================================
-- Technology Data
-- ============================================================================
INSERT INTO raw_technologies (name, parent) VALUES
('3D Printing', NULL),
('Advanced Materials', NULL),
('Agnostic', NULL),
('Artificial Intelligence', NULL),
('Big Data & Analytics', NULL),
('Biotechnology', NULL),
('Blockchain', NULL),
('Cloud Software & Infrastructure', NULL),
('Communication Channels', NULL),
('Computer Vision & Image Processing', NULL),
('Cryptocurrency', NULL),
('Cybersecurity', NULL),
('Data Engineering', NULL),
('Database & Infrastructure', NULL),
('Deep & Frontier Tech', NULL),
('Design Tools', NULL),
('Developer Tools', NULL),
('DevOps', NULL),
('Digital Health', NULL),
('Edge Computing', NULL),
('Enterprise Software', NULL),
('Financial Technology', NULL),
('Gamification', NULL),
('Hardware', NULL),
('Healthcare IT', NULL),
('Identity Management', NULL),
('Industrial Automation', NULL),
('Internet of Things (IoT)', NULL),
('Machine Learning', NULL),
('Marketplaces', NULL),
('Mobile', NULL),
('Natural Language Processing', NULL),
('Platform as a Service', NULL),
('Quantum Computing', NULL),
('Real-time Analytics', NULL),
('Robotics & Drones', NULL),
('Sales Enablement', NULL),
('SaaS', NULL),
('Scalability', NULL),
('Security', NULL),
('Software Development', NULL),
('Supply Chain Management', NULL),
('Telemedicine', NULL),
('User Experience', NULL),
('Voice', NULL);

-- ============================================================================
-- SQL Logic
-- ============================================================================

-- Log the loaded data
SELECT 'Loaded ' || COUNT(*) || ' technologies' as result FROM raw_technologies;

