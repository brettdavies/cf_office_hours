# Auth Issue Diagnosis & Fix - Oct 8, 2025

## Problem Summary

Production auth failing with:
- **403 errors** from Supabase: "Session from session_id claim in JWT does not exist"
- **401 errors** from API: "Invalid or expired token"
- Requests missing Authorization headers and cookies

## Root Cause

Supabase JS client not persisting auth tokens in browser storage after magic link redirect.

**Evidence from HAR file:**
- Magic link redirect includes tokens in URL hash: `#access_token=...&refresh_token=...`
- Zero cookies sent in subsequent requests to `/auth/v1/user`
- Zero Authorization headers sent to API endpoints
- Multiple requests fired rapidly, some succeed (200), then all fail (403)

## Changes Made

### 1. Updated Supabase Client Configuration
**File:** `apps/web/src/services/supabase.ts`

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage, // ← ADDED: Explicit storage
    storageKey: 'sb-auth-token',  // ← ADDED: Custom key
    flowType: 'pkce',              // ← ADDED: PKCE flow for SPAs
  },
});
```

**Why:**
- Explicitly specify localStorage (may fix edge cases where default fails)
- Custom storage key to avoid conflicts
- PKCE flow is more secure for Single Page Apps

### 2. Added Storage Availability Check
Added debug logging to verify localStorage is accessible.

## Deployment Instructions

```bash
# Build frontend
npm run build:web

# Deploy to Cloudflare Pages
# (Use your deployment method - Wrangler, git push, etc.)
```

## Testing Steps

1. **Clear browser state:**
   - Clear all cookies for `officehours.youcanjustdothings.io`
   - Clear localStorage
   - Use incognito/private window if needed

2. **Test auth flow:**
   - Go to login page
   - Request magic link
   - Click magic link in email
   - Should redirect to `/auth/callback` → `/dashboard`

3. **Check browser DevTools:**
   - **Console:** Look for `[Supabase]` and `[AUTH]` logs
   - **Application > Local Storage:** Should see `sb-auth-token` key after login
   - **Network > auth/v1/user:** Should have Authorization header or cookies
   - **Network > api/.../users/me:** Should have `Authorization: Bearer ...` header

## If Still Broken

### Check Supabase Dashboard Settings

URL: `https://mwkptgdsoxlvxyeexwbf.supabase.co/project/_/auth/settings`

Verify:
- ✅ **Site URL:** `https://officehours.youcanjustdothings.io`
- ✅ **Redirect URLs:** Include `https://officehours.youcanjustdothings.io/auth/callback`
- ✅ **Email Auth:** Enabled
- ✅ **Confirm email:** Disabled (for easier testing)
- ✅ **Mailer Rate Limits:** Not exceeded

### Possible Additional Causes

1. **Browser Privacy Settings:**
   - Third-party cookies disabled
   - localStorage disabled
   - Browser extensions blocking storage

2. **Cloudflare Pages Configuration:**
   - Check `_headers` file for CORS/CSP rules
   - Verify no service workers interfering

3. **Magic Link Reuse:**
   - Magic links are one-time use
   - They expire after 1 hour (default)
   - Always test with fresh magic link

4. **Session Deletion:**
   - Check if Supabase has session cleanup policies
   - Verify sessions aren't being deleted by another process

## HAR File Analysis Results

**Timeline from HAR:**
- `21:47:29.781Z` - Magic link verify request (303 redirect)
- `21:47:30.194Z` - First `/auth/v1/user` request (200 OK)
- `21:47:30.595Z` - `/auth/v1/user` starts failing (403)
- All requests within **400ms** of each other
- Session ID in failing requests: `5bbe1399-4cdd-46f5-ad2a-207a164d2678`

**Hypothesis:** Session created but immediately invalidated or not properly persisted.

## Next Steps if Issue Persists

1. Add explicit error handling to catch storage failures
2. Implement fallback auth flow (server-side session cookies)
3. Add retry logic with exponential backoff
4. Consider switching to OAuth flow instead of magic links
5. Check Supabase project logs for session deletion events

## Contact

- Supabase Support: https://supabase.com/dashboard/support
- Supabase Discord: https://discord.supabase.com/
