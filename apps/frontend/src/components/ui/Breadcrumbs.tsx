import { Link, useLocation } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// Covers every authenticated route segment present in apps/frontend/src/router/index.tsx
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  cooperative: 'Cooperativa',
  users: 'Usuários',
  profiles: 'Perfis',
  'member-roles': 'Funções',
  members: 'Cooperados',
  'material-categories': 'Categorias',
  'material-subcategories': 'Subcategorias',
  units: 'Unidades',
  buyers: 'Compradores',
  vehicles: 'Veículos',
  'epi-types': 'Tipos de EPI',
  'cost-centers': 'Centros de Custo',
  'collection-points': 'Pontos de Coleta',
  'collection-routes': 'Rotas de Coleta',
  'raw-material-balance': 'Saldo Bruto',
  'material-entries': 'Entradas de Material',
  new: 'Novo',
  edit: 'Editar',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_ID_RE = /^\d+$/;

function isRawId(segment: string): boolean {
  return UUID_RE.test(segment) || NUMERIC_ID_RE.test(segment);
}

function buildItems(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];

  segments.forEach((segment, index) => {
    if (isRawId(segment)) {
      // Substitute raw IDs with 'Detalhe', no href (not navigable standalone)
      items.push({ label: 'Detalhe' });
      return;
    }

    const label = SEGMENT_LABELS[segment];
    if (!label) {
      // Unknown segment: skip rather than show raw URL text
      return;
    }

    const href = '/' + segments.slice(0, index + 1).join('/');
    items.push({ label, href });
  });

  return items;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const { pathname } = useLocation();
  const resolved = items ?? buildItems(pathname);

  if (resolved.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center flex-wrap gap-1 text-sm">
        {resolved.map((item, index) => {
          const isLast = index === resolved.length - 1;
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <span className="text-grafite-400 select-none" aria-hidden="true">
                  /
                </span>
              )}
              {isLast ? (
                <span aria-current="page" className="font-medium text-grafite-900">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className="text-petroleo-600 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-grafite-600">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
