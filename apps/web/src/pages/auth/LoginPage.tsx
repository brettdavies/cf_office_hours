import { useState } from 'react';
import { supabase } from '@/services/supabase';
import { useNotificationStore } from '@/stores/notificationStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
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
        console.log('[LoginPage] Sending magic link:', {
          email,
          redirectUrl,
          origin: window.location.origin,
        });
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (import.meta.env.DEV) {
        console.log('[LoginPage] signInWithOtp result:', { error });
      }

      if (error) throw error;

      addToast({
        title: 'Check your email',
        description: 'We sent you a magic link to sign in.',
        variant: 'success',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send magic link';
      if (import.meta.env.DEV) {
        console.error('[LoginPage] Error sending magic link:', error);
      }
      addToast({
        title: 'Error',
        description: errorMessage,
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
