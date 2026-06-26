/**
 * In-memory D1 test double backed by Node's built-in SQLite.
 *
 * Implements the subset of the D1 API the app uses (`prepare`, `bind`, `all`,
 * `first`, `run`, `batch`, `exec`) over `node:sqlite`, so repository and service
 * tests exercise the real SQL against the real schema instead of mocking the
 * query builder.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../migrations/0001_initial_schema.sql'
);

const toPlain = <T>(row: Record<string, unknown> | undefined): T | null =>
  row ? ({ ...row } as T) : null;

class TestStatement {
  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
    private readonly args: unknown[] = []
  ) {}

  // D1 statements are immutable: bind returns a new bound statement.
  bind(...args: unknown[]): TestStatement {
    return new TestStatement(this.db, this.sql, args);
  }

  async all<T>(): Promise<{ results: T[]; success: true; meta: object }> {
    const rows = this.db.prepare(this.sql).all(...(this.args as never[]));
    return {
      results: rows.map(r => ({ ...r })) as T[],
      success: true,
      meta: {},
    };
  }

  async first<T>(): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...(this.args as never[]));
    return toPlain<T>(row as Record<string, unknown> | undefined);
  }

  async run(): Promise<{ success: true; meta: { changes: number } }> {
    const info = this.db.prepare(this.sql).run(...(this.args as never[]));
    return { success: true, meta: { changes: Number(info.changes) } };
  }
}

class TestD1 {
  constructor(private readonly db: DatabaseSync) {}

  prepare(sql: string): TestStatement {
    return new TestStatement(this.db, sql);
  }

  async batch(statements: TestStatement[]): Promise<unknown[]> {
    this.db.exec('BEGIN');
    try {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.run());
      }
      this.db.exec('COMMIT');
      return results;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }
}

/**
 * Create a fresh in-memory database with the application schema applied.
 *
 * @returns A D1-compatible handle plus the raw node:sqlite database for setup.
 */
export function createTestDb(): { DB: TestD1; raw: DatabaseSync } {
  const db = new DatabaseSync(':memory:');
  // D1 does not enforce foreign keys; match that so seed order is unconstrained.
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec(readFileSync(SCHEMA_PATH, 'utf8'));
  return { DB: new TestD1(db) as unknown as D1Database & TestD1, raw: db };
}

/**
 * Insert a row into a table, returning the provided values.
 *
 * @param raw - The raw node:sqlite database
 * @param table - Table name
 * @param values - Column/value map
 */
export function insertRow(raw: DatabaseSync, table: string, values: Record<string, unknown>): void {
  const cols = Object.keys(values);
  const placeholders = cols.map(() => '?').join(', ');
  raw
    .prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`)
    .run(...(Object.values(values) as never[]));
}
