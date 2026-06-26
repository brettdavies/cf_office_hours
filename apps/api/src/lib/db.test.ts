// External dependencies
import { describe, it, expect } from 'vitest';

// Internal modules
import { getDb } from './db';

// Types
import type { Env } from '../types/bindings';

describe('getDb', () => {
  it('returns the configured D1 binding', () => {
    const fakeDb = {} as D1Database;
    expect(getDb({ DB: fakeDb } as Env)).toBe(fakeDb);
  });

  it('throws when the DB binding is missing', () => {
    expect(() => getDb({} as Env)).toThrow('D1 database binding');
  });
});
