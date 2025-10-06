import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div>
              <h1 className="text-xl font-bold">CF Office Hours</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/profile">
                <Button variant="ghost">Profile</Button>
              </Link>
              <span className="text-sm text-gray-700">{user?.email}</span>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Welcome to CF Office Hours</h2>
          <p className="text-gray-600">
            You're successfully authenticated! This is a protected route.
          </p>
          <div className="mt-6 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">User Info:</h3>
            <pre className="text-sm">{JSON.stringify(user, null, 2)}</pre>
          </div>
        </div>
      </main>
    </div>
  );
}
