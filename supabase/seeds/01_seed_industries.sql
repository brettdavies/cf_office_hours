-- ============================================================================
-- Supabase Seed File - Loads industries sample data
-- ============================================================================
-- This file loads industry taxonomy data directly into the raw_industries table
-- for ETL processing into the main application schema.
--
-- Note: Raw table schemas are created by migration 20251005130800_raw_tables_schema.sql
-- This file handles both data definition and loading.
--
-- Usage: Run individually as needed: \i supabase/seeds/01_seed_industries.sql
-- ============================================================================

TRUNCATE TABLE raw_industries;

-- ============================================================================
-- Industry Data
-- ============================================================================
INSERT INTO raw_industries (name, parent) VALUES
('Advertising', NULL),
('Aerospace', NULL),
('Agriculture & Food Supply', NULL),
('Automotive', NULL),
('Business Services', NULL),
('Cannabis', NULL),
('Cleantech & Renewable Energy', NULL),
('Computing & Developer Tools', NULL),
('Construction', NULL),
('Consumer Products', NULL),
('Cybersecurity', NULL),
('Data & Analytics', NULL),
('Defense & Military', NULL),
('E-commerce', NULL),
('Education', NULL),
('Energy', NULL),
('Enterprise Software', NULL),
('Fashion & Apparel', NULL),
('Financial Services', NULL),
('FinTech', NULL),
('Food & Beverage', NULL),
('Gaming', NULL),
('Government', NULL),
('Hardware', NULL),
('Healthcare', NULL),
('Hospitality', NULL),
('HR & Recruiting', NULL),
('Industrial', NULL),
('Insurance', NULL),
('Legal', NULL),
('Life Sciences', NULL),
('Logistics', NULL),
('Manufacturing', NULL),
('Marketing', NULL),
('Media & Entertainment', NULL),
('Medical Devices', NULL),
('Mobility', NULL),
('Nonprofit', NULL),
('Oil & Gas', NULL),
('Pharmaceuticals', NULL),
('Professional Services', NULL),
('PropTech', NULL),
('Real Estate', NULL),
('Retail', NULL),
('Robotics', NULL),
('SaaS', NULL),
('Security', NULL),
('Social Impact', NULL),
('Sports', NULL),
('Supply Chain', NULL),
('Telecommunications', NULL),
('Transportation', NULL),
('Travel', NULL),
('Utilities', NULL),
('Veterinary', NULL);

-- ============================================================================
-- SQL Logic
-- ============================================================================

-- Log the loaded data
SELECT 'Loaded ' || COUNT(*) || ' industries' as result FROM raw_industries;

