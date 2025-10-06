-- ============================================================================
-- Migration: ETL Workflow Triggers - Part 3 (Triggers & Comments)
-- Story: ETL-001 (ETL Workflow Implementation)
-- Created: 2025-10-06
-- ============================================================================
--
-- This migration creates triggers and comments for the ETL workflow.
-- Part 3 of 3: ETL log table, triggers, and documentation.
--
-- ETL Processing Order (based on FK dependencies):
-- 1. Portfolio Companies (no dependencies)
-- 2. Taxonomy (industries, technologies - no dependencies)
-- 3. Users (depends on portfolio companies for portfolio_company_id)
-- 4. User Profiles (depends on users)
-- 5. User URLs (depends on users)
-- 6. Entity Tags (depends on users/companies + taxonomy)
--
-- Key Transformations:
-- - SERIAL IDs → UUIDs (generate new UUIDs for production tables)
-- - Field name mappings (e.g., pitch → pitch_vc_url)
-- - Data type conversions (timestamp with timezone → timestamptz)
-- - Comma-separated values → normalized entity_tags relationships
-- - Hierarchy resolution for taxonomy parent-child relationships
--
-- ============================================================================

-- ============================================================================
-- ETL LOG TABLE (Optional - for debugging)
-- ============================================================================

-- Create ETL log table for debugging (optional)
CREATE TABLE IF NOT EXISTS etl_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  raw_id INTEGER,
  production_id UUID,
  details TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRIGGER CREATION
-- ============================================================================

-- Create triggers for taxonomy tables
CREATE TRIGGER etl_raw_industries
  AFTER INSERT OR UPDATE OR DELETE ON raw_industries
  FOR EACH ROW EXECUTE FUNCTION process_taxonomy_changes();

CREATE TRIGGER etl_raw_technologies
  AFTER INSERT OR UPDATE OR DELETE ON raw_technologies
  FOR EACH ROW EXECUTE FUNCTION process_taxonomy_changes();

-- Create trigger for portfolio companies
CREATE TRIGGER etl_raw_portfolio_companies
  AFTER INSERT OR UPDATE OR DELETE ON raw_portfolio_companies
  FOR EACH ROW EXECUTE FUNCTION process_portfolio_company_changes();

-- User triggers DISABLED - users created only on auth login
-- Profile hydration happens via hydrate_user_profile_from_raw() trigger
-- The process_user_changes() function preserved for potential manual batch imports

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION process_taxonomy_changes() IS 'ETL function to process raw taxonomy table changes into production taxonomy table';
COMMENT ON FUNCTION process_portfolio_company_changes() IS 'ETL function to process raw portfolio company changes into production tables';
COMMENT ON FUNCTION process_user_changes() IS 'ETL function to process raw user changes (mentees, mentors, coordinators) into production tables';
COMMENT ON FUNCTION normalize_taxonomy_value(TEXT) IS 'Utility function to normalize taxonomy values (lowercase, underscores)';
COMMENT ON FUNCTION split_and_trim(TEXT) IS 'Utility function to split comma-separated values and trim whitespace';
COMMENT ON FUNCTION log_etl_processing(TEXT, TEXT, INTEGER, UUID, TEXT) IS 'Utility function to log ETL processing for debugging';

COMMENT ON TABLE etl_log IS 'ETL processing log for debugging and monitoring (optional)';

-- ============================================================================
-- Migration Complete
-- ============================================================================
