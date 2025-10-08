-- Migration: enable_execute_sql_rpc
-- Story: 0.27 - AI-MATCH-STAGING-001
-- Description: Enables execute_sql RPC function for AI match staging operations

-- Create execute_sql function for raw SQL execution (service role only)
CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Only allow service role to execute raw SQL
    IF auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Access denied: execute_sql requires service_role';
    END IF;

    -- Execute the query and return result as JSONB
    EXECUTE query;

    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Query executed successfully'
    );

EXCEPTION WHEN OTHERS THEN
    -- Return error response
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'query', query
    );
END;
$$;

-- Grant execute permission to service role only
REVOKE EXECUTE ON FUNCTION execute_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execute_sql(text) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION execute_sql(text) IS 'Executes raw SQL queries with service role permissions. Used for AI match staging operations.';
