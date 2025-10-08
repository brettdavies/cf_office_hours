-- ============================================================================
-- Migration: Add Stage Taxonomy Entries
-- Created: 2025-10-08
-- ============================================================================
--
-- This migration adds stage taxonomy entries to enable stage-based matching.
-- Stages are treated as tags (like industry/technology) and stored in entity_tags.
--
-- Stage normalization:
-- - Database values: "Pre-Seed", "Seed", "Series A", etc. (capitalized, spaces)
-- - Taxonomy values: "pre_seed", "seed", "series_a", etc. (lowercase, underscores)
--
-- ============================================================================

-- Insert stage taxonomy entries
-- Note: values must match normalize_taxonomy_value() output
-- "Pre-Seed" -> "preseed" (hyphen removed, then lowercase)
-- "Series A" -> "series_a" (space to underscore)
INSERT INTO taxonomy (category, value, display_name, is_approved, source, created_at, updated_at)
VALUES
  ('stage', 'preseed', 'Pre-Seed', true, 'admin', NOW(), NOW()),
  ('stage', 'seed', 'Seed', true, 'admin', NOW(), NOW()),
  ('stage', 'series_a', 'Series A', true, 'admin', NOW(), NOW()),
  ('stage', 'series_b', 'Series B', true, 'admin', NOW(), NOW()),
  ('stage', 'series_c', 'Series C', true, 'admin', NOW(), NOW()),
  ('stage', 'series_d', 'Series D', true, 'admin', NOW(), NOW()),
  ('stage', 'growth', 'Growth', true, 'admin', NOW(), NOW()),
  ('stage', 'acquisition', 'Acquisition', true, 'admin', NOW(), NOW()),
  ('stage', 'initial_public_offering_ipo', 'Initial Public Offering (IPO)', true, 'admin', NOW(), NOW())
ON CONFLICT (category, value) DO NOTHING;

-- Add comment
COMMENT ON TABLE taxonomy IS 'Taxonomy table storing approved tags for industries, technologies, and stages';
