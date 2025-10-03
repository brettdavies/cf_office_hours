# CF Office Hours Platform

Intelligent mentor-mentee matching and scheduling platform for Capital Factory.

## Quick Start

```bash
npm run setup
npm run dev
```

See [Development Workflow](docs/architecture/10-development-workflow.md) for complete setup instructions.

## Documentation

- [Product Requirements](docs/prd.md)
- [Architecture Document](docs/architecture.md)
- [User Guide](docs/user-guide/index.md) _(coming soon)_
- [Coordinator Manual](docs/coordinator-manual/index.md) _(coming soon)_

## Tech Stack

- **Frontend:** React 18.3.x + Vite 5.x + Shadcn/ui + Tailwind CSS 3.4.x
- **Backend:** Cloudflare Workers + Hono 4.x
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (Magic Links + OAuth)
- **Real-time:** Supabase Realtime
- **Testing:** Vitest 3.x + Playwright 1.50.x+
- **Monorepo:** npm workspaces

## Project Structure

```
cf-office-hours/
├── apps/
│   ├── web/          # React frontend (Cloudflare Pages)
│   └── api/          # Cloudflare Workers API
├── packages/
│   ├── shared/       # Shared types, schemas, utilities
│   └── config/       # Shared configuration (eslint, typescript)
├── docs/             # Documentation
├── scripts/          # Build and utility scripts
└── supabase/         # Database migrations
```

## Development Commands

```bash
# Development
npm run dev              # Start all services
npm run dev:web          # Start frontend only
npm run dev:api          # Start backend only

# Build
npm run build            # Build all packages
npm run build:web        # Build frontend
npm run build:api        # Build backend

# Testing
npm run test             # Run all tests
npm run test:e2e         # Run E2E tests

# Code Quality
npm run lint             # Check code quality
npm run format           # Format code
npm run type-check       # TypeScript type checking
```

## Environment Setup

1. Copy environment templates:

   ```bash
   cp apps/web/.env.example apps/web/.env
   cp apps/api/.env.example apps/api/.env
   ```

2. Fill in your Supabase and Cloudflare credentials

3. Install dependencies:
   ```bash
   npm install
   ```

## License

[License Type - To be determined]
