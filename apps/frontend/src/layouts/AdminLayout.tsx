import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', module: 'DASHBOARD' },
  { to: '/cooperative', label: 'Cooperativa', module: 'COOPERATIVE' },
  { to: '/users', label: 'Usuários', module: 'USERS' },
  { to: '/profiles', label: 'Perfis', module: 'PROFILES' },
  { to: '/member-roles', label: 'Funções', module: 'MEMBER_ROLES' },
  { to: '/members', label: 'Cooperados', module: 'MEMBERS' },
  { to: '/material-categories', label: 'Categorias', module: 'MATERIALS' },
  { to: '/material-subcategories', label: 'Subcategorias', module: 'MATERIALS' },
  { to: '/units', label: 'Unidades', module: 'UNITS' },
  { to: '/buyers', label: 'Compradores', module: 'BUYERS' },
  { to: '/vehicles', label: 'Veículos', module: 'VEHICLES' },
  { to: '/epi-types', label: 'Tipos de EPI', module: 'EPI_TYPES' },
  { to: '/cost-centers', label: 'Centros de Custo', module: 'COST_CENTERS' },
  { to: '/collection-points', label: 'Pontos de Coleta', module: 'COLLECTION_POINTS' },
  { to: '/collection-routes', label: 'Rotas de Coleta', module: 'COLLECTION_ROUTES' },
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
    module === 'DASHBOARD' || (user?.permissions.some((p) => p.module === module) ?? false);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="px-6 py-4 border-b">
          <img
            src="/brand/logo-horizontal-color.png"
            alt="EcoCoop"
            className="h-16 w-auto max-w-full object-contain"
          />
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map((link) =>
            hasAccess(link.module) ? (
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
