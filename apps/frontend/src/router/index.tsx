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

// US1 — Member Roles
const MemberRoleListPage = lazy(() =>
  import('../pages/member-roles/MemberRoleListPage').then((m) => ({ default: m.MemberRoleListPage })),
);

// US1 — Members
const MemberListPage = lazy(() =>
  import('../pages/members/MemberListPage').then((m) => ({ default: m.MemberListPage })),
);
const MemberFormPage = lazy(() =>
  import('../pages/members/MemberFormPage').then((m) => ({ default: m.MemberFormPage })),
);

// US2 — Material Categories
const MaterialCategoryListPage = lazy(() =>
  import('../pages/material-categories/MaterialCategoryListPage').then((m) => ({ default: m.MaterialCategoryListPage })),
);
const MaterialCategoryFormPage = lazy(() =>
  import('../pages/material-categories/MaterialCategoryFormPage').then((m) => ({ default: m.MaterialCategoryFormPage })),
);

// US2 — Material Subcategories
const MaterialSubcategoryListPage = lazy(() =>
  import('../pages/material-subcategories/MaterialSubcategoryListPage').then((m) => ({ default: m.MaterialSubcategoryListPage })),
);
const MaterialSubcategoryFormPage = lazy(() =>
  import('../pages/material-subcategories/MaterialSubcategoryFormPage').then((m) => ({ default: m.MaterialSubcategoryFormPage })),
);

// US3 — Units of Measure
const UnitListPage = lazy(() =>
  import('../pages/units/UnitListPage').then((m) => ({ default: m.UnitListPage })),
);
const UnitFormPage = lazy(() =>
  import('../pages/units/UnitFormPage').then((m) => ({ default: m.UnitFormPage })),
);

// US4 — Buyers
const BuyerListPage = lazy(() =>
  import('../pages/buyers/BuyerListPage').then((m) => ({ default: m.BuyerListPage })),
);
const BuyerFormPage = lazy(() =>
  import('../pages/buyers/BuyerFormPage').then((m) => ({ default: m.BuyerFormPage })),
);

// US5 — Vehicles
const VehicleListPage = lazy(() =>
  import('../pages/vehicles/VehicleListPage').then((m) => ({ default: m.VehicleListPage })),
);
const VehicleFormPage = lazy(() =>
  import('../pages/vehicles/VehicleFormPage').then((m) => ({ default: m.VehicleFormPage })),
);

// US6 — EPI Types
const EpiTypeListPage = lazy(() =>
  import('../pages/epi-types/EpiTypeListPage').then((m) => ({ default: m.EpiTypeListPage })),
);
const EpiTypeFormPage = lazy(() =>
  import('../pages/epi-types/EpiTypeFormPage').then((m) => ({ default: m.EpiTypeFormPage })),
);

// US7 — Cost Centers
const CostCenterListPage = lazy(() =>
  import('../pages/cost-centers/CostCenterListPage').then((m) => ({ default: m.CostCenterListPage })),
);
const CostCenterFormPage = lazy(() =>
  import('../pages/cost-centers/CostCenterFormPage').then((m) => ({ default: m.CostCenterFormPage })),
);

// Phase 3 — Collection Points
const CollectionPointsPage = lazy(() =>
  import('../pages/collection-points/CollectionPointsPage').then((m) => ({ default: m.CollectionPointsPage })),
);
const CollectionPointFormPage = lazy(() =>
  import('../pages/collection-points/CollectionPointFormPage').then((m) => ({ default: m.CollectionPointFormPage })),
);

// Phase 3 — Collection Routes
const CollectionRoutesPage = lazy(() =>
  import('../pages/collection-routes/CollectionRoutesPage').then((m) => ({ default: m.CollectionRoutesPage })),
);
const CollectionRouteFormPage = lazy(() =>
  import('../pages/collection-routes/CollectionRouteFormPage').then((m) => ({ default: m.CollectionRouteFormPage })),
);
const CollectionRouteDetailPage = lazy(() =>
  import('../pages/collection-routes/CollectionRouteDetailPage').then((m) => ({ default: m.CollectionRouteDetailPage })),
);

// Phase 3 — Raw Material Entries
const RawMaterialEntriesPage = lazy(() =>
  import('../pages/raw-material/RawMaterialEntriesPage').then((m) => ({ default: m.RawMaterialEntriesPage })),
);

// Phase 3 — Raw Material Balance
const RawMaterialBalancePage = lazy(() =>
  import('../pages/raw-material/RawMaterialBalancePage').then((m) => ({ default: m.RawMaterialBalancePage })),
);

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
  </div>
);

const S = (C: React.ComponentType) => (
  <Suspense fallback={<Loading />}>
    <C />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: S(LoginPage),
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: 'dashboard', element: S(DashboardPage) },
          { path: 'cooperative', element: <div className="text-gray-500 p-4">Cooperativa — em breve</div> },
          { path: 'users', element: <div className="text-gray-500 p-4">Usuários — em breve</div> },
          { path: 'profiles', element: <div className="text-gray-500 p-4">Perfis — em breve</div> },

          // US1 — Member Roles
          { path: 'member-roles', element: S(MemberRoleListPage) },

          // US1 — Members
          { path: 'members', element: S(MemberListPage) },
          { path: 'members/:id', element: S(MemberFormPage) },

          // US2 — Material Categories
          { path: 'material-categories', element: S(MaterialCategoryListPage) },
          { path: 'material-categories/:id', element: S(MaterialCategoryFormPage) },

          // US2 — Material Subcategories
          { path: 'material-subcategories', element: S(MaterialSubcategoryListPage) },
          { path: 'material-subcategories/:id', element: S(MaterialSubcategoryFormPage) },

          // US3 — Units of Measure
          { path: 'units', element: S(UnitListPage) },
          { path: 'units/:id', element: S(UnitFormPage) },

          // US4 — Buyers
          { path: 'buyers', element: S(BuyerListPage) },
          { path: 'buyers/:id', element: S(BuyerFormPage) },

          // US5 — Vehicles
          { path: 'vehicles', element: S(VehicleListPage) },
          { path: 'vehicles/:id', element: S(VehicleFormPage) },

          // US6 — EPI Types
          { path: 'epi-types', element: S(EpiTypeListPage) },
          { path: 'epi-types/:id', element: S(EpiTypeFormPage) },

          // US7 — Cost Centers
          { path: 'cost-centers', element: S(CostCenterListPage) },
          { path: 'cost-centers/:id', element: S(CostCenterFormPage) },

          // Phase 3 — Collection Points
          { path: 'collection-points', element: S(CollectionPointsPage) },
          { path: 'collection-points/new', element: S(CollectionPointFormPage) },
          { path: 'collection-points/:id', element: S(CollectionPointFormPage) },

          // Phase 3 — Collection Routes
          { path: 'collection-routes', element: S(CollectionRoutesPage) },
          { path: 'collection-routes/new', element: S(CollectionRouteFormPage) },
          { path: 'collection-routes/:id', element: S(CollectionRouteDetailPage) },
          { path: 'collection-routes/:id/edit', element: S(CollectionRouteFormPage) },
          { path: 'collection-routes/:id/material-entries', element: S(RawMaterialEntriesPage) },

          // Phase 3 — Raw Material Balance
          { path: 'raw-material-balance', element: S(RawMaterialBalancePage) },
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
        element: S(BuyerPortalPage),
      },
    ],
  },
  {
    path: '*',
    element: S(LoginPage),
  },
]);
