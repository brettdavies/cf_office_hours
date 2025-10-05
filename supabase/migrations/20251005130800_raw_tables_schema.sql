-- ============================================================================
-- Migration: Raw Tables Schema for ETL Processing
-- Story: DATA-001 (Raw Data Staging Tables)
-- Created: 2025-10-05
-- ============================================================================
--
-- This migration creates the raw/staging tables used for ETL processing
-- of CSV data before transformation into the main application schema.
-- These tables store data exactly as it comes from CSV files and serve
-- as the source for ETL transformations.
--
-- Tables Created:
-- - raw_industries: Industry taxonomy data from industries.csv
-- - raw_technologies: Technology taxonomy data from technologies.csv
-- - raw_portfolio_companies: Portfolio company data from portfolio_companies.csv
-- - raw_mentees: Mentee data from mentees.csv
-- - raw_mentors: Mentor data from mentors.csv
-- - raw_users: Coordinator/admin user data from users.csv
--
-- Naming Convention: <timestamp>_<descriptive_name>.sql
-- Migration applied via: supabase db push (local) or CI/CD (production)
--
-- ============================================================================

-- ============================================================================
-- TABLE: raw_industries
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw_industries (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    parent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: raw_technologies
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw_technologies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    parent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: raw_portfolio_companies
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw_portfolio_companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    website TEXT,
    pitch TEXT,
    location TEXT,
    industry TEXT,
    technology TEXT,
    stage TEXT,
    customer_segment TEXT,
    product_type TEXT,
    sales_model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: raw_mentees
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw_mentees (
    id SERIAL PRIMARY KEY,
    record_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT,
    title TEXT,
    company TEXT,
    phone TEXT,
    linkedin_url TEXT,
    tags_industries TEXT,
    tags_technologies TEXT,
    tags_stage TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: raw_mentors
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw_mentors (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    bio TEXT,
    industry_expertise TEXT,
    technology_expertise TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: raw_users
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw_users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT,
    title TEXT,
    company TEXT,
    phone TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE raw_industries IS 'Raw industry taxonomy data from CSV - used for ETL processing into normalized industry tables';
COMMENT ON TABLE raw_technologies IS 'Raw technology taxonomy data from CSV - used for ETL processing into normalized technology tables';
COMMENT ON TABLE raw_portfolio_companies IS 'Raw portfolio company data from CSV - used for ETL processing into normalized company tables';
COMMENT ON TABLE raw_mentees IS 'Raw mentee data from CSV - used for ETL processing into users/user_profiles tables';
COMMENT ON TABLE raw_mentors IS 'Raw mentor data from CSV - used for ETL processing into users/user_profiles tables';
COMMENT ON TABLE raw_users IS 'Raw coordinator/admin user data from CSV - used for ETL processing into users/user_profiles tables';

-- ============================================================================
-- Migration Complete
-- ============================================================================
