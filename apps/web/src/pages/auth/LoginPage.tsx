import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAs } from '@/services/auth';
import { useNotificationStore } from '@/stores/notificationStore';
import { Button } from '@/components/ui/button';

type Role = 'mentee' | 'mentor' | 'coordinator';

const ROLES: { role: Role; label: string }[] = [
  { role: 'mentee', label: 'Mentee' },
  { role: 'mentor', label: 'Mentor' },
  { role: 'coordinator', label: 'Coordinator' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [loadingRole, setLoadingRole] = useState<Role | null>(null);
  const addToast = useNotificationStore(state => state.addToast);

  const handleLoginAs = async (role: Role) => {
    setLoadingRole(role);
    try {
      await loginAs(role);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Failed to sign in';
      addToast({ title: 'Error', description, variant: 'error' });
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">CF Office Hours Demo</h1>
        <p className="text-sm text-muted-foreground">Choose a role to explore the demo</p>
      </div>
      <div className="flex flex-col gap-3">
        {ROLES.map(({ role, label }) => (
          <Button key={role} onClick={() => handleLoginAs(role)} disabled={loadingRole !== null}>
            {loadingRole === role ? 'Signing in...' : `Login as ${label}`}
          </Button>
        ))}
      </div>
    </div>
  );
}
