import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, LoadingState } from '../../components/ui';
import { salesService, type SaleDetail, type SaleStatus } from '../../services/sales.service';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

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

const timelineLabel: Record<string, string> = {
  CREATED: 'Criada',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelada',
};

const receivableStatusLabel: Record<string, string> = {
  A_RECEBER: 'A receber',
  CANCELADA: 'Cancelada',
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('pt-BR') : '-';
}

export function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const saleQuery = useQuery({
    queryKey: ['sales', id],
    queryFn: () => salesService.getSale(id!),
    enabled: Boolean(id),
  });

  if (saleQuery.isLoading) return <LoadingState message="Carregando venda..." />;

  if (saleQuery.error || !saleQuery.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Não foi possível carregar os detalhes da venda.
      </div>
    );
  }

  const sale: SaleDetail = saleQuery.data;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/vendas')}
        className="mb-4 text-sm text-gray-400 hover:text-gray-600"
      >
        ← Vendas
      </button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Venda</h1>
            <span className={`rounded-full px-2 py-1 text-xs ${statusClass[sale.status]}`}>
              {statusLabel[sale.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">{sale.buyer.legalName}</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => navigate('/vendas')}>
          Voltar
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-800">Dados da venda</h2>
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-400">Comprador</p>
              <p className="font-medium text-gray-800">{sale.buyer.legalName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Documento</p>
              <p className="font-medium text-gray-800">{sale.buyer.documentNumber ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Criada em</p>
              <p className="font-medium text-gray-800">{formatDate(sale.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Responsável</p>
              <p className="font-medium text-gray-800">{sale.user.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Entrega</p>
              <p className="font-medium text-gray-800">{formatDate(sale.deliveredAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Cancelamento</p>
              <p className="font-medium text-gray-800">{formatDate(sale.cancelledAt)}</p>
            </div>
            {sale.cancelReason && (
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-400">Motivo do cancelamento</p>
                <p className="font-medium text-gray-800">{sale.cancelReason}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-800">Conta a receber</h2>
          {sale.accountReceivable ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Valor</span>
                <span className="font-medium text-gray-800">
                  {currency.format(Number(sale.accountReceivable.amount))}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Vencimento</span>
                <span className="font-medium text-gray-800">
                  {new Date(`${sale.accountReceivable.dueDate}T00:00:00`).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Status</span>
                <span className="font-medium text-gray-800">
                  {receivableStatusLabel[sale.accountReceivable.status]}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Conta a receber não encontrada.</p>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Material</th>
              <th className="px-4 py-3 text-left">Unidade</th>
              <th className="px-4 py-3 text-right">Quantidade</th>
              <th className="px-4 py-3 text-right">Preço unit.</th>
              <th className="px-4 py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sale.items.map((item: SaleDetail['items'][number]) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium text-gray-800">{item.subcategory.name}</td>
                <td className="px-4 py-3 text-gray-600">{item.unit.symbol}</td>
                <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {currency.format(Number(item.unitPrice))}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-800">
                  {currency.format(Number(item.subtotal))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                Total
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                {currency.format(Number(sale.totalAmount))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">Timeline</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {sale.timeline.map((event: SaleDetail['timeline'][number]) => (
            <div key={event.event} className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-800">{timelineLabel[event.event]}</p>
              <p className="mt-1 text-xs text-gray-500">{formatDate(event.at)}</p>
              <p className="mt-2 text-xs text-gray-400">{event.by?.email ?? '-'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
