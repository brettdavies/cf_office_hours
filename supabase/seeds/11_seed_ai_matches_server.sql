-- ============================================================================
-- Supabase Seed File - Loads AI-generated mentor-mentee matches (Pure Database)
-- ============================================================================
-- This file creates AI-style matches entirely within the database by:
-- 1. Getting all mentors with bios from the database
-- 2. Getting all companies with descriptions from the database
-- 3. Creating mentor-company pairs with random scores (0.00-99.99)
-- 4. For each pair, finding all mentees in that company
-- 5. Creating cache entries for each mentor-mentee pair
--
-- This approach is completely self-contained and doesn't require external files.
--
-- Prerequisites:
-- - Seed files 01-10 must be run first (industries, technologies, companies, users)
-- - Uses random scores and static reasoning text
--
-- Usage: Run once: \i supabase/seeds/11_seed_ai_matches_server.sql
-- ============================================================================

DO $$
DECLARE
    total_mentors INTEGER := 0;
    total_companies INTEGER := 0;
    total_pairs INTEGER := 0;
    total_mentees INTEGER := 0;
    total_inserted INTEGER := 0;
    batch_size INTEGER := 1000;
    current_batch INTEGER := 0;
BEGIN
    RAISE NOTICE '🚀 Starting pure database AI matches generation...';

    -- Get counts for progress tracking
    SELECT COUNT(*) INTO total_mentors FROM users WHERE role = 'mentor' AND deleted_at IS NULL;
    -- Only count companies that have mentees
    SELECT COUNT(DISTINCT pc.id) INTO total_companies
    FROM portfolio_companies pc
    JOIN user_profiles up ON up.portfolio_company_id = pc.id
    JOIN users u ON u.id = up.user_id AND u.role = 'mentee' AND u.deleted_at IS NULL
    WHERE pc.description IS NOT NULL;
    SELECT COUNT(*) INTO total_mentees FROM users WHERE role = 'mentee' AND deleted_at IS NULL;

    RAISE NOTICE '📊 Found: % mentors, % companies, % mentees', total_mentors, total_companies, total_mentees;
    RAISE NOTICE '🎯 Expected pairs: % (mentor × company)', total_mentors * total_companies;

    -- Process in batches to avoid memory issues
    FOR current_batch IN 0..(total_mentors * total_companies)-1 BY batch_size LOOP
        DECLARE
            batch_end INTEGER := LEAST(current_batch + batch_size, total_mentors * total_companies);
            batch_pairs INTEGER;
            mentor_idx INTEGER;
            company_idx INTEGER;
        BEGIN
            RAISE NOTICE '⚙️  Processing batch %-% of %', current_batch + 1, batch_end, total_mentors * total_companies;

            -- Create mentor-company pairs for this batch
            WITH numbered_mentors AS (
                SELECT ROW_NUMBER() OVER() as idx, id, email
                FROM users WHERE role = 'mentor' AND deleted_at IS NULL
            ),
            numbered_companies AS (
                -- Only include companies that have mentees
                SELECT DISTINCT ROW_NUMBER() OVER() as idx, pc.id, pc.name, pc.description
                FROM portfolio_companies pc
                JOIN user_profiles up ON up.portfolio_company_id = pc.id
                JOIN users u ON u.id = up.user_id AND u.role = 'mentee' AND u.deleted_at IS NULL
                WHERE pc.description IS NOT NULL
            ),
            -- Generate pairs for current batch
            batch_pairs AS (
                SELECT
                    m.id as mentor_id,
                    m.email as mentor_email,
                    c.id as company_id,
                    c.name as company_name,
                    c.description as company_description,
                    -- Generate random score between 0.00 and 99.99
                    ROUND((RANDOM() * 99.99)::NUMERIC, 2) as match_score
                FROM numbered_mentors m
                CROSS JOIN numbered_companies c
                WHERE (m.idx - 1) * (SELECT COUNT(*) FROM numbered_companies) + c.idx
                      BETWEEN current_batch + 1 AND batch_end
            ),
            -- Get mentees for each company in this batch
            company_mentees AS (
                SELECT
                    bp.mentor_id,
                    bp.mentor_email,
                    bp.company_id,
                    bp.company_name,
                    bp.match_score,
                    ARRAY_AGG(up.user_id) FILTER (WHERE up.user_id IS NOT NULL) as mentee_ids
                FROM batch_pairs bp
                LEFT JOIN user_profiles up ON up.portfolio_company_id = bp.company_id
                LEFT JOIN users u ON u.id = up.user_id AND u.role = 'mentee' AND u.deleted_at IS NULL
                GROUP BY bp.mentor_id, bp.mentor_email, bp.company_id, bp.company_name, bp.match_score
            ),
            -- Create cache entries for each mentor-mentee pair
            cache_entries AS (
                SELECT
                    mentee_id,
                    company_mentees.mentor_id as recommended_user_id,
                    company_mentees.match_score,
                    jsonb_build_object(
                        'reasoning', 'AI-generated match based on mentor expertise and company focus areas',
                        'mentor_bio_summary', 'Experienced professional with relevant industry background',
                        'company_description', company_mentees.company_name || ' focuses on innovation in their sector',
                        'match_confidence', 'High potential for productive mentoring relationship',
                        'algorithm_version', 'ai-based-v1',
                        'generated_by', 'pure-database-seed'
                    ) as match_explanation,
                    'ai-based-v1'::TEXT as algorithm_version,
                    now() as calculated_at
                FROM company_mentees
                CROSS JOIN unnest(company_mentees.mentee_ids) AS mentee_id
                WHERE company_mentees.mentee_ids IS NOT NULL
            )
            -- Insert the batch
            INSERT INTO user_match_cache (
                user_id,
                recommended_user_id,
                match_score,
                match_explanation,
                algorithm_version,
                calculated_at
            )
            SELECT
                cache_entries.mentee_id,
                cache_entries.recommended_user_id,
                cache_entries.match_score,
                cache_entries.match_explanation,
                cache_entries.algorithm_version,
                cache_entries.calculated_at
            FROM cache_entries
            ON CONFLICT (user_id, recommended_user_id, algorithm_version) DO NOTHING;

            -- Update progress counters
            GET DIAGNOSTICS batch_pairs = ROW_COUNT;
            total_inserted := total_inserted + batch_pairs;

            RAISE NOTICE '✅ Batch completed: % cache entries inserted (total: %)', batch_pairs, total_inserted;
        END;
    END LOOP;

    -- Final summary
    RAISE NOTICE '🎉 Pure database AI matches generation completed!';
    RAISE NOTICE '📈 Summary:';
    RAISE NOTICE '   • Active mentors: %', total_mentors;
    RAISE NOTICE '   • Companies with descriptions: %', total_companies;
    RAISE NOTICE '   • Mentor-company pairs generated: %', total_mentors * total_companies;
    RAISE NOTICE '   • Total mentees reached: %', total_mentees;
    RAISE NOTICE '   • Cache entries created: %', total_inserted;

    -- Get final verification
    SELECT COUNT(*) INTO total_inserted
    FROM user_match_cache
    WHERE algorithm_version = 'ai-based-v1';

    RAISE NOTICE '✅ Final verification: % AI matches in cache', total_inserted;

END $$;

-- -- ============================================================================
-- -- Verification and Analysis Queries
-- -- ============================================================================

-- -- 1. Basic summary
-- SELECT
--     'AI Matches Overview' as info,
--     COUNT(*) as total_matches,
--     COUNT(DISTINCT recommended_user_id) as unique_mentors,
--     COUNT(DISTINCT user_id) as unique_mentees,
--     ROUND(AVG(match_score), 2) as avg_score,
--     MIN(match_score) as min_score,
--     MAX(match_score) as max_score
-- FROM user_match_cache
-- WHERE algorithm_version = 'ai-based-v1';

-- -- 2. Score distribution
-- SELECT
--     CASE
--         WHEN match_score >= 90 THEN '90-100 (Excellent)'
--         WHEN match_score >= 80 THEN '80-89 (Very Good)'
--         WHEN match_score >= 70 THEN '70-79 (Good)'
--         WHEN match_score >= 60 THEN '60-69 (Fair)'
--         WHEN match_score >= 50 THEN '50-59 (Average)'
--         ELSE '0-49 (Below Average)'
--     END as score_range,
--     COUNT(*) as count,
--     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
-- FROM user_match_cache
-- WHERE algorithm_version = 'ai-based-v1'
-- GROUP BY
--     CASE
--         WHEN match_score >= 90 THEN '90-100 (Excellent)'
--         WHEN match_score >= 80 THEN '80-89 (Very Good)'
--         WHEN match_score >= 70 THEN '70-79 (Good)'
--         WHEN match_score >= 60 THEN '60-69 (Fair)'
--         WHEN match_score >= 50 THEN '50-59 (Average)'
--         ELSE '0-49 (Below Average)'
--     END
-- ORDER BY MIN(match_score);

-- -- 3. Top mentors by number of matches
-- SELECT
--     u.email as mentor_email,
--     COALESCE(up.company, 'No Company') as mentor_company,
--     COUNT(*) as total_matches,
--     ROUND(AVG(umc.match_score), 2) as avg_score,
--     MAX(umc.match_score) as highest_score
-- FROM user_match_cache umc
-- JOIN users u ON u.id = umc.recommended_user_id
-- LEFT JOIN user_profiles up ON up.user_id = u.id
-- WHERE umc.algorithm_version = 'ai-based-v1'
-- GROUP BY u.id, u.email, up.company
-- ORDER BY total_matches DESC, avg_score DESC
-- LIMIT 10;

-- -- 4. Companies with most matches
-- SELECT
--     pc.name as company_name,
--     COUNT(*) as total_matches,
--     ROUND(AVG(umc.match_score), 2) as avg_score
-- FROM user_match_cache umc
-- JOIN user_profiles up ON up.user_id = umc.user_id
-- JOIN portfolio_companies pc ON pc.id = up.portfolio_company_id
-- WHERE umc.algorithm_version = 'ai-based-v1'
-- GROUP BY pc.id, pc.name
-- ORDER BY total_matches DESC
-- LIMIT 10;
