/**
 * Shared helpers for working with D1 (SQLite) rows.
 *
 * SQLite stores booleans as 0/1 integers, JSON as text, and timestamps as ISO
 * strings. These helpers centralize the conversions between those shapes and the
 * TypeScript types the API exposes.
 */

/** Current time as an ISO-8601 string, matching the DB timestamp format. */
export const nowIso = (): string => new Date().toISOString();

/** Generate a UUID for a new row's primary key. */
export const newId = (): string => crypto.randomUUID();

/** Convert a boolean to the integer SQLite stores. */
export const toInt = (value: boolean): number => (value ? 1 : 0);

/** Convert a SQLite integer (or boolean) to a boolean. */
export const toBool = (value: number | boolean | null | undefined): boolean =>
  value === 1 || value === true;

/** Parse a JSON column value, returning null on absence or parse failure. */
export const parseJson = <T>(value: string | null | undefined): T | null => {
  if (value == null) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

/** Serialize a value for a JSON column, preserving null. */
export const stringifyJson = (value: unknown): string | null =>
  value == null ? null : JSON.stringify(value);
