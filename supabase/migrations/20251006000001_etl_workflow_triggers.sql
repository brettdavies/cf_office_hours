-- ============================================================================
-- Migration: ETL Workflow Triggers - Part 2 (Portfolio Companies & Users)
-- Story: ETL-001 (ETL Workflow Implementation)
-- Created: 2025-10-06
-- ============================================================================
--
-- This migration creates portfolio company and user processing for the ETL workflow.
-- Part 2 of 3: Portfolio companies and user processing functions.
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
-- PORTFOLIO COMPANIES ETL FUNCTIONS
-- ============================================================================

-- Process portfolio company changes
CREATE OR REPLACE FUNCTION process_portfolio_company_changes()
RETURNS TRIGGER AS $$
DECLARE
  company_id UUID;
  normalized_industries TEXT[];
  normalized_technologies TEXT[];
  normalized_stages TEXT[];
  normalized_value TEXT;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Parse comma-separated tag fields
    normalized_industries := split_and_trim(NEW.industry);
    normalized_technologies := split_and_trim(NEW.technology);
    normalized_stages := split_and_trim(NEW.stage);

    -- Insert/update portfolio company
    INSERT INTO portfolio_companies (
      name,
      description,
      website,
      pitch_vc_url,
      linkedin_url,
      location,
      customer_segment,
      product_type,
      sales_model,
      stage,
      created_by,
      updated_by
    ) VALUES (
      NEW.name,
      NEW.description,
      NEW.website,
      NEW.pitch, -- Map pitch field to pitch_vc_url
      NULL, -- No linkedin_url in raw data
      NEW.location,
      NEW.customer_segment,
      NEW.product_type,
      NEW.sales_model,
      NEW.stage,
      NULL,
      NULL
    )
    ON CONFLICT (name)
    DO UPDATE SET
      description = EXCLUDED.description,
      website = EXCLUDED.website,
      pitch_vc_url = EXCLUDED.pitch_vc_url,
      location = EXCLUDED.location,
      customer_segment = EXCLUDED.customer_segment,
      product_type = EXCLUDED.product_type,
      sales_model = EXCLUDED.sales_model,
      stage = EXCLUDED.stage,
      updated_by = NULL
    RETURNING id INTO company_id;

    -- Process tags for this company
    -- First, remove existing tags for this company
    DELETE FROM entity_tags
    WHERE entity_type = 'portfolio_company'
      AND entity_id = company_id;

    -- Add new tags for industries
    IF array_length(normalized_industries, 1) > 0 THEN
      INSERT INTO entity_tags (entity_type, entity_id, taxonomy_id, created_by)
      SELECT 'portfolio_company', company_id, taxonomy.id, NULL
      FROM taxonomy
      WHERE taxonomy.value = ANY(ARRAY(SELECT normalize_taxonomy_value(unnest) FROM unnest(normalized_industries)))
        AND taxonomy.is_approved = true
      ON CONFLICT (entity_type, entity_id, taxonomy_id) WHERE deleted_at IS NULL
      DO NOTHING;
    END IF;

    -- Add new tags for technologies
    IF array_length(normalized_technologies, 1) > 0 THEN
      INSERT INTO entity_tags (entity_type, entity_id, taxonomy_id, created_by)
      SELECT 'portfolio_company', company_id, taxonomy.id, NULL
      FROM taxonomy
      WHERE taxonomy.value = ANY(ARRAY(SELECT normalize_taxonomy_value(unnest) FROM unnest(normalized_technologies)))
        AND taxonomy.is_approved = true
      ON CONFLICT (entity_type, entity_id, taxonomy_id) WHERE deleted_at IS NULL
      DO NOTHING;
    END IF;

    -- Add new tags for stages
    IF array_length(normalized_stages, 1) > 0 THEN
      INSERT INTO entity_tags (entity_type, entity_id, taxonomy_id, created_by)
      SELECT 'portfolio_company', company_id, taxonomy.id, NULL
      FROM taxonomy
      WHERE taxonomy.value = ANY(ARRAY(SELECT normalize_taxonomy_value(unnest) FROM unnest(normalized_stages)))
        AND taxonomy.is_approved = true
      ON CONFLICT (entity_type, entity_id, taxonomy_id) WHERE deleted_at IS NULL
      DO NOTHING;
    END IF;

    -- Log success
    PERFORM log_etl_processing('raw_portfolio_companies', TG_OP, NEW.id, company_id, 'Processed company: ' || NEW.name);

  ELSIF TG_OP = 'DELETE' THEN
    -- For deletions, soft delete the portfolio company
    UPDATE portfolio_companies
    SET deleted_at = NOW(), deleted_by = NULL
    WHERE name = OLD.name;

    PERFORM log_etl_processing('raw_portfolio_companies', TG_OP, OLD.id, NULL, 'Deleted company: ' || OLD.name);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USERS ETL FUNCTIONS
-- ============================================================================

-- Process user changes (mentees, mentors, coordinators)
CREATE OR REPLACE FUNCTION process_user_changes()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID;
  profile_id UUID;
  portfolio_company_id UUID;
  normalized_industries TEXT[];
  normalized_technologies TEXT[];
  normalized_stages TEXT[];
  normalized_value TEXT;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Handle different source tables
    IF TG_TABLE_NAME = 'raw_mentees' THEN
      -- Parse comma-separated tag fields for mentees
      normalized_industries := split_and_trim(NEW.tags_industries);
      normalized_technologies := split_and_trim(NEW.tags_technologies);
      normalized_stages := split_and_trim(NEW.tags_stage);

      -- Find portfolio company if specified
      IF NEW.company IS NOT NULL THEN
        SELECT id INTO portfolio_company_id
        FROM portfolio_companies
        WHERE name = NEW.company;
      END IF;

      -- Insert/update user and profile
      INSERT INTO users (
        airtable_record_id,
        email,
        role,
        created_by,
        updated_by
      ) VALUES (
        NEW.record_id, -- Use record_id as airtable_record_id for mentees
        NEW.email,
        NEW.role,
        NULL,
        NULL
      )
      ON CONFLICT (airtable_record_id)
      DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        updated_by = NULL
      RETURNING id INTO new_user_id;

      -- Insert/update user profile
      INSERT INTO user_profiles (
        user_id,
        name,
        title,
        company,
        portfolio_company_id,
        phone,
        created_by,
        updated_by
      ) VALUES (
        new_user_id,
        NEW.name,
        NEW.title,
        NEW.company,
        portfolio_company_id,
        NEW.phone,
        NULL,
        NULL
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        title = EXCLUDED.title,
        company = EXCLUDED.company,
        portfolio_company_id = EXCLUDED.portfolio_company_id,
        phone = EXCLUDED.phone,
        updated_by = NULL
      RETURNING id INTO profile_id;

      -- Process user URLs for mentees
      IF NEW.linkedin_url IS NOT NULL THEN
        INSERT INTO user_urls (user_id, url, url_type, label, created_by)
        VALUES (new_user_id, NEW.linkedin_url, 'linkedin', NULL, NULL)
        ON CONFLICT (user_id, url_type)
        DO UPDATE SET
          url = EXCLUDED.url,
          updated_by = NULL;
      END IF;

    ELSIF TG_TABLE_NAME = 'raw_mentors' THEN
      -- Parse comma-separated expertise fields for mentors
      normalized_industries := split_and_trim(NEW.industry_expertise);
      normalized_technologies := split_and_trim(NEW.technology_expertise);

      -- Insert/update user and profile for mentors
      INSERT INTO users (
        airtable_record_id,
        email,
        role,
        created_by,
        updated_by
      ) VALUES (
        'mentor_' || NEW.id::text, -- Generate synthetic airtable_record_id
        'mentor' || NEW.id || '@example.com', -- Generate synthetic email
        'mentor',
        NULL,
        NULL
      )
      ON CONFLICT (airtable_record_id)
      DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        updated_by = NULL
      RETURNING id INTO new_user_id;

      -- Insert/update user profile for mentors
      INSERT INTO user_profiles (
        user_id,
        name,
        bio,
        expertise_description,
        created_by,
        updated_by
      ) VALUES (
        new_user_id,
        NEW.full_name,
        NEW.bio,
        'Industry: ' || NEW.industry_expertise || ', Technology: ' || NEW.technology_expertise,
        NULL,
        NULL
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        bio = EXCLUDED.bio,
        expertise_description = EXCLUDED.expertise_description,
        updated_by = NULL
      RETURNING id INTO profile_id;

    ELSIF TG_TABLE_NAME = 'raw_users' THEN
      -- Insert/update coordinator/admin users
      INSERT INTO users (
        airtable_record_id,
        email,
        role,
        created_by,
        updated_by
      ) VALUES (
        'user_' || NEW.id::text, -- Generate synthetic airtable_record_id
        NEW.email,
        NEW.role,
        NULL,
        NULL
      )
      ON CONFLICT (airtable_record_id)
      DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        updated_by = NULL
      RETURNING id INTO new_user_id;

      -- Insert/update user profile for coordinators
      INSERT INTO user_profiles (
        user_id,
        name,
        title,
        company,
        phone,
        created_by,
        updated_by
      ) VALUES (
        new_user_id,
        NEW.name,
        NEW.title,
        NEW.company,
        NEW.phone,
        NULL,
        NULL
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        title = EXCLUDED.title,
        company = EXCLUDED.company,
        phone = EXCLUDED.phone,
        updated_by = NULL
      RETURNING id INTO profile_id;

      -- Process user URLs for coordinators
      IF NEW.linkedin_url IS NOT NULL THEN
        INSERT INTO user_urls (user_id, url, url_type, label, created_by)
        VALUES (new_user_id, NEW.linkedin_url, 'linkedin', NULL, NULL)
        ON CONFLICT (user_id, url_type)
        DO UPDATE SET
          url = EXCLUDED.url,
          updated_by = NULL;
      END IF;
    END IF;

    -- Process tags for users (mentees and mentors only)
    IF TG_TABLE_NAME IN ('raw_mentees', 'raw_mentors') THEN
      -- Remove existing tags for this user
      DELETE FROM entity_tags
      WHERE entity_type = 'user'
        AND entity_id = new_user_id;

      -- Add new tags for industries
      IF array_length(normalized_industries, 1) > 0 THEN
        INSERT INTO entity_tags (entity_type, entity_id, taxonomy_id, created_by)
        SELECT 'user', new_user_id, taxonomy.id, NULL
        FROM taxonomy
        WHERE taxonomy.value = ANY(ARRAY(SELECT normalize_taxonomy_value(unnest) FROM unnest(normalized_industries)))
          AND taxonomy.is_approved = true
        ON CONFLICT (entity_type, entity_id, taxonomy_id) WHERE deleted_at IS NULL
        DO NOTHING;
      END IF;

      -- Add new tags for technologies
      IF array_length(normalized_technologies, 1) > 0 THEN
        INSERT INTO entity_tags (entity_type, entity_id, taxonomy_id, created_by)
        SELECT 'user', new_user_id, taxonomy.id, NULL
        FROM taxonomy
        WHERE taxonomy.value = ANY(ARRAY(SELECT normalize_taxonomy_value(unnest) FROM unnest(normalized_technologies)))
          AND taxonomy.is_approved = true
        ON CONFLICT (entity_type, entity_id, taxonomy_id) WHERE deleted_at IS NULL
        DO NOTHING;
      END IF;

      -- Add new tags for stages
      IF array_length(normalized_stages, 1) > 0 THEN
        INSERT INTO entity_tags (entity_type, entity_id, taxonomy_id, created_by)
        SELECT 'user', new_user_id, taxonomy.id, NULL
        FROM taxonomy
        WHERE taxonomy.value = ANY(ARRAY(SELECT normalize_taxonomy_value(unnest) FROM unnest(normalized_stages)))
          AND taxonomy.is_approved = true
        ON CONFLICT (entity_type, entity_id, taxonomy_id) WHERE deleted_at IS NULL
        DO NOTHING;
      END IF;
    END IF;

    -- Log success
    PERFORM log_etl_processing(TG_TABLE_NAME, TG_OP, NEW.id, new_user_id, 'Processed user');

  ELSIF TG_OP = 'DELETE' THEN
    -- For deletions, soft delete the user and related data
    IF TG_TABLE_NAME = 'raw_mentees' THEN
      SELECT id INTO new_user_id FROM users WHERE airtable_record_id = OLD.record_id;
    ELSIF TG_TABLE_NAME = 'raw_mentors' THEN
      SELECT id INTO new_user_id FROM users WHERE airtable_record_id = 'mentor_' || OLD.id::text;
    ELSIF TG_TABLE_NAME = 'raw_users' THEN
      SELECT id INTO new_user_id FROM users WHERE airtable_record_id = 'user_' || OLD.id::text;
    END IF;

    IF new_user_id IS NOT NULL THEN
      UPDATE users SET deleted_at = NOW(), deleted_by = NULL WHERE id = new_user_id;
      PERFORM log_etl_processing(TG_TABLE_NAME, TG_OP, OLD.id, new_user_id, 'Deleted user');
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
