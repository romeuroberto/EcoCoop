import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  EmptyState,
  FilterBar,
  LoadingState,
  PageHeader,
  Pagination,
} from '../../components/ui';
import {
  collectionRoutesService,
  type CollectionRoute,
  type RouteStatus,
} from '../../services/collectionRoutes.service';
import type { BadgeVariant } from '../../components/ui';

const STATUS_LABELS: Record<RouteStatus, string> = {
  PLANEJADA: 'Planejada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const ROUTE_STATUS_TO_BADGE: Record<RouteStatus, BadgeVariant> = {
  PLANEJADA: 'planned',
  EM_ANDAMENTO: 'in_progress',
  CONCLUIDA: 'completed',
  CANCELADA: 'cancelled',
};

const ALL_STATUSES: RouteStatus[] = ['PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];

export function CollectionRoutesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['collection-routes', search, statusFilter, page],
    queryFn: () =>
      collectionRoutesService.list({
        search,
        status: statusFilter,
        page,
        limit: 20,
      }),
  });

  void qc;

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div>
      <PageHeader
        title="Rotas de Coleta"
        subtitle="Gerencie as rotas de coleta da cooperativa"
        actions={
          <Button onClick={() => navigate('/collection-routes/new')}>
            Nova rota
          </Button>
        }
      />

      <FilterBar>
        <input
          className="border border-grafite-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-petroleo-500 focus:border-petroleo-500"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="border border-grafite-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="all">Todos os status</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </FilterBar>

      {isLoading ? (
        <LoadingState variant="skeleton" rows={8} />
      ) : !data?.data.length ? (
        <EmptyState
          title={search || statusFilter !== 'all' ? 'Nenhuma rota encontrada' : 'Nenhuma rota de coleta cadastrada'}
          description={
            search || statusFilter !== 'all'
              ? 'Tente ajustar os filtros para encontrar o que procura.'
              : 'Cadastre a primeira rota de coleta da cooperativa.'
          }
          action={
            !search && statusFilter === 'all' ? (
              <Button onClick={() => navigate('/collection-routes/new')}>Nova rota</Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-grafite-50 text-grafite-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">Data planejada</th>
                  <th className="px-4 py-3 text-left">Motorista</th>
                  <th className="px-4 py-3 text-left">Veículo</th>
                  <th className="px-4 py-3 text-left">Pontos</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grafite-100">
                {data.data.map((route: CollectionRoute) => (
                  <tr key={route.id} className="hover:bg-grafite-50">
                    <td className="px-4 py-3 font-medium text-grafite-800">{route.name}</td>
                    <td className="px-4 py-3 text-grafite-600">
                      {new Date(route.plannedDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-grafite-600">{route.driver?.email ?? '—'}</td>
                    <td className="px-4 py-3 text-grafite-600">{route.vehicle?.plate ?? '—'}</td>
                    <td className="px-4 py-3 text-grafite-600">{route.pointsCount ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={ROUTE_STATUS_TO_BADGE[route.status]} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/collection-routes/${route.id}`)}
                        className="mr-1"
                      >
                        Ver
                      </Button>
                      {route.status === 'PLANEJADA' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/collection-routes/${route.id}/edit`)}
                        >
                          Editar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
