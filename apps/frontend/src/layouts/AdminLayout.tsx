import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { Sidebar, type NavLink } from './Sidebar';
import { Topbar } from './Topbar';

const navLinks: NavLink[] = [
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
  { to: '/raw-material-balance', label: 'Saldo Bruto', module: 'RAW_MATERIAL_BALANCE' },
];

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const user = useAuthStore((s) => s.user);

  const hasAccess = (module: string) =>
    module === 'DASHBOARD' || (user?.permissions.some((p) => p.module === module) ?? false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        navLinks={navLinks}
        hasAccess={hasAccess}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-auto bg-grafite-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
