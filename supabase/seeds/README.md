# Database Seed Files

This directory contains SQL files for seeding the database with sample data for development and testing.

## Files

**Note: Schema creation is handled by migrations, not seed files**

- `01_seed_industries.sql` - Loads industry taxonomy data (55 records)
- `02_seed_technologies.sql` - Loads technology taxonomy data (45 records)
- `03_seed_portfolio_companies.sql` - Loads portfolio company data (830 records)
- `04_seed_mentees.sql` - Loads mentee data (50 records)
- `05_seed_users.sql` - Loads coordinator/admin user data (2 records)
- `06_seed_mentors.sql` - Loads mentor data (400 records)

## Usage

### Automatic Seeding (Recommended)
All seed files are executed automatically when you run:
```bash
supabase db reset
```

### Manual Seeding
Run individual seed files as needed:
```sql
\i supabase/seeds/01_seed_industries.sql
\i supabase/seeds/02_seed_technologies.sql
\i supabase/seeds/03_seed_portfolio_companies.sql
\i supabase/seeds/04_seed_mentees.sql
\i supabase/seeds/05_seed_users.sql
\i supabase/seeds/06_seed_mentors.sql
```

## Data Sources

All data is hard-coded directly in the SQL seed files as INSERT statements. This approach:
- Ensures version control of all test data
- Eliminates external file dependencies
- Provides immediate visibility into data structure and content
- Simplifies database reset operations

**Data includes:**
- Industry taxonomy with hierarchical structure (55 records)
- Technology taxonomy with hierarchical structure (45 records)
- Portfolio company data with anonymized information (830 records)
- Mentee data with roles and company affiliations (50 records)
- Mentor data with professional bios and expertise (400 records)
- Coordinator/admin user data (2 records)

## Schema Separation

**Migrations handle schema creation:**
- `supabase/migrations/20251005130800_raw_tables_schema.sql` - Creates raw tables

**Seeds handle data loading:**
- `supabase/seed.sql` - Loads data into existing tables

This separation ensures:
- **Proper dependency management** - schemas created before data loading
- **Clean separation of concerns** - migrations for structure, seeds for data
- **Version control friendly** - schema changes tracked separately from data

## Raw Schema

The raw tables store seed data for ETL processing:

- `raw_industries` - Industry taxonomy data
- `raw_technologies` - Technology taxonomy data
- `raw_portfolio_companies` - Company data
- `raw_mentees` - Mentee data
- `raw_mentors` - Mentor data
- `raw_users` - Coordinator/admin user data
- `raw_user_taxonomy` - User-submitted taxonomy tags

## ETL Process

The raw data is meant to be processed by ETL functions that will:
1. Transform and normalize the data
2. Load it into the public schema tables
3. Create proper relationships and indexes
4. Apply business rules and validation

## Development Notes

- Schema is managed by migrations (not seeds)
- Seed data is hard-coded in SQL files (no external CSV dependencies)
- Seed files are loaded automatically during `supabase db reset`
- All seed files use TRUNCATE pattern for idempotent execution
- Raw tables preserve data for ETL processing into public schema
- Production systems should use Airtable sync instead of these seeds

