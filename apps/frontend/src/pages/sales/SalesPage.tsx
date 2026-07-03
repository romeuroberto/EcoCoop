import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState } from '../../components/ui';
import { salesService, type CreatedSale, type SaleListItem } from '../../services/sales.service';
import { useAuthStore } from '../../store/auth.store';
import { SaleFormModal } from './SaleFormModal';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const canCreateSales = (user: ReturnType<typeof useAuthStore.getState>['user']) =>
  Boolean(user?.permissions.some((p) => p.module === 'SALES' && p.action === 'CREATE'));

const canDeliverSales = (user: ReturnType<typeof useAuthStore.getState>['user']) =>
  Boolean(user?.permissions.some((p) => p.module === 'SALES' && p.action === 'DELIVER'));

const canCancelSales = (user: ReturnType<typeof useAuthStore.getState>['user']) =>
  Boolean(user?.permissions.some((p) => p.module === 'SALES' && p.action === 'CANCEL'));

const statusLabel: Record<SaleListItem['status'], string> = {
  PENDENTE_ENTREGA: 'Pendente entrega',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
};

const statusClass: Record<SaleListItem['status'], string> = {
  PENDENTE_ENTREGA: 'bg-amber-50 text-amber-700 border border-amber-200',
  ENTREGUE: 'bg-green-50 text-green-700 border border-green-200',
  CANCELADA: 'bg-red-50 text-red-700 border border-red-200',
};

function toListItem(sale: CreatedSale): SaleListItem {
  return {
    id: sale.id,
    buyer: sale.buyer,
    status: sale.status,
    totalAmount: sale.totalAmount,
    itemsCount: sale.items.length,
    createdAt: sale.createdAt,
    user: sale.user,
    deliveredAt: sale.deliveredAt ?? null,
    deliveredBy: sale.deliveredBy ?? null,
    cancelReason: sale.cancelReason ?? null,
    cancelledAt: sale.cancelledAt ?? null,
    cancelledBy: sale.cancelledBy ?? null,
  };
}

export function SalesPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [showForm, setShowForm] = useState(false);
  const [createdSales, setCreatedSales] = useState<SaleListItem[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreated = (sale: CreatedSale) => {
    setCreatedSales((prev) => [toListItem(sale), ...prev]);
    setSuccessMessage('Venda registrada com sucesso.');
    setErrorMessage(null);
  };

  const deliverMutation = useMutation({
    mutationFn: (id: string) => salesService.deliverSale(id),
    onSuccess: (delivered) => {
      setCreatedSales((prev) =>
        prev.map((sale) =>
          sale.id === delivered.id
            ? {
                ...sale,
                status: delivered.status,
                deliveredAt: delivered.deliveredAt ?? null,
                deliveredBy: delivered.deliveredBy ?? null,
              }
            : sale,
        ),
      );
      qc.invalidateQueries({ queryKey: ['sales'] });
      setSuccessMessage('Entrega confirmada com sucesso.');
      setErrorMessage(null);
    },
    onError: (err) => {
      const data = (err as { response?: { status?: number; data?: { code?: string; message?: string } } })
        ?.response?.data;
      if (data?.code === 'SALE_NOT_DELIVERABLE') {
        setErrorMessage('Esta venda não pode ter entrega confirmada neste status.');
      } else if (data?.code === 'SALE_NOT_FOUND') {
        setErrorMessage('Venda não encontrada. Atualize a tela e tente novamente.');
      } else {
        setErrorMessage(data?.message ?? 'Erro ao confirmar entrega. Tente novamente.');
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, cancelReason }: { id: string; cancelReason: string }) =>
      salesService.cancelSale(id, { cancelReason }),
    onSuccess: (cancelled) => {
      setCreatedSales((prev) =>
        prev.map((sale) =>
          sale.id === cancelled.id
            ? {
                ...sale,
                status: cancelled.status,
                cancelReason: cancelled.cancelReason ?? null,
                cancelledAt: cancelled.cancelledAt ?? null,
                cancelledBy: cancelled.cancelledBy ?? null,
              }
            : sale,
        ),
      );
      qc.invalidateQueries({ queryKey: ['sales'] });
      setSuccessMessage('Venda cancelada com sucesso.');
      setErrorMessage(null);
    },
    onError: (err) => {
      const data = (err as { response?: { status?: number; data?: { code?: string; message?: string } } })
        ?.response?.data;
      if (data?.code === 'SALE_NOT_CANCELLABLE') {
        setErrorMessage('Esta venda não pode ser cancelada neste status.');
      } else if (data?.code === 'CANCEL_REASON_REQUIRED') {
        setErrorMessage('Informe o motivo do cancelamento.');
      } else if (data?.code === 'SALE_NOT_FOUND') {
        setErrorMessage('Venda não encontrada. Atualize a tela e tente novamente.');
      } else {
        setErrorMessage(data?.message ?? 'Erro ao cancelar venda. Tente novamente.');
      }
    },
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

  return (
    <div>
      {showForm && (
        <SaleFormModal
          onClose={() => setShowForm(false)}
          onCreated={handleCreated}
        />
      )}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Vendas</h1>
          <p className="mt-1 text-sm text-gray-600">
            Registro operacional de vendas de estoque pronto.
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

      {createdSales.length === 0 ? (
        <div className="rounded-xl bg-white shadow-sm">
          <EmptyState
            title="Nenhuma venda registrada nesta sessão"
            description="Use o botão Nova venda para registrar a primeira saída comercial de estoque pronto."
            action={
              canCreateSales(user) ? (
                <Button type="button" onClick={() => setShowForm(true)}>
                  Nova venda
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
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
              {createdSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {sale.buyer.legalName}
                  </td>
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
                  <td className="px-4 py-3 text-right">
                    {sale.status === 'PENDENTE_ENTREGA' && (
                      <div className="flex justify-end gap-2">
                        {canDeliverSales(user) && (
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
                        {canCancelSales(user) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            isLoading={cancelMutation.isPending}
                            onClick={() => handleCancelSale(sale.id)}
                          >
                            Cancelar venda
                          </Button>
                        )}
                      </div>
                    )}
                    {sale.status !== 'PENDENTE_ENTREGA' && (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
