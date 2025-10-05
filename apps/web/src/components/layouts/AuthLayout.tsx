import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900">CF Office Hours</h2>
          <p className="mt-2 text-sm text-gray-600">Capital Factory Mentorship Platform</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
