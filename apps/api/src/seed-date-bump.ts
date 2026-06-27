import bumpSql from '../../../scripts/bump-seed-dates.sql';
import type { Env } from './types/bindings';

// Split the shared bump script into executable statements: drop comment lines,
// then split on the statement terminator. D1's exec() splits on newlines (so it
// breaks multi-line statements), so the date bump runs as a batch of prepared
// statements instead.
function statements(sql: string): string[] {
  return sql
    .split('\n')
    .filter(line => !line.trimStart().startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// Re-anchor the demo seed's dates onto the current date by running
// scripts/bump-seed-dates.sql (the same script the seed generator appends to a
// fresh seed). batch() runs the statements in one transaction so the
// intermediate _reanchor_shift table persists across them.
export async function runSeedDateBump(env: Env): Promise<number> {
  const prepared = statements(bumpSql).map(sql => env.DB.prepare(sql));
  await env.DB.batch(prepared);
  return prepared.length;
}
