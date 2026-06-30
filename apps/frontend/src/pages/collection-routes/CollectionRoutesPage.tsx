import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collectionRoutesService,
  type CollectionRoute,
  type RouteStatus,
} from '../../services/collectionRoutes.service';

const STATUS_LABELS: Record<RouteStatus, string> = {
  PLANEJADA: 'Planejada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const STATUS_COLORS: Record<RouteStatus, string> = {
  PLANEJADA: 'bg-blue-100 text-blue-700',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-700',
  CONCLUIDA: 'bg-green-100 text-green-700',
  CANCELADA: 'bg-gray-100 text-gray-500',
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Rotas de Coleta</h1>
        <button
          onClick={() => navigate('/collection-routes/new')}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          Nova rota
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <input
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="all">Todos os status</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Carregando...</div>
        ) : !data?.data.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">Nenhuma rota encontrada.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
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
            <tbody className="divide-y divide-gray-100">
              {data.data.map((route: CollectionRoute) => (
                <tr key={route.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{route.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(route.plannedDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{route.driver?.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{route.vehicle?.plate ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{route.pointsCount ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[route.status]}`}
                    >
                      {STATUS_LABELS[route.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/collection-routes/${route.id}`)}
                      className="text-brand-600 hover:underline text-xs mr-3"
                    >
                      Ver
                    </button>
                    {route.status === 'PLANEJADA' && (
                      <button
                        onClick={() => navigate(`/collection-routes/${route.id}/edit`)}
                        className="text-gray-500 hover:underline text-xs"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 text-sm border rounded disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500 self-center">
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 text-sm border rounded disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
