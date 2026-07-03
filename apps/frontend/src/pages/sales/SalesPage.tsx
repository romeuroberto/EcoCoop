import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, LoadingState } from '../../components/ui';
import { buyersService, type Buyer } from '../../services/buyers.service';
import { materialSubcategoriesService } from '../../services/materialSubcategories.service';
import type { MaterialSubcategory } from '../../services/materialSubcategories.service';
import { salesService, type CreatedSale, type SaleListItem, type SaleStatus } from '../../services/sales.service';
import { useAuthStore } from '../../store/auth.store';
import { SaleFormModal } from './SaleFormModal';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const canCreateSales = (user: ReturnType<typeof useAuthStore.getState>['user']) =>
  Boolean(user?.permissions.some((p) => p.module === 'SALES' && p.action === 'CREATE'));

const canDeliverSales = (user: ReturnType<typeof useAuthStore.getState>['user']) =>
  Boolean(user?.permissions.some((p) => p.module === 'SALES' && p.action === 'DELIVER'));

const canCancelSales = (user: ReturnType<typeof useAuthStore.getState>['user']) =>
  Boolean(user?.permissions.some((p) => p.module === 'SALES' && p.action === 'CANCEL'));

const statusLabel: Record<SaleStatus, string> = {
  PENDENTE_ENTREGA: 'Pendente entrega',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
};

const statusClass: Record<SaleStatus, string> = {
  PENDENTE_ENTREGA: 'bg-amber-50 text-amber-700 border border-amber-200',
  ENTREGUE: 'bg-green-50 text-green-700 border border-green-200',
  CANCELADA: 'bg-red-50 text-red-700 border border-red-200',
};

function getApiError(err: unknown, fallback: string) {
  const data = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data;
  if (data?.code === 'SALE_NOT_DELIVERABLE') return 'Esta venda não pode ter entrega confirmada neste status.';
  if (data?.code === 'SALE_NOT_CANCELLABLE') return 'Esta venda não pode ser cancelada neste status.';
  if (data?.code === 'CANCEL_REASON_REQUIRED') return 'Informe o motivo do cancelamento.';
  if (data?.code === 'SALE_NOT_FOUND') return 'Venda não encontrada. Atualize a tela e tente novamente.';
  return data?.message ?? fallback;
}

export function SalesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState<SaleStatus | ''>('');
  const [buyerId, setBuyerId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const limit = 20;

  const salesQuery = useQuery({
    queryKey: ['sales', { status, buyerId, subcategoryId, from, to, page, limit }],
    queryFn: () =>
      salesService.listSales({
        status: status || undefined,
        buyerId: buyerId || undefined,
        subcategoryId: subcategoryId || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit,
      }),
  });

  const buyersQuery = useQuery({
    queryKey: ['buyers', 'sales-filter'],
    queryFn: () => buyersService.list({ status: 'active', limit: 200 }),
  });

  const subcategoriesQuery = useQuery({
    queryKey: ['subcategories', 'sales-filter'],
    queryFn: () => materialSubcategoriesService.list({ status: 'active', limit: 300 }),
  });

  const buyers = buyersQuery.data?.data ?? [];
  const subcategories = (subcategoriesQuery.data?.data ?? []).filter(
    (subcategory: MaterialSubcategory) => subcategory.isSellable,
  );
  const totalPages = salesQuery.data ? Math.max(1, Math.ceil(salesQuery.data.total / salesQuery.data.limit)) : 1;

  const handleCreated = (sale: CreatedSale) => {
    setSuccessMessage('Venda registrada com sucesso.');
    setErrorMessage(null);
    qc.invalidateQueries({ queryKey: ['sales'] });
    navigate(`/vendas/${sale.id}`);
  };

  const deliverMutation = useMutation({
    mutationFn: (id: string) => salesService.deliverSale(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      setSuccessMessage('Entrega confirmada com sucesso.');
      setErrorMessage(null);
    },
    onError: (err) => setErrorMessage(getApiError(err, 'Erro ao confirmar entrega. Tente novamente.')),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, cancelReason }: { id: string; cancelReason: string }) =>
      salesService.cancelSale(id, { cancelReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      setSuccessMessage('Venda cancelada com sucesso.');
      setErrorMessage(null);
    },
    onError: (err) => setErrorMessage(getApiError(err, 'Erro ao cancelar venda. Tente novamente.')),
  });

  const handleCancelSale = (saleId: string) => {
    const confirmed = window.confirm('Deseja cancelar esta venda? O estoque pronto será estornado.');
    if (!confirmed) return;

    const cancelReason = window.prompt('Informe o motivo do cancelamento:')?.trim();
    if (!cancelReason) {
      setErrorMessage('Informe o motivo do cancelamento.');
      return;
    }

    cancelMutation.mutate({ id: saleId, cancelReason });
  };

  const resetFilters = () => {
    setStatus('');
    setBuyerId('');
    setSubcategoryId('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  return (
    <div>
      {showForm && (
        <SaleFormModal onClose={() => setShowForm(false)} onCreated={handleCreated} />
      )}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Vendas</h1>
          <p className="mt-1 text-sm text-gray-600">
            Histórico operacional de vendas de estoque pronto.
          </p>
        </div>

        {canCreateSales(user) && (
          <Button type="button" onClick={() => setShowForm(true)}>
            Nova venda
          </Button>
        )}
      </div>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_0.7fr_0.7fr_auto]">
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={buyerId}
            onChange={(event) => { setBuyerId(event.target.value); setPage(1); }}
          >
            <option value="">Todos os compradores</option>
            {buyers.map((buyer: Buyer) => (
              <option key={buyer.id} value={buyer.id}>{buyer.legalName}</option>
            ))}
          </select>

          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={status}
            onChange={(event) => { setStatus(event.target.value as SaleStatus | ''); setPage(1); }}
          >
            <option value="">Todos os status</option>
            <option value="PENDENTE_ENTREGA">Pendente entrega</option>
            <option value="ENTREGUE">Entregue</option>
            <option value="CANCELADA">Cancelada</option>
          </select>

          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={subcategoryId}
            onChange={(event) => { setSubcategoryId(event.target.value); setPage(1); }}
          >
            <option value="">Todos os materiais</option>
            {subcategories.map((subcategory: MaterialSubcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.category.name} - {subcategory.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={from}
            onChange={(event) => { setFrom(event.target.value); setPage(1); }}
          />
          <input
            type="date"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={to}
            onChange={(event) => { setTo(event.target.value); setPage(1); }}
          />
          <Button type="button" variant="secondary" onClick={resetFilters}>
            Limpar
          </Button>
        </div>
      </div>

      {salesQuery.isLoading && <LoadingState message="Carregando vendas..." />}

      {salesQuery.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Não foi possível carregar o histórico de vendas.
        </div>
      )}

      {!salesQuery.isLoading && !salesQuery.error && salesQuery.data?.data.length === 0 && (
        <div className="rounded-xl bg-white shadow-sm">
          <EmptyState
            title="Nenhuma venda encontrada"
            description="Ajuste os filtros ou registre uma nova venda operacional."
            action={canCreateSales(user) ? <Button type="button" onClick={() => setShowForm(true)}>Nova venda</Button> : null}
          />
        </div>
      )}

      {!salesQuery.isLoading && !salesQuery.error && Boolean(salesQuery.data?.data.length) && (
        <>
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Comprador</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-right">Itens</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {salesQuery.data?.data.map((sale: SaleListItem) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{sale.buyer.legalName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(sale.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{sale.itemsCount}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {currency.format(Number(sale.totalAmount))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs ${statusClass[sale.status]}`}>
                        {statusLabel[sale.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="secondary" onClick={() => navigate(`/vendas/${sale.id}`)}>
                          Ver
                        </Button>
                        {sale.status === 'PENDENTE_ENTREGA' && canDeliverSales(user) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            isLoading={deliverMutation.isPending}
                            onClick={() => deliverMutation.mutate(sale.id)}
                          >
                            Confirmar entrega
                          </Button>
                        )}
                        {sale.status === 'PENDENTE_ENTREGA' && canCancelSales(user) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            isLoading={cancelMutation.isPending}
                            onClick={() => handleCancelSale(sale.id)}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
