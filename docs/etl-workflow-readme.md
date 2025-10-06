# ETL Workflow Documentation

## Overview

This ETL (Extract, Transform, Load) workflow automatically processes data from raw staging tables into the production application tables. The workflow is triggered by changes to the raw tables and handles all necessary transformations, foreign key resolutions, and data normalization.

**IMPORTANT:** User records (`users`, `user_profiles`, `user_urls`) are **NOT** created by ETL triggers. Users are created when they log in via Supabase Auth, and their profiles are hydrated from raw tables by email lookup. See [User Authentication Workflow](#user-authentication-workflow) below.

## Architecture

### Raw Tables (Source)
- `raw_industries` - Industry taxonomy data from CSV
- `raw_technologies` - Technology taxonomy data from CSV
- `raw_portfolio_companies` - Portfolio company data from CSV
- `raw_mentees` - Mentee data from CSV
- `raw_mentors` - Mentor data from CSV
- `raw_users` - Coordinator/admin user data from CSV

### Production Tables (Target)
- `taxonomy` - Normalized taxonomy with hierarchical relationships
- `portfolio_companies` - Company master data with URLs
- `users` - User authentication and role management
- `user_profiles` - User profile information
- `user_urls` - Flexible user URL management
- `entity_tags` - Polymorphic tag relationships

## Processing Order

The ETL functions process tables in dependency order to maintain referential integrity:

1. **Portfolio Companies** (no dependencies) - ✅ ETL Trigger
2. **Taxonomy** (industries, technologies - no dependencies) - ✅ ETL Trigger
3. **Entity Tags** (depends on users/companies + taxonomy) - ✅ ETL Trigger for companies only

## File Structure

The ETL workflow is implemented across three migration files for better organization:

1. **`20251006000000_etl_workflow_triggers.sql`** - Utility functions and taxonomy processing
2. **`20251006000001_etl_workflow_triggers.sql`** - Portfolio company and user processing
3. **`20251006000002_etl_workflow_triggers.sql`** - ETL log table, triggers, and documentation

## Key Transformations

### ID Types
- **Raw tables**: Use SERIAL (integer) primary keys
- **Production tables**: Use UUID primary keys (new UUIDs generated)

### Field Mappings
- `pitch` → `pitch_vc_url` (portfolio companies)
- `full_name` → `name` (user profiles)
- `record_id` → `airtable_record_id` (users)

### Data Normalization
- Comma-separated values split into individual `entity_tags` records
- Taxonomy values normalized (lowercase, underscores, no special characters)
- Hierarchy relationships resolved via foreign keys

### Data Types
- `TIMESTAMP WITH TIME ZONE` → `timestamptz`

## Trigger Functions

### `process_taxonomy_changes()`
Processes changes to `raw_industries`, `raw_technologies`, and future `raw_stages` tables.

**Features:**
- Normalizes taxonomy values
- Resolves parent-child hierarchies
- Sets appropriate approval status (90% approved for industries/technologies, 10% for stages)
- Handles INSERT, UPDATE, DELETE operations

### `process_portfolio_company_changes()`
Processes changes to `raw_portfolio_companies` table.

**Features:**
- Maps field names (pitch → pitch_vc_url)
- Parses comma-separated industry/technology/stage fields
- Creates entity tags linking companies to taxonomy
- Handles INSERT, UPDATE, DELETE operations

### `process_user_changes()`
Processes changes to `raw_mentees`, `raw_mentors`, and `raw_users` tables.

**Features:**
- Handles different user types (mentees, mentors, coordinators)
- Generates synthetic emails and airtable_record_ids for mentors
- Parses expertise fields for mentors
- Creates user profiles and URLs
- Creates entity tags for users
- Handles INSERT, UPDATE, DELETE operations

## Utility Functions

### `normalize_taxonomy_value(input_text TEXT)`
Converts taxonomy display names to normalized values:
- Converts to lowercase
- Replaces spaces and special characters with underscores
- Example: "Cloud Software & Infrastructure" → "cloud_software_infrastructure"

### `split_and_trim(text_value TEXT)`
Splits comma-separated values and trims whitespace:
- Handles null/empty values
- Returns empty array for null input
- Trims each value

### `log_etl_processing(table_name, operation, raw_id, production_id, details)`
Logs ETL processing for debugging and monitoring.

## Testing

### Test Script
Run `scripts/test-etl-workflow.sql` to test the ETL functions:

```sql
\i scripts/test-etl-workflow.sql
```

**Test Coverage:**
- Taxonomy processing (hierarchical relationships)
- Portfolio company processing (with tags)
- User processing (mentees, mentors, coordinators)
- Entity tag creation
- ETL logging

### Manual Testing Steps

1. **Apply Migration:**
   ```bash
   supabase db push
   ```

2. **Run Test Script:**
   ```bash
   supabase db reset --db-url postgresql://...  # Apply seeds first
   psql -d your_db -f scripts/test-etl-workflow.sql
   ```

3. **Verify Results:**
   - Check `taxonomy` table for created records
   - Check `portfolio_companies` table for company data
   - Check `users`, `user_profiles`, `user_urls` tables for user data
   - Check `entity_tags` table for tag relationships
   - Check `etl_log` table for processing logs

## Monitoring

### ETL Log Table
The `etl_log` table tracks all ETL processing:

```sql
SELECT * FROM etl_log ORDER BY processed_at DESC;
```

**Log Fields:**
- `table_name` - Source table that triggered the change
- `operation` - INSERT, UPDATE, or DELETE
- `raw_id` - ID from the raw table
- `production_id` - UUID from the production table
- `details` - Additional processing information
- `processed_at` - Timestamp of processing

### Error Handling

The ETL functions include error handling for:
- Missing parent taxonomy records (logged as warnings)
- Invalid taxonomy values (logged as warnings)
- Constraint violations (logged as errors, operation continues)
- Null/empty values (handled gracefully)

## Development Workflow

### Adding New Raw Tables
1. Create raw table in migration (like `20251005130800_raw_tables_schema.sql`)
2. Add trigger in ETL migration:
   ```sql
   CREATE TRIGGER etl_raw_new_table
     AFTER INSERT OR UPDATE OR DELETE ON raw_new_table
     FOR EACH ROW EXECUTE FUNCTION process_new_table_changes();
   ```
3. Implement processing function following existing patterns

### Modifying ETL Logic
1. Update the appropriate processing function
2. Test with the test script
3. Deploy migration to apply changes

## Production Considerations

### Performance
- Triggers process changes synchronously (real-time updates)
- Large batch operations may impact performance
- Consider async processing for very large datasets

### Data Consistency
- All operations wrapped in database transactions
- Foreign key constraints enforce referential integrity
- Upsert operations prevent duplicates

### Backup Strategy
- Raw tables serve as source of truth backup
- Production tables can be rebuilt from raw tables if needed
- ETL log provides audit trail of all changes

## Troubleshooting

### Common Issues

1. **Missing Parent Taxonomy:**
   - Parent records must exist before child records
   - Check ETL processing order

2. **Invalid Taxonomy Values:**
   - Taxonomy normalization may create unexpected values
   - Check `normalize_taxonomy_value()` function

3. **Foreign Key Violations:**
   - Ensure processing order respects dependencies
   - Check that referenced records exist

### Debugging
1. Check `etl_log` table for processing errors
2. Verify raw data format matches expected schema
3. Test individual functions manually:
   ```sql
   SELECT process_taxonomy_changes();
   ```

## Future Enhancements

### Potential Improvements
1. **Async Processing** - Move heavy ETL operations to background jobs
2. **Batch Processing** - Optimize for large data imports
3. **Conflict Resolution** - Handle concurrent modifications
4. **Data Validation** - Add comprehensive validation before processing
5. **Metrics Collection** - Track ETL performance and success rates

## User Authentication Workflow

**Users are created via Supabase Auth, NOT via ETL triggers.**

### How It Works

1. **Raw Data Loading**: Load mentee/mentor/coordinator data into `raw_mentees`, `raw_mentors`, `raw_users`
2. **No User Creation**: ETL does NOT create records in `users`, `user_profiles`, or `user_urls`
3. **User Login**: User requests magic link and logs in
4. **Auth Trigger**: `handle_new_user()` creates record in `public.users` with same UUID as `auth.users`
5. **Profile Hydration**: `hydrate_user_profile_from_raw()` looks up email in raw tables and populates:
   - `user_profiles` (name, title, company, bio, etc.)
   - `user_urls` (LinkedIn, etc.)
   - Links to `portfolio_companies` if company name matches

### UUID Synchronization

**Critical**: The UUID in `auth.users` MUST match the UUID in `public.users`.

- ✅ **Correct Flow**: Auth login → creates `public.users` with same UUID
- ❌ **Wrong Flow**: ETL creates `public.users` → auth creates different UUID → mismatch

### Raw Tables as Profile Source

Raw user tables serve as a "profile data warehouse":
- Users who haven't logged in yet: Exist only in raw tables
- Users who have logged in: Raw data hydrated into `user_profiles`
- Profile updates: Can update raw tables, re-login will sync changes

### Database Triggers

**File**: `supabase/migrations/20251006000003_auth_user_sync_trigger.sql`

1. **`handle_new_user()`** - Triggered on `auth.users` INSERT
   - Creates `public.users` record with same UUID
   - Generates `airtable_record_id` with `auth_` prefix

2. **`hydrate_user_profile_from_raw()`** - Triggered on `public.users` INSERT  
   - Queries `raw_mentees`, `raw_mentors`, `raw_users` by email
   - Populates `user_profiles` with found data
   - Creates `user_urls` for LinkedIn
   - Uses email prefix as name if no raw data found

### Troubleshooting

**Issue**: "Profile not found" after login
- **Cause**: UUID mismatch between `auth.users` and `public.users`
- **Solution**: Reset database to reapply triggers
  ```bash
  supabase db reset
  ```

**Issue**: Profile missing data
- **Check**: Does email exist in `raw_mentees`, `raw_mentors`, or `raw_users`?
  ```sql
  SELECT * FROM raw_mentees WHERE email = 'user@example.com'
  UNION ALL
  SELECT * FROM raw_mentors WHERE email = 'user@example.com'
  UNION ALL  
  SELECT * FROM raw_users WHERE email = 'user@example.com';
  ```

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more details.

