// node:sqlite ships with Node 22+ but is not typed by @types/node@20.
// Declare the minimal surface the D1 test helper uses.
declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(path: string);
    prepare(sql: string): {
      all(...params: unknown[]): Array<Record<string, unknown>>;
      get(...params: unknown[]): Record<string, unknown> | undefined;
      run(...params: unknown[]): {
        changes: number | bigint;
        lastInsertRowid: number | bigint;
      };
    };
    exec(sql: string): void;
  }
}
