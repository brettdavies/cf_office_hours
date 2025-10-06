# Database Schema Tests

Automated integration tests for validating the CF Office Hours database schema.

## Overview

These tests validate the **CURRENT production schema state** by testing against a local Supabase instance. Tests are updated directly when new migrations are applied (no version-specific test files).

**Current Schema Version:** v2.4
**Current Migration:** `20251003041821_minimal_database_schema.sql`
**Last Updated:** 2025-10-05 (Story 1.1)

## Test Files

| File                        | Purpose                                     | Test Count |
| --------------------------- | ------------------------------------------- | ---------- |
| `schema-validation.test.ts` | Table structure, columns, CHECK constraints | 14 tests   |
| `constraints.test.ts`       | UNIQUE, CHECK, FK constraint enforcement    | 8 tests    |
| `rls-policies.test.ts`      | Row Level Security access control           | 15 tests   |
| `test-client.ts`            | Supabase client helper for tests            | -          |

**Total:** 37 tests

## Running Tests

### Prerequisites

1. **Local Supabase running:** `supabase start` (from project root)
2. **Environment configured:** Copy `.env.example` to `.env`
   ```bash
   cp .env.example .env
   ```
   The default values work for local Supabase (no changes needed)
3. **Dependencies installed:** `npm install` (in this directory)

### Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Test Configuration

Tests connect to local Supabase instance via `.env` file:

- **URL:** `http://127.0.0.1:54321` (default)
- **Port:** 54321 (API), 54322 (PostgreSQL)
- **Anon Key:** Default local development key (from `.env.example`)

**Security Note:** The `.env` file is gitignored. Never commit credentials to version control.

## Test Strategy

### Hybrid Approach (Option 3)

**✅ DO:** Update tests directly when schema changes

- Add tests for new tables/columns
- Modify tests when constraints change
- Remove tests for dropped features (document why)

**❌ DON'T:** Create version-specific test files

- No `1.1-schema-validation.test.ts`, `2.1-schema-validation.test.ts`, etc.
- No historical test preservation in separate files

### Why This Approach?

1. **Migrations are immutable** - Once applied in production, they never change
2. **Tests validate current state** - "Does my database work now?" not "Did migration X work?"
3. **Single source of truth** - One test suite, always up-to-date
4. **Git history preserves old versions** - If needed for debugging, `git log` shows test evolution

### When Updating Tests for New Migrations

1. **Add new tests:**

   ```typescript
   // Story 2.x adds "notifications" table
   it('should have notifications table with...', async () => {
     const { data, error } = await supabase
       .from('notifications')
       .select('id, user_id, message, read_at')
       .limit(0);
     expect(error).toBeNull();
   });
   ```

2. **Update existing tests:**

   ```typescript
   // Story 3.x adds "materials_urls" column to bookings
   it('should have bookings table...', async () => {
     const { data, error } = await supabase
       .from('bookings')
       .select('..., materials_urls') // Add new column
       .limit(0);
   });
   ```

3. **Document breaking changes:**

   ```typescript
   // Story 4.x removes "company" column from user_profiles
   // BREAKING CHANGE (Story 4.x): Removed "company" column
   // Now uses portfolio_company_id FK exclusively
   it('should have user_profiles table...', async () => {
     const { data, error } = await supabase
       .from('user_profiles')
       .select('...') // "company" removed
       .limit(0);
   });
   ```

4. **Update file headers:**
   ```typescript
   /**
    * Current Schema Version: v2.5  // Update version
    * Current Migration: 20251010...  // Update migration file
    * Last Updated: 2025-10-10 (Story 2.x)  // Update date/story
    */
   ```

## Historical Validation

If you need to validate an old migration (rare):

1. **Check git history:**

   ```bash
   git log -p supabase/tests/schema-validation.test.ts
   ```

2. **Run migration in isolation:**

   ```bash
   # Reset database to before migration
   supabase db reset
   # Apply specific migration
   supabase migration up --version 20251003041821
   ```

3. **Use schema diff:**
   ```bash
   supabase db diff
   ```

## Test Coverage

### What We Test

✅ **Schema Structure** - All tables, columns, data types
✅ **Constraints** - UNIQUE, CHECK, FK (enforcement and cascade behavior)
✅ **RLS Policies** - Public read, insert/update/delete restrictions, soft delete filtering
✅ **Indexes** - Implicit (verified by successful queries)
✅ **Triggers** - Implicit (auto-update `updated_at` verified in RLS tests)

### What We DON'T Test

❌ **Application logic** - Business rules tested elsewhere
❌ **Auth flows** - Tested in E2E tests
❌ **Performance** - Query optimization not validated here
❌ **Data migrations** - This story has no data migration

## CI/CD Integration

To integrate tests in CI/CD:

```yaml
# .github/workflows/test.yml
- name: Start Supabase
  run: supabase start

- name: Run database schema tests
  working-directory: supabase/tests
  run: npm test
```

## Troubleshooting

**Tests fail with "relation does not exist"**

- Ensure Supabase is running: `supabase status`
- Ensure migrations applied: `supabase db reset`

**Tests fail with "column does not exist"**

- Tests may be out of sync with migration
- Check migration file for actual column names
- Update test to match current schema

**Tests timeout**

- Increase timeout in `vitest.config.ts`
- Check Supabase logs: `supabase logs`

**RLS tests fail unexpectedly**

- Remember: Supabase RLS silently filters rows (success with 0 rows)
- Tests should check `data.length === 0`, not `error !== null`

## Questions?

See story [1.1](../../docs/stories/1.1.story.md) for context on test implementation decisions.
