import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { ProtectedRoute, BuyerRoute } from './ProtectedRoute';

const LoginPage = lazy(() =>
  import('../pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const DashboardPage = lazy(() =>
  import('../pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const BuyerPortalPage = lazy(() =>
  import('../pages/portal/BuyerPortalPage').then((m) => ({ default: m.BuyerPortalPage })),
);

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<Loading />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            path: 'dashboard',
            element: (
              <Suspense fallback={<Loading />}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: 'cooperative',
            element: <div className="text-gray-500 p-4">Cooperativa — em breve</div>,
          },
          {
            path: 'users',
            element: <div className="text-gray-500 p-4">Usuários — em breve</div>,
          },
          {
            path: 'profiles',
            element: <div className="text-gray-500 p-4">Perfis — em breve</div>,
          },
        ],
      },
    ],
  },
  {
    path: '/portal',
    element: <BuyerRoute />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Loading />}>
            <BuyerPortalPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <LoginPage />,
  },
]);
