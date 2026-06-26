/**
 * Client-side auth for the demo.
 *
 * A Worker-issued session JWT is stored in localStorage. Login posts an
 * allowlisted email to the API and receives a token; there is no signup.
 */

export interface AuthUser {
  id: string;
  email: string;
  role: 'mentee' | 'mentor' | 'coordinator';
}

export interface AuthSession {
  access_token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'cf_oh_token';
const USER_KEY = 'cf_oh_user';
const AUTH_EVENT = 'cf-auth-change';

const apiBase = (): string => import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

/** Current session token, or null if signed out. */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Reconstruct the session (token + user) from storage. */
export function getSession(): AuthSession | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  if (!token || !userRaw) return null;
  try {
    return { access_token: token, user: JSON.parse(userRaw) as AuthUser };
  } catch {
    return null;
  }
}

/**
 * Subscribe to auth changes (login/logout), including other tabs.
 *
 * @returns Unsubscribe function
 */
export function onAuthChange(handler: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY || e.key === null) handler();
  };
  window.addEventListener(AUTH_EVENT, handler);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(AUTH_EVENT, handler);
    window.removeEventListener('storage', onStorage);
  };
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

/**
 * Exchange an allowlisted email for a session token, persisting it.
 *
 * @param email - The email to authenticate
 * @returns The established session
 * @throws Error with the API message when the email is not on the allowlist
 */
export async function login(email: string): Promise<AuthSession> {
  const res = await fetch(`${apiBase()}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(data?.error?.message || 'Login failed');
  }

  const data = (await res.json()) as LoginResponse;
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  window.dispatchEvent(new Event(AUTH_EVENT));
  return { access_token: data.access_token, user: data.user };
}

/** Clear the stored session and notify subscribers. */
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}
