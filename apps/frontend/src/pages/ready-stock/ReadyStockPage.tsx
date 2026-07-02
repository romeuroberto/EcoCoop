import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState, LoadingState, Pagination } from '../../components/ui';
import {
  readyStockService,
  type ReadyStockBalanceItem,
  type ReadyStockEventType,
  type ReadyStockMovement,
} from '../../services/readyStock.service';

const TYPE_LABELS: Record<ReadyStockEventType, string> = {
  TRIAGEM_OUTPUT: 'Triagem',
  AJUSTE: 'Ajuste',
  ESTORNO: 'Estorno',
};

const TYPE_CLASSES: Record<ReadyStockEventType, string> = {
  TRIAGEM_OUTPUT: 'bg-ecocoop-50 text-ecocoop-700 border border-ecocoop-200',
  AJUSTE: 'bg-amber-50 text-amber-700 border border-amber-200',
  ESTORNO: 'bg-red-50 text-red-700 border border-red-200',
};

type ActiveTab = 'balance' | 'movements';

export function ReadyStockPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('balance');
  const [typeFilter, setTypeFilter] = useState<ReadyStockEventType | ''>('');
  const [movementsPage, setMovementsPage] = useState(1);
  const movementsLimit = 20;

  const balanceQuery = useQuery({
    queryKey: ['ready-stock-balance'],
    queryFn: () => readyStockService.getBalance(),
  });

  const movementsQuery = useQuery({
    queryKey: ['ready-stock-movements', typeFilter, movementsPage],
    queryFn: () =>
      readyStockService.getMovements({
        type: typeFilter || undefined,
        page: movementsPage,
        limit: movementsLimit,
      }),
    enabled: activeTab === 'movements',
  });

  const totalMovementPages = movementsQuery.data
    ? Math.ceil(movementsQuery.data.total / movementsQuery.data.limit)
    : 1;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Estoque Pronto</h1>
        <p className="mt-1 text-sm text-gray-600">
          Saldo e histórico de movimentações de material pronto
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('balance')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'balance'
              ? 'border-petroleo-600 text-petroleo-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Saldo atual
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'movements'
              ? 'border-petroleo-600 text-petroleo-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Movimentações
        </button>
      </div>

      {/* ── Saldo atual ─────────────────────────────────────────────────────── */}
      {activeTab === 'balance' && (
        <>
          {balanceQuery.isLoading && <LoadingState message="Carregando saldo..." />}

          {balanceQuery.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              Não foi possível carregar o saldo. Verifique suas permissões.
            </div>
          )}

          {!balanceQuery.isLoading && !balanceQuery.error && (
            <>
              {balanceQuery.data?.data.length === 0 ? (
                <EmptyState
                  title="Nenhum saldo registrado"
                  description="Os saldos aparecerão aqui após a primeira triagem."
                />
              ) : (
                <>
                  {balanceQuery.data?.calculatedAt && (
                    <p className="text-xs text-gray-400 mb-2">
                      Calculado em:{' '}
                      {new Date(balanceQuery.data.calculatedAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                          <th className="px-4 py-3 text-left">Material</th>
                          <th className="px-4 py-3 text-left">Categoria</th>
                          <th className="px-4 py-3 text-right">Saldo</th>
                          <th className="px-4 py-3 text-right">Movimentações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {balanceQuery.data?.data.map((item: ReadyStockBalanceItem) => (
                          <tr key={`${item.subcategory.id}-${item.unit.id}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">
                              {item.subcategory.name}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {item.subcategory.category?.name ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-800">
                              {item.balance}{' '}
                              <span className="text-gray-400 text-xs">{item.unit.symbol}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-500">
                              {item.eventCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ── Movimentações ──────────────────────────────────────────────────── */}
      {activeTab === 'movements' && (
        <>
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <select
              className="border border-grafite-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as ReadyStockEventType | '');
                setMovementsPage(1);
              }}
            >
              <option value="">Todos os tipos</option>
              <option value="TRIAGEM_OUTPUT">Triagem</option>
              <option value="AJUSTE">Ajuste</option>
              <option value="ESTORNO">Estorno</option>
            </select>
          </div>

          {movementsQuery.isLoading && <LoadingState message="Carregando movimentações..." />}

          {movementsQuery.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              Não foi possível carregar as movimentações. Verifique suas permissões.
            </div>
          )}

          {!movementsQuery.isLoading && !movementsQuery.error && (
            <>
              {movementsQuery.data?.data.length === 0 ? (
                <EmptyState
                  title="Nenhuma movimentação encontrada"
                  description="As movimentações aparecerão aqui após as primeiras triagens."
                />
              ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Tipo</th>
                        <th className="px-4 py-3 text-left">Material</th>
                        <th className="px-4 py-3 text-right">Quantidade</th>
                        <th className="px-4 py-3 text-left">Responsável</th>
                        <th className="px-4 py-3 text-left">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {movementsQuery.data?.data.map((mv: ReadyStockMovement) => (
                        <tr key={mv.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_CLASSES[mv.type] ?? 'bg-gray-100 text-gray-600'}`}
                            >
                              {TYPE_LABELS[mv.type] ?? mv.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-800">{mv.subcategory.name}</td>
                          <td
                            className={`px-4 py-3 text-right font-mono ${parseFloat(mv.quantity) < 0 ? 'text-red-600' : 'text-gray-800'}`}
                          >
                            {parseFloat(mv.quantity) > 0 ? '+' : ''}
                            {mv.quantity}{' '}
                            <span className="text-gray-400 text-xs">{mv.unit.symbol}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{mv.user.email}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {new Date(mv.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {totalMovementPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100">
                      <Pagination
                        page={movementsPage}
                        totalPages={totalMovementPages}
                        onPageChange={setMovementsPage}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
