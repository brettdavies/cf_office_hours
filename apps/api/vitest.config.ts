import { defineConfig } from 'vitest/config';

// Load `.sql` imports as text strings, matching how Wrangler (default Text module
// rule) and the esbuild build (`--loader:.sql=text`) bundle them. Without this,
// Vitest tries to parse the SQL as JavaScript and fails to transform it.
export default defineConfig({
  plugins: [
    {
      name: 'sql-text-loader',
      transform(code, id) {
        if (id.endsWith('.sql')) {
          return { code: `export default ${JSON.stringify(code)};`, map: null };
        }
        return null;
      },
    },
  ],
});
