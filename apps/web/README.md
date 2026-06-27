# CF Office Hours - Frontend

React-based frontend for the Office Hours platform, served as static assets from a Cloudflare Worker.

## Technology Stack

- **React 18.3** - UI library
- **TypeScript 5.7** - Type safety
- **Vite 5.x** - Build tool and dev server
- **React Router 6.x** - Client-side routing
- **Zustand 5.x** - State management
- **React Query** - Server state management and polling
- **Tailwind CSS 3.4** - Styling
- **Shadcn/ui** - UI components

## Getting Started

### Prerequisites

- Node.js 22+
- npm 10+

### Installation

```bash
# Install dependencies (from root of monorepo)
npm install
```

### Local Development Setup

#### 1. Configure Environment Variables

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

The web reads a single variable, the base URL of the API:

```bash
# apps/web/.env
VITE_API_BASE_URL=http://localhost:8787/v1
```

`VITE_API_BASE_URL` is a build-time variable: the `build:staging` / `build:production` scripts bake the correct URL into
the bundle, so no runtime configuration is needed in deployed environments.

#### 2. Start the API

The frontend talks to the local API; start it first (see `apps/api/README.md`):

```bash
npm run dev:api
```

#### 3. Start the Development Server

```bash
# From root of monorepo
npm run dev:web

# Or from apps/web directory
npm run dev
```

The app is available at `http://localhost:3000`.

## Authentication Flow

This is a demo application with no signup. The login page (`/auth/login`) presents three **"Login as …"** buttons, one
per role (mentee, mentor, coordinator):

1. **User clicks a role button** on the login page
2. **The app calls** `POST /v1/auth/demo-login` with the chosen role
3. **The API returns a signed session JWT** for a random existing user of that role
4. **Session established** — the token and user are stored in `localStorage` (`cf_oh_token` / `cf_oh_user`)
5. **Session persists** across page refreshes until sign-out

### Sign Out

Click "Sign Out" in the navigation bar to clear the session from `localStorage` and return to the login page.

## Project Structure

```text
apps/web/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── common/      # Shared components (ProtectedRoute)
│   │   ├── layouts/     # Layout components (AuthLayout)
│   │   └── ui/          # Shadcn/ui components (Button, Input, Toast)
│   ├── hooks/           # Custom React hooks (useAuth, useMyBookings)
│   ├── lib/             # Utility functions
│   ├── pages/           # Route components
│   │   ├── auth/        # Auth pages (LoginPage)
│   │   └── dashboard/   # Dashboard pages
│   ├── services/        # API client and auth/session helpers
│   ├── stores/          # Zustand stores (authStore, notificationStore)
│   ├── App.tsx          # Root component
│   ├── main.tsx         # Entry point
│   ├── router.tsx       # React Router configuration
│   └── index.css        # Global styles (Tailwind)
├── .env                 # Local environment variables (gitignored)
├── .env.example         # Environment variables template
├── wrangler.jsonc       # Cloudflare Workers static-assets configuration
├── index.html           # HTML entry point
├── package.json         # Dependencies
├── tailwind.config.ts   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## Available Scripts

```bash
# Development
npm run dev              # Start dev server (port 3000)

# Build
npm run build            # Build for production
npm run build:staging    # Build with the staging API base URL baked in
npm run build:production # Build with the production API base URL baked in

# Preview production build
npm run preview

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run E2E tests (Playwright)
npm run test:e2e:ui      # Run E2E tests with UI

# Linting & Formatting
npm run lint             # Run ESLint (from root)
npm run format           # Format with Prettier (from root)

# Deployment
npm run deploy:staging    # Build + deploy to the staging Worker
npm run deploy:production  # Build + deploy to the production Worker
```

## Troubleshooting

### Login does nothing / network error

**Cause**: the API is not running or `VITE_API_BASE_URL` points at the wrong host.

**Solution**: start the API with `npm run dev:api`, and confirm `VITE_API_BASE_URL` in `.env` matches the API URL
(`http://localhost:8787/v1` by default).

### Session Not Persisting

**Cause**: `localStorage` cleared or the token expired.

**Solution**: re-authenticate from `/auth/login`. Check the browser console for errors.

### Port 3000 Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or change the port in vite.config.ts
```

## Additional Resources

- [React Router Documentation](https://reactrouter.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
