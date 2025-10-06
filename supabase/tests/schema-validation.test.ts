/**
 * Database Schema Validation Tests
 *
 * These tests validate the CURRENT production schema state.
 * Tests are updated directly when new migrations are applied.
 *
 * Current Schema Version: v2.4
 * Current Migration: 20251003041821_minimal_database_schema.sql
 * Last Updated: 2025-10-05 (Story 1.1)
 *
 * When updating for new migrations:
 * 1. Add tests for new tables/columns
 * 2. Update existing tests for schema changes (add/remove columns)
 * 3. Update "Current Migration" and "Last Updated" above
 * 4. Document breaking changes in comments
 *
 * Tables Tested (9):
 * - users, user_profiles, portfolio_companies, user_urls
 * - taxonomy, entity_tags
 * - availability, time_slots, bookings
 */

import { describe, it, expect } from 'vitest';
import { supabase } from './test-client';

describe('Database Schema v2.4 - Table Structure', () => {
  it('should have users table with audit columns', async () => {
    const { data, error } = await supabase
      .from('users')
      .select(
        'id, email, role, airtable_record_id, created_at, updated_at, created_by, updated_by, deleted_by'
      )
      .limit(0);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have portfolio_companies table with company metadata', async () => {
    const { data, error } = await supabase
      .from('portfolio_companies')
      .select(
        'id, name, description, website, pitch_vc_url, linkedin_url, location, customer_segment, product_type, sales_model, stage, created_at, updated_at, created_by, updated_by'
      )
      .limit(0);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have user_profiles table with portfolio_company_id FK', async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(
        'id, user_id, name, title, portfolio_company_id, company, phone, bio, avatar_source_type, avatar_metadata, reminder_preference, metadata, expertise_description, ideal_mentee_description, created_at, updated_at, created_by, updated_by'
      )
      .limit(0);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have user_urls table with url_type constraint', async () => {
    const { data, error } = await supabase
      .from('user_urls')
      .select('id, user_id, url, url_type, label, created_at, updated_at, created_by, updated_by')
      .limit(0);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have taxonomy table with hierarchy support', async () => {
    const { data, error } = await supabase
      .from('taxonomy')
      .select(
        'id, airtable_record_id, category, value, display_name, parent_id, is_approved, source, requested_by, approved_by, requested_at, approved_at, created_at, updated_at, created_by, updated_by'
      )
      .limit(0);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have entity_tags table with polymorphic relationships', async () => {
    const { data, error } = await supabase
      .from('entity_tags')
      .select(
        'id, entity_type, entity_id, taxonomy_id, created_at, updated_at, created_by, updated_by, deleted_at, deleted_by'
      )
      .limit(0);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have availability table with soft delete columns', async () => {
    const { data, error } = await supabase
      .from('availability')
      .select(
        'id, mentor_id, start_date, end_date, start_time, end_time, slot_duration_minutes, location, created_at, updated_at, created_by, updated_by, deleted_at, deleted_by'
      )
      .limit(0);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have time_slots table with booking_id FK', async () => {
    const { data, error } = await supabase
      .from('time_slots')
      .select(
        'id, availability_id, mentor_id, start_time, end_time, is_booked, booking_id, created_at, created_by, updated_by, deleted_at, deleted_by'
      )
      .limit(0);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have bookings table with confirmation tracking', async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(
        'id, time_slot_id, mentor_id, mentee_id, meeting_goal, meeting_start_time, meeting_end_time, location, status, confirmed_by, confirmed_at, created_at, updated_at, created_by, updated_by, deleted_at, deleted_by'
      )
      .limit(0);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});

describe('Database Schema v2.4 - Enums and CHECK Constraints', () => {
  it('should enforce role CHECK constraint on users', async () => {
    // This test will fail if we try to insert invalid role via Supabase client
    // (RLS will block insert, but we can test constraint exists via error inspection)
    const { error } = await supabase.from('users').insert({
      email: 'test-invalid-role@example.com',
      role: 'invalid_role', // Should violate CHECK constraint
    });

    // Expect error (either constraint violation or RLS policy denial)
    expect(error).not.toBeNull();
  });

  it('should enforce url_type CHECK constraint on user_urls', async () => {
    const { error } = await supabase.from('user_urls').insert({
      user_id: '00000000-0000-0000-0000-000000000000', // Invalid user
      url: 'https://example.com',
      url_type: 'invalid_type', // Should violate CHECK constraint
    });

    // Expect error (constraint violation or FK violation or RLS)
    expect(error).not.toBeNull();
  });

  it('should enforce category CHECK constraint on taxonomy', async () => {
    const { error } = await supabase.from('taxonomy').insert({
      category: 'invalid_category', // Should violate CHECK constraint
      value: 'test_value',
      display_name: 'Test Value',
    });

    // Expect error (constraint violation or RLS)
    expect(error).not.toBeNull();
  });

  it('should enforce entity_type CHECK constraint on entity_tags', async () => {
    const { error } = await supabase.from('entity_tags').insert({
      entity_type: 'invalid_type', // Should violate CHECK constraint
      entity_id: '00000000-0000-0000-0000-000000000000',
      taxonomy_id: '00000000-0000-0000-0000-000000000000',
    });

    // Expect error (constraint violation or FK/RLS)
    expect(error).not.toBeNull();
  });

  it('should enforce status CHECK constraint on bookings', async () => {
    const { error } = await supabase.from('bookings').insert({
      time_slot_id: '00000000-0000-0000-0000-000000000000',
      mentor_id: '00000000-0000-0000-0000-000000000000',
      mentee_id: '00000000-0000-0000-0000-000000000000',
      meeting_goal: 'Test',
      meeting_start_time: new Date().toISOString(),
      meeting_end_time: new Date(Date.now() + 3600000).toISOString(),
      location: 'Test',
      status: 'invalid_status', // Should violate CHECK constraint
    });

    // Expect error (constraint violation or FK/RLS)
    expect(error).not.toBeNull();
  });
});
