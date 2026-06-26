import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { login } from '@/services/auth';
import { useNotificationStore } from '@/stores/notificationStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isValidEmail } from '@/lib/validators';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('u');

  // Initialize email state with query parameter if valid
  const [email, setEmail] = useState(() => {
    if (emailParam) {
      // URL decoding converts '+' to space, but email '+' is valid (e.g., test+tag@gmail.com)
      // Convert spaces back to '+' before validation to support unencoded URLs
      const normalizedEmail = emailParam.replace(/\s/g, '+');
      if (isValidEmail(normalizedEmail)) {
        return normalizedEmail;
      }
    }
    return '';
  });
  const [loading, setLoading] = useState(false);
  const addToast = useNotificationStore(state => state.addToast);

  const handleSignIn = async () => {
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
      await login(email);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Failed to sign in';
      addToast({ title: 'Error', description, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSignIn();
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="text-sm text-muted-foreground">Enter your email to access the demo</p>
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
        <Button onClick={handleSignIn} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </div>
    </div>
  );
}
