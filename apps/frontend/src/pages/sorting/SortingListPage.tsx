import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, LoadingState, Pagination } from '../../components/ui';
import {
  sortingService,
  type SortingOperationListItem,
} from '../../services/sorting.service';

const STATUS_LABELS: Record<string, string> = {
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const STATUS_CLASSES: Record<string, string> = {
  CONCLUIDA: 'bg-ecocoop-50 text-ecocoop-700 border border-ecocoop-200',
  CANCELADA: 'bg-red-50 text-red-700 border border-red-200',
};

export function SortingListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['sorting-operations', statusFilter, page],
    queryFn: () =>
      sortingService.list({
        status: statusFilter || undefined,
        page,
        limit,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Triagens</h1>
          <p className="mt-1 text-sm text-gray-600">
            Registro de operações de triagem de material bruto
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/sorting/new')}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 shrink-0"
        >
          Nova triagem
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <select
          className="border border-grafite-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os status</option>
          <option value="CONCLUIDA">Concluída</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      {isLoading && <LoadingState message="Carregando triagens..." />}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          Não foi possível carregar as triagens. Verifique suas permissões.
        </div>
      )}

      {!isLoading && !error && (
        <>
          {data?.data.length === 0 ? (
            <EmptyState
              title="Nenhuma triagem encontrada"
              description="Registre a primeira triagem clicando em Nova triagem."
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Material bruto</th>
                    <th className="px-4 py-3 text-right">Qtd processada</th>
                    <th className="px-4 py-3 text-right">Outputs</th>
                    <th className="px-4 py-3 text-right">Rejeitos</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Responsável</th>
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.data.map((op: SortingOperationListItem) => (
                    <tr
                      key={op.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/sorting/${op.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {op.subcategory.name}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        {op.processedQuantity} {op.unit.symbol}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{op.outputsCount}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{op.rejectsCount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[op.status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {STATUS_LABELS[op.status] ?? op.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{op.user.email}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(op.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="text-xs text-petroleo-600 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/sorting/${op.id}`);
                          }}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-100">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
