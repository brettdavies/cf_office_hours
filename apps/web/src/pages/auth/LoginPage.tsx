import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import { useNotificationStore } from '@/stores/notificationStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/error-messages';
import { isValidEmail } from '@/lib/validators';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('u');

  // Initialize email state with query parameter if valid
  const [email, setEmail] = useState(() => {
    if (emailParam && isValidEmail(emailParam)) {
      return emailParam;
    }
    return '';
  });
  const [loading, setLoading] = useState(false);
  const addToast = useNotificationStore(state => state.addToast);

  const handleMagicLink = async () => {
    if (!email) {
      addToast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;

      if (import.meta.env.DEV) {
        console.log('[AUTH] Magic link send initiated', {
          email,
          redirectUrl,
          timestamp: new Date().toISOString(),
        });
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (import.meta.env.DEV) {
        console.log('[AUTH] Magic link sent', {
          email,
          redirectUrl,
          success: !error,
          error: error?.message,
          timestamp: new Date().toISOString(),
        });
      }

      if (error) throw error;

      addToast({
        title: 'Check your email',
        description: 'We sent you a magic link to sign in.',
        variant: 'success',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send magic link';

      // Determine error code based on error type
      // Note: Supabase Auth wraps database errors for security, so we infer from the message
      let errorCode: string | undefined;

      // "Database error saving new user" during signup = email not whitelisted
      // This is the only database trigger that blocks user creation
      if (errorMessage.includes('Database error saving new user')) {
        errorCode = 'EMAIL_NOT_WHITELISTED';
      }

      const userFriendlyMessage = getErrorMessage(errorCode, errorMessage);

      if (import.meta.env.DEV) {
        console.error('[ERROR] Magic link send failed', {
          email,
          error: errorMessage,
          errorCode,
          userFriendlyMessage,
          timestamp: new Date().toISOString(),
        });
      }
      addToast({
        title: 'Error',
        description: userFriendlyMessage,
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleMagicLink();
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="text-sm text-muted-foreground">Enter your email to receive a magic link</p>
      </div>
      <div className="flex flex-col gap-4">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <Button onClick={handleMagicLink} disabled={loading}>
          {loading ? 'Sending...' : 'Send Magic Link'}
        </Button>
      </div>
    </div>
  );
}
