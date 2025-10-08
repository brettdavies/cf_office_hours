-- ============================================================================
-- Migration: Tag Rarity Function for Matching Algorithm
-- Created: 2025-10-08
-- ============================================================================
--
-- This migration creates a database function to retrieve tag usage statistics
-- for the matching algorithm's rarity-based weighting system.
--
-- The function returns tag values and their usage counts across all entities
-- (users and portfolio companies) to enable TF-IDF style weighting where
-- rare tags contribute more to match scores than common tags.
--
-- ============================================================================

-- Create function to get tag usage counts for rarity weighting
CREATE OR REPLACE FUNCTION get_tag_usage_counts()
RETURNS TABLE (
  tag_value TEXT,
  usage_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.value as tag_value,
    COUNT(DISTINCT et.entity_id) as usage_count
  FROM taxonomy t
  LEFT JOIN entity_tags et ON (
    t.id = et.taxonomy_id
    AND et.deleted_at IS NULL
  )
  WHERE t.is_approved = true
  GROUP BY t.id, t.value
  ORDER BY usage_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment
COMMENT ON FUNCTION get_tag_usage_counts() IS
  'Returns tag usage statistics for rarity-based match weighting. Used by matching algorithm to weight rare tags higher than common tags.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_tag_usage_counts() TO authenticated;
