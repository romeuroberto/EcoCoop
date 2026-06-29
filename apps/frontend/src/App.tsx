import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useAuthStore } from './store/auth.store';

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full" />
    </div>
  );
}

export function App() {
  const initializeSession = useAuthStore((s) => s.initializeSession);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  if (isInitializing) return <Spinner />;

  return <RouterProvider router={router} />;
}
