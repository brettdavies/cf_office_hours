# 9. Unified Project Structure

This section defines the complete monorepo structure, package organization, dependency management, build configuration, and development workflows. The project uses **npm workspaces** for monorepo management without additional tooling complexity.

## 9.1 Complete Monorepo Structure

```
cf-office-hours/
├── .github/                         # GitHub configuration
│   ├── workflows/                   # CI/CD pipelines
│   │   ├── deploy-api.yml          # API deployment
│   │   ├── deploy-web.yml          # Frontend deployment
│   │   ├── test.yml                # Run tests on PR
│   │   └── lint.yml                # Code quality checks
│   └── CODEOWNERS                  # Code ownership
├── apps/                            # Application packages
│   ├── web/                        # React frontend (Cloudflare Pages)
│   │   ├── public/
│   │   ├── src/
│   │   ├── e2e/                    # Playwright tests
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── playwright.config.ts
│   │   ├── vitest.config.ts
│   │   └── package.json
│   └── api/                        # Cloudflare Workers API
│       ├── src/
│       ├── wrangler.toml
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── package.json
├── packages/                        # Shared packages
│   ├── shared/                     # Shared types, schemas, utilities
│   │   ├── src/
│   │   │   ├── types/              # TypeScript types/interfaces
│   │   │   ├── schemas/            # Zod validation schemas
│   │   │   ├── constants/          # Shared constants
│   │   │   └── utils/              # Shared utilities
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── config/                     # Shared configuration
│       ├── eslint/
│       │   └── base.js             # Base ESLint config
│       ├── typescript/
│       │   └── tsconfig.base.json  # Base TypeScript config
│       └── package.json
├── docs/                            # Documentation
│   ├── architecture.md             # This document
│   ├── prd.md                      # Product requirements
│   └── api/                        # API documentation
├── scripts/                         # Build and utility scripts
│   ├── generate-api-types.ts      # OpenAPI type generation
│   ├── setup-dev.ts               # Development setup
│   └── seed-database.ts           # Database seeding
├── .vscode/                        # VS Code configuration
│   ├── settings.json
│   ├── extensions.json
│   └── launch.json
├── .editorconfig                   # Editor configuration
├── .gitignore                      # Git ignore rules
├── .prettierrc                     # Prettier configuration
├── .prettierignore                 # Prettier ignore rules
├── .npmrc                          # npm configuration
├── package.json                    # Root package.json (workspaces)
├── package-lock.json               # Lockfile
├── tsconfig.json                   # Root TypeScript config
├── README.md                       # Project documentation
└── LICENSE                         # License file
```

## 9.2 Root Package Configuration

**Root package.json:**
```json
{
  "name": "cf-office-hours",
  "version": "1.0.0",
  "private": true,
  "description": "Capital Factory Office Hours Platform - Monorepo",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspaces --if-present",
    "dev:web": "npm run dev --workspace=apps/web",
    "dev:api": "npm run dev --workspace=apps/api",
    "build": "npm run build --workspaces --if-present",
    "build:web": "npm run build --workspace=apps/web",
    "build:api": "npm run build --workspace=apps/api",
    "test": "npm run test --workspaces --if-present",
    "test:web": "npm run test --workspace=apps/web",
    "test:api": "npm run test --workspace=apps/api",
    "test:e2e": "npm run test:e2e --workspace=apps/web",
    "lint": "eslint . --ext .ts,.tsx --max-warnings 0",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "type-check": "tsc --noEmit",
    "generate:api-types": "node scripts/generate-api-types.js",
    "setup": "node scripts/setup-dev.js",
    "clean": "rm -rf node_modules apps/*/node_modules packages/*/node_modules apps/*/dist apps/api/.wrangler"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.4",
    "typescript": "^5.7.2"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

## 9.3 Workspace Package Configuration

**Frontend App (apps/web/package.json):**
```json
{
  "name": "@cf-office-hours/web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  },
  "dependencies": {
    "@cf-office-hours/shared": "*",
    "@hookform/resolvers": "^3.3.4",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@supabase/supabase-js": "^2.39.3",
    "@tanstack/react-query": "^5.17.19",
    "@tanstack/react-query-devtools": "^5.17.19",
    "@tanstack/react-virtual": "^3.0.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "date-fns": "^3.2.0",
    "lucide-react": "^0.312.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.52.0",
    "react-router-dom": "^6.21.3",
    "tailwind-merge": "^2.2.1",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.23.8",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@cf-office-hours/config": "*",
    "@playwright/test": "^1.50.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "jsdom": "^24.0.0",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "vite": "^5.0.12",
    "vitest": "^3.0.0"
  }
}
```

**Backend API (apps/api/package.json):**
```json
{
  "name": "@cf-office-hours/api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "build": "esbuild src/index.ts --bundle --format=esm --outfile=dist/index.js",
    "deploy": "wrangler deploy",
    "deploy:staging": "wrangler deploy --env staging",
    "test": "vitest run",
    "test:watch": "vitest",
    "tail": "wrangler tail"
  },
  "dependencies": {
    "@cf-office-hours/shared": "*",
    "@hono/zod-openapi": "^0.9.5",
    "@supabase/supabase-js": "^2.39.3",
    "airtable": "^0.12.2",
    "googleapis": "^131.0.0",
    "hono": "^4.0.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@cf-office-hours/config": "*",
    "@cloudflare/workers-types": "^4.20240117.0",
    "esbuild": "^0.20.0",
    "vitest": "^3.0.0",
    "wrangler": "^3.78.12"
  }
}
```

**Shared Package (packages/shared/package.json):**
```json
{
  "name": "@cf-office-hours/shared",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types/*": "./src/types/*.ts",
    "./schemas/*": "./src/schemas/*.ts",
    "./constants/*": "./src/constants/*.ts",
    "./utils/*": "./src/utils/*.ts"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@cf-office-hours/config": "*",
    "typescript": "^5.7.2"
  }
}
```

**Shared Config Package (packages/config/package.json):**
```json
{
  "name": "@cf-office-hours/config",
  "version": "1.0.0",
  "private": true,
  "files": [
    "eslint",
    "typescript"
  ]
}
```

## 9.4 TypeScript Configuration

**Root TypeScript Config (tsconfig.json):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "incremental": true,
    "composite": false
  },
  "exclude": ["node_modules", "dist", ".wrangler", "build"]
}
```

**Base TypeScript Config (packages/config/typescript/tsconfig.base.json):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true
  }
}
```

**Frontend TypeScript Config (apps/web/tsconfig.json):**
```json
{
  "extends": "../../packages/config/typescript/tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../../packages/shared/src/*"]
    },
    "types": ["vite/client", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [
    { "path": "../../packages/shared" }
  ]
}
```

**Backend TypeScript Config (apps/api/tsconfig.json):**
```json
{
  "extends": "../../packages/config/typescript/tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../../packages/shared/src/*"]
    }
  },
  "include": ["src"],
  "references": [
    { "path": "../../packages/shared" }
  ]
}
```

**Shared Package TypeScript Config (packages/shared/tsconfig.json):**
```json
{
  "extends": "../config/typescript/tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

## 9.5 ESLint Configuration

**Base ESLint Config (packages/config/eslint/base.js):**
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
  },
  env: {
    node: true,
    es2022: true,
  },
};
```

**Frontend ESLint Config (apps/web/.eslintrc.cjs):**
```javascript
module.exports = {
  extends: ['../../packages/config/eslint/base.js'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
  },
  rules: {
    'react/react-in-jsx-scope': 'off', // Not needed in React 18+
  },
};
```

**Backend ESLint Config (apps/api/.eslintrc.cjs):**
```javascript
module.exports = {
  extends: ['../../packages/config/eslint/base.js'],
  env: {
    node: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off', // Allow any for Hono context
  },
};
```

## 9.6 Build Pipeline & Scripts

**API Type Generation Script (scripts/generate-api-types.ts):**
```typescript
// scripts/generate-api-types.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:8787';
const OUTPUT_FILE = path.join(
  __dirname,
  '../packages/shared/src/types/api.generated.ts'
);

async function generateTypes() {
  console.log('🔄 Fetching OpenAPI spec from:', `${API_URL}/api/openapi.json`);

  try {
    // Generate TypeScript types from OpenAPI spec
    execSync(
      `npx openapi-typescript ${API_URL}/api/openapi.json -o ${OUTPUT_FILE}`,
      { stdio: 'inherit' }
    );

    console.log('✅ API types generated successfully!');
    console.log('📄 Output:', OUTPUT_FILE);
  } catch (error) {
    console.error('❌ Failed to generate API types:', error);
    process.exit(1);
  }
}

generateTypes();
```

**Development Setup Script (scripts/setup-dev.ts):**
```typescript
// scripts/setup-dev.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ENV_EXAMPLE_FILES = [
  { from: 'apps/web/.env.example', to: 'apps/web/.env' },
  { from: 'apps/api/.env.example', to: 'apps/api/.env' },
];

function setupEnvironmentFiles() {
  console.log('🔧 Setting up environment files...\n');

  for (const { from, to } of ENV_EXAMPLE_FILES) {
    const fromPath = path.join(__dirname, '..', from);
    const toPath = path.join(__dirname, '..', to);

    if (!fs.existsSync(toPath)) {
      if (fs.existsSync(fromPath)) {
        fs.copyFileSync(fromPath, toPath);
        console.log(`✅ Created ${to} from ${from}`);
      } else {
        console.warn(`⚠️  Warning: ${from} not found`);
      }
    } else {
      console.log(`ℹ️  ${to} already exists, skipping`);
    }
  }
}

function installDependencies() {
  console.log('\n📦 Installing dependencies...\n');
  execSync('npm install', { stdio: 'inherit' });
}

function setupGitHooks() {
  console.log('\n🪝 Setting up git hooks...\n');
  // Add Husky or other git hook setup if needed
}

function main() {
  console.log('🚀 CF Office Hours - Development Setup\n');
  console.log('=====================================\n');

  setupEnvironmentFiles();
  installDependencies();
  setupGitHooks();

  console.log('\n✨ Setup complete! Run `npm run dev` to start development.\n');
}

main();
```

## 9.7 Development Workflow Commands

**Common Development Tasks:**

```bash
# Initial setup
npm run setup

# Start all apps in development mode
npm run dev

# Start specific app
npm run dev:web      # Frontend only
npm run dev:api      # Backend only

# Build all apps
npm run build

# Build specific app
npm run build:web
npm run build:api

# Run tests
npm run test         # All tests
npm run test:web     # Frontend unit tests
npm run test:api     # Backend unit tests
npm run test:e2e     # E2E tests (Playwright)

# Code quality
npm run lint         # Check all code
npm run lint:fix     # Auto-fix issues
npm run format       # Format all files
npm run format:check # Check formatting
npm run type-check   # TypeScript check all packages

# Generate API types from OpenAPI spec
npm run generate:api-types

# Clean all build artifacts and node_modules
npm run clean

# Deploy (production)
npm run build
npm run deploy:api   # Deploy API to Cloudflare Workers
npm run deploy:web   # Deploy frontend to Cloudflare Pages
```

## 9.8 Environment Variables

**Frontend (.env.example):**
```bash
# apps/web/.env.example

# API Configuration
VITE_API_BASE_URL=http://localhost:8787/v1

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Feature Flags
VITE_ENABLE_REALTIME=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true

# OAuth Redirect URLs (for local development)
VITE_GOOGLE_OAUTH_REDIRECT=http://localhost:3000/auth/callback
VITE_MICROSOFT_OAUTH_REDIRECT=http://localhost:3000/auth/callback
```

**Backend (.env.example):**
```bash
# apps/api/.env.example

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Airtable Configuration
AIRTABLE_API_KEY=your-airtable-api-key
AIRTABLE_BASE_ID=your-base-id

# Security
JWT_SECRET=your-jwt-secret
WEBHOOK_SECRET=your-webhook-secret

# Environment
NODE_ENV=development
```

## 9.9 VS Code Configuration

**Workspace Settings (.vscode/settings.json):**
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.exclude": {
    "**/.git": true,
    "**/node_modules": true,
    "**/.wrangler": true,
    "**/dist": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/package-lock.json": true,
    "**/.wrangler": true,
    "**/dist": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

**Recommended Extensions (.vscode/extensions.json):**
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright",
    "cloudflare.vscode-cloudflare-workers",
    "supabase.supabase-vscode"
  ]
}
```

**Launch Configuration (.vscode/launch.json):**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test:watch", "--workspace=apps/api"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Frontend Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test:watch", "--workspace=apps/web"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## 9.10 Git Configuration

**.gitignore:**
```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/

# Production builds
dist/
build/
.wrangler/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
.idea/
*.swp
*.swo
*~

# Temporary files
tmp/
temp/
*.tmp

# Generated files
packages/shared/src/types/api.generated.ts

# Playwright
test-results/
playwright-report/
playwright/.cache/
```

**.prettierrc:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

**.editorconfig:**
```ini
# EditorConfig is awesome: https://EditorConfig.org

root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false

[*.{yml,yaml}]
indent_size = 2
```

## 9.11 Dependency Management Best Practices

**1. Version Strategy:**
- Use exact versions for critical dependencies
- Use caret (^) for development dependencies
- Lock versions with `package-lock.json`

**2. Security:**
```bash
# Regular security audits
npm audit

# Automatic fixes
npm audit fix

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

**3. Workspace Dependencies:**
```json
{
  "dependencies": {
    "@cf-office-hours/shared": "*"  // Uses local workspace version
  }
}
```

**4. Hoisting:**
npm workspaces automatically hoists shared dependencies to the root `node_modules`, reducing duplication.

## 9.12 Build Optimization

**Vite Build Optimization (apps/web/vite.config.ts):**
```typescript
export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
    sourcemap: true,
  },
});
```

**esbuild for Workers (apps/api):**
Workers uses esbuild via Wrangler, configured in `wrangler.toml`:
```toml
[build]
command = "npm run build"

[build.upload]
format = "service-worker"
```

## 9.13 Continuous Integration

**GitHub Actions Test Workflow (.github/workflows/test.yml):**
```yaml
name: Test

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Run tests
        run: npm run test
      
      - name: E2E tests
        run: npm run test:e2e
        
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            apps/web/test-results/
            apps/web/playwright-report/
```

---

**Section 9 Complete.** This unified project structure provides:
- ✅ Complete monorepo organization with npm workspaces
- ✅ Shared packages for types, schemas, and configuration
- ✅ TypeScript project references for type checking
- ✅ Consistent ESLint and Prettier configuration
- ✅ Development scripts for common tasks
- ✅ Environment variable management
- ✅ VS Code workspace configuration
- ✅ Git and editor configurations
- ✅ Build optimization strategies
- ✅ CI/CD pipeline setup

