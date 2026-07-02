import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  EmptyState,
  FilterBar,
  LoadingState,
  Pagination,
} from '../../components/ui';
import {
  collectionRoutesService,
  type CollectionRoute,
  type RouteStatus,
} from '../../services/collectionRoutes.service';
import { routeTemplatesService } from '../../services/routeTemplates.service';
import type { RouteTemplate } from '../../services/routeTemplates.service';
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
  const [hasTemplateFilter, setHasTemplateFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data: templatesData } = useQuery({
    queryKey: ['route-templates', 'active-filter'],
    queryFn: () => routeTemplatesService.list({ status: 'ATIVO', limit: 100 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['collection-routes', search, statusFilter, hasTemplateFilter, templateFilter, page],
    queryFn: () =>
      collectionRoutesService.list({
        search,
        status: statusFilter,
        templateId: templateFilter === 'all' ? undefined : templateFilter,
        hasTemplate:
          templateFilter !== 'all'
            ? undefined
            : hasTemplateFilter === 'all'
              ? undefined
              : hasTemplateFilter === 'yes',
        page,
        limit: 20,
      }),
  });

  const duplicateMut = useMutation({
    mutationFn: (routeId: string) => collectionRoutesService.duplicate(routeId),
    onSuccess: (res) => {
      navigate('/collection-routes/new', { state: { draft: res.draft } });
    },
  });

  void qc;

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Rotas de Coleta</h1>
          <p className="mt-1 text-sm text-gray-600">Gerencie as rotas de coleta da cooperativa</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/collection-routes/new')}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          Nova rota
        </button>
      </div>

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
        <select
          className="border border-grafite-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
          value={hasTemplateFilter}
          onChange={(e) => { setHasTemplateFilter(e.target.value); setTemplateFilter('all'); setPage(1); }}
        >
          <option value="all">Todas as rotas</option>
          <option value="yes">Recorrentes</option>
          <option value="no">Avulsas</option>
        </select>
        <select
          className="border border-grafite-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
          value={templateFilter}
          onChange={(e) => { setTemplateFilter(e.target.value); setHasTemplateFilter(e.target.value === 'all' ? hasTemplateFilter : 'yes'); setPage(1); }}
        >
          <option value="all">Todos os modelos</option>
          {templatesData?.data.map((template: RouteTemplate) => (
            <option key={template.id} value={template.id}>{template.name}</option>
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
                  <th className="px-4 py-3 text-left">Tipo</th>
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
                    <td className="px-4 py-3">
                      {route.templateId ? (
                        <div className="flex flex-col gap-1">
                          <span className={[
                            'inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                            route.isException
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-petroleo-50 text-petroleo-700 border-petroleo-200',
                          ].join(' ')}>
                            {route.isException ? 'Exceção' : 'Recorrente'}
                          </span>
                          {route.template?.name && (
                            <span className="text-xs text-grafite-500">{route.template.name}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-grafite-400 text-xs">Avulsa</span>
                      )}
                    </td>
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
                          className="mr-1"
                        >
                          Editar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateMut.mutate(route.id)}
                        disabled={duplicateMut.isPending}
                      >
                        Duplicar
                      </Button>
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
