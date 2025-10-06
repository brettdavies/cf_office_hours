# CF Office Hours - Frontend

React-based frontend for the Capital Factory Office Hours platform.

## Technology Stack

- **React 18.3** - UI library
- **TypeScript 5.7** - Type safety
- **Vite 5.x** - Build tool and dev server
- **React Router 6.x** - Client-side routing
- **Zustand 5.x** - State management
- **Supabase Auth** - Authentication
- **Tailwind CSS 3.4** - Styling
- **Shadcn/ui** - UI components
- **React Query** - Server state management

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase CLI (for local development)

### Installation

```bash
# Install dependencies (from root of monorepo)
npm install
```

### Local Development Setup

#### 1. Start Local Supabase

```bash
# Start local Supabase instance (includes Auth, Database, Storage, Inbucket email)
npx supabase start
```

This will output important information including:

- API URL: http://localhost:54321
- Studio URL: http://localhost:54323 (database admin UI)
- Inbucket URL: http://localhost:54324 (email inbox for testing)
- **anon key** - Copy this for the next step
- service_role key - For backend use only

#### 2. Configure Environment Variables

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Update the `.env` file with your local Supabase credentials:

```bash
# Supabase Configuration (from `npx supabase start` output)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<paste-anon-key-from-supabase-start>

# API Configuration
VITE_API_BASE_URL=http://localhost:8787/v1
```

#### 3. Start Development Server

```bash
# From root of monorepo
npm run dev:web

# Or from apps/web directory
npm run dev
```

The app will be available at http://localhost:3000

## Authentication Flow

### Magic Link Authentication

This application uses passwordless authentication via magic links:

1. **User enters email** on the login page (`/auth/login`)
2. **Magic link sent** to email (viewable in Inbucket at http://localhost:54324)
3. **User clicks magic link** - redirects to `/auth/callback`
4. **Session established** - user authenticated and redirected to dashboard
5. **Session persisted** in localStorage - survives page refreshes

### Testing Authentication Locally

1. Navigate to http://localhost:3000
2. You'll be redirected to `/auth/login`
3. Enter any email address (e.g., `test@example.com`)
4. Click "Send Magic Link"
5. Open http://localhost:54324 (Inbucket) to view the email
6. Click the magic link in the email
7. You'll be redirected to the dashboard
8. Refresh the page - you should remain authenticated

### Viewing Test Emails

All emails sent during local development are captured by **Inbucket**:

- URL: http://localhost:54324
- No real emails are sent
- Magic links work exactly as they would in production

### Sign Out

Click the "Sign Out" button in the navigation bar to:

- Clear the session from localStorage
- Sign out from Supabase Auth
- Redirect to the login page

## Project Structure

```
apps/web/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── common/      # Shared components (ProtectedRoute)
│   │   ├── layouts/     # Layout components (AuthLayout)
│   │   └── ui/          # Shadcn/ui components (Button, Input, Toast)
│   ├── hooks/           # Custom React hooks (useAuth)
│   ├── lib/             # Utility functions
│   ├── pages/           # Route components
│   │   ├── auth/        # Auth pages (LoginPage, CallbackPage)
│   │   └── dashboard/   # Dashboard pages
│   ├── services/        # API clients (supabase)
│   ├── stores/          # Zustand stores (authStore, notificationStore)
│   ├── App.tsx          # Root component
│   ├── main.tsx         # Entry point
│   ├── router.tsx       # React Router configuration
│   └── index.css        # Global styles (Tailwind)
├── .env                 # Local environment variables (gitignored)
├── .env.example         # Environment variables template
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
```

## Key Features Implemented

### Epic 0 (Current)

- ✅ Magic link authentication via Supabase Auth
- ✅ Session management with localStorage persistence
- ✅ Protected route enforcement
- ✅ Auto-refresh token handling
- ✅ Sign-out functionality
- ✅ Toast notifications (success/error)

### Future Epics

- ❌ Email whitelist validation - Epic 2
- ❌ Google OAuth - Epic 2
- ❌ Microsoft OAuth - Epic 2
- ❌ Production Supabase configuration - Post-Epic-0

## Troubleshooting

### "Missing Supabase environment variables" Error

**Cause**: `.env` file is missing or incomplete

**Solution**:

1. Ensure `.env` file exists in `apps/web/`
2. Run `npx supabase start` and copy the `anon key`
3. Update `VITE_SUPABASE_ANON_KEY` in `.env`

### Magic Link Email Not Received

**Cause**: Local Supabase not running

**Solution**:

1. Run `npx supabase start`
2. Check http://localhost:54324 (Inbucket) for emails

### Session Not Persisting

**Cause**: localStorage cleared or session expired

**Solution**:

1. Check browser console for errors
2. Clear localStorage and re-authenticate
3. Ensure Supabase Auth is running

### Port 3000 Already in Use

**Solution**:

```bash
# Kill process on port 3000
npx kill-port 3000

# Or change port in vite.config.ts
```

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [React Router Documentation](https://reactrouter.com/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
