import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.wrangler/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      'docs/**',
      '**/.claude/**',
      '**/*.config.{ts,js,cjs,mjs}',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
  {
    // Type-aware linting (incl. no-deprecated) for source files that belong to a
    // tsconfig. Test files and generated types are excluded from the per-workspace
    // tsconfigs, so they stay on the non-type-aware parser above.
    files: [
      'apps/api/src/**/*.ts',
      'apps/web/src/**/*.{ts,tsx}',
      'apps/web/worker/**/*.ts',
      'packages/shared/src/**/*.ts',
    ],
    ignores: [
      '**/*.test.{ts,tsx}',
      'apps/web/src/test/**',
      '**/*.generated.ts',
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-deprecated': 'error',
    },
  },
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      // Hono context is dynamically typed
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
);
