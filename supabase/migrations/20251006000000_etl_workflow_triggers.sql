-- ============================================================================
-- Migration: ETL Workflow Triggers - Part 1 (Utility Functions & Taxonomy)
-- Story: ETL-001 (ETL Workflow Implementation)
-- Created: 2025-10-06
-- ============================================================================
--
-- This migration creates utility functions and taxonomy processing for the ETL workflow.
-- Part 1 of 3: Utility functions and taxonomy processing functions.
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
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to normalize taxonomy values (lowercase, underscores, no special chars)
CREATE OR REPLACE FUNCTION normalize_taxonomy_value(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Convert to lowercase, replace spaces and special chars with underscores
  RETURN LOWER(REGEXP_REPLACE(REGEXP_REPLACE(input_text, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '_', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to split comma-separated values and trim whitespace
CREATE OR REPLACE FUNCTION split_and_trim(text_value TEXT)
RETURNS TEXT[] AS $$
DECLARE
  result TEXT[];
BEGIN
  IF text_value IS NULL OR text_value = '' THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  SELECT ARRAY_AGG(TRIM(value)) INTO result
  FROM UNNEST(STRING_TO_ARRAY(text_value, ',')) AS value
  WHERE TRIM(value) != '';

  RETURN COALESCE(result, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to log ETL processing for debugging
CREATE OR REPLACE FUNCTION log_etl_processing(
  table_name TEXT,
  operation TEXT,
  raw_id INTEGER,
  production_id UUID DEFAULT NULL,
  details TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Log to a dedicated ETL log table (create if needed)
  INSERT INTO etl_log (table_name, operation, raw_id, production_id, details, processed_at)
  VALUES (table_name, operation, raw_id, production_id, details, NOW());
EXCEPTION WHEN undefined_table THEN
  -- If etl_log table doesn't exist yet, skip logging
  NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TAXONOMY ETL FUNCTIONS
-- ============================================================================

-- Process taxonomy changes (industries, technologies)
CREATE OR REPLACE FUNCTION process_taxonomy_changes()
RETURNS TRIGGER AS $$
DECLARE
  taxonomy_record RECORD;
  parent_taxonomy_id UUID;
  normalized_value TEXT;
  category_type TEXT;
BEGIN
  -- Determine category based on table name
  category_type := CASE TG_TABLE_NAME
    WHEN 'raw_industries' THEN 'industry'
    WHEN 'raw_technologies' THEN 'technology'
  END;

  -- Handle different operations
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Normalize the taxonomy value
    normalized_value := normalize_taxonomy_value(NEW.name);

    -- Find parent if specified
    IF NEW.parent IS NOT NULL THEN
      SELECT id INTO parent_taxonomy_id
      FROM taxonomy
      WHERE display_name = NEW.parent
        AND category = category_type
        AND source = 'airtable';
    END IF;

    -- Upsert taxonomy record
    INSERT INTO taxonomy (
      airtable_record_id,
      category,
      value,
      display_name,
      parent_id,
      is_approved,
      source,
      created_by,
      updated_by
    ) VALUES (
      NULL, -- No airtable_record_id for sample data
      category_type,
      normalized_value,
      NEW.name,
      parent_taxonomy_id,
      CASE
        WHEN TG_TABLE_NAME = 'raw_industries' THEN true -- 90% approved for industries
        WHEN TG_TABLE_NAME = 'raw_technologies' THEN true -- 90% approved for technologies
      END,
      'airtable',
      NULL,
      NULL
    )
    ON CONFLICT (category, value)
    DO UPDATE SET
      display_name = EXCLUDED.display_name,
      parent_id = EXCLUDED.parent_id,
      updated_by = NULL;

    -- Log success
    PERFORM log_etl_processing(TG_TABLE_NAME, TG_OP, NEW.id, NULL, 'Processed taxonomy: ' || NEW.name);

  ELSIF TG_OP = 'DELETE' THEN
    -- For deletions, we keep taxonomy records (historical reference)
    -- Just log the deletion
    PERFORM log_etl_processing(TG_TABLE_NAME, TG_OP, OLD.id, NULL, 'Deleted taxonomy: ' || OLD.name);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Migration Complete - Part 1
