import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', module: 'DASHBOARD' },
  { to: '/cooperative', label: 'Cooperativa', module: 'COOPERATIVE' },
  { to: '/users', label: 'Usuários', module: 'USERS' },
  { to: '/profiles', label: 'Perfis', module: 'PROFILES' },
];

export function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const hasAccess = (module: string) =>
    user?.permissions.some((p) => p.module === module) ?? false;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-brand-600">EcoCoop</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map((link) =>
            hasAccess(link.module) || link.module === 'DASHBOARD' ? (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
              >
                {link.label}
              </Link>
            ) : null,
          )}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.email} &mdash; <span className="font-medium">{user?.profileType}</span>
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Sair
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
