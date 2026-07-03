import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LoadingState } from '../../components/ui';
import {
  sortingService,
  type SortingOutput,
  type SortingReject,
} from '../../services/sorting.service';
import { useAuthStore } from '../../store/auth.store';

const STATUS_LABELS: Record<string, string> = {
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const STATUS_CLASSES: Record<string, string> = {
  CONCLUIDA: 'bg-ecocoop-50 text-ecocoop-700 border border-ecocoop-200',
  CANCELADA: 'bg-red-50 text-red-700 border border-red-200',
};

const REJECT_TYPE_LABELS: Record<string, string> = {
  REJEITO: 'Rejeito',
  PERDA: 'Perda',
  PERDA_INERENTE: 'Perda inerente',
};

const REJECT_TYPE_CLASSES: Record<string, string> = {
  REJEITO: 'bg-orange-50 text-orange-700',
  PERDA: 'bg-amber-50 text-amber-700',
  PERDA_INERENTE: 'bg-grafite-100 text-grafite-600 italic',
};

const CANCEL_ERROR_MESSAGES: Record<string, string> = {
  SORTING_ALREADY_CANCELLED: 'Esta triagem já foi cancelada.',
  CANCELLATION_WOULD_CAUSE_NEGATIVE_READY_STOCK:
    'Não é possível cancelar: o estorno causaria saldo pronto negativo.',
  CANCEL_REASON_REQUIRED: 'O motivo do cancelamento é obrigatório.',
  SORTING_OPERATION_NOT_FOUND: 'Triagem não encontrada.',
};

function getCancelError(err: unknown): string {
  const data = (err as { response?: { data?: { code?: string; message?: string } } })
    ?.response?.data;
  if (data?.code && CANCEL_ERROR_MESSAGES[data.code]) return CANCEL_ERROR_MESSAGES[data.code];
  return data?.message ?? 'Erro ao cancelar a triagem. Tente novamente.';
}

const canCancelSorting = (user: ReturnType<typeof useAuthStore.getState>['user']) =>
  Boolean(user?.permissions.some((p) => p.module === 'SORTING' && p.action === 'CANCEL'));

export function SortingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  const { data: op, isLoading, error } = useQuery({
    queryKey: ['sorting-operation', id],
    queryFn: () => sortingService.getById(id!),
    enabled: Boolean(id),
  });

  const cancelMut = useMutation({
    mutationFn: () => sortingService.cancel(id!, cancelReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sorting-operation', id] });
      qc.invalidateQueries({ queryKey: ['sorting-operations'] });
      qc.invalidateQueries({ queryKey: ['ready-stock-balance'] });
      qc.invalidateQueries({ queryKey: ['ready-stock-movements'] });
      setShowCancelForm(false);
      setCancelReason('');
      setCancelError(null);
    },
    onError: (err) => setCancelError(getCancelError(err)),
  });

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCancelError(null);
    if (!cancelReason.trim()) {
      setCancelError('O motivo do cancelamento é obrigatório.');
      return;
    }
    cancelMut.mutate();
  };

  if (isLoading) {
    return <LoadingState message="Carregando triagem..." />;
  }

  if (error) {
    const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
    return (
      <div>
        <button
          onClick={() => navigate('/sorting')}
          className="mb-4 text-sm text-gray-400 hover:text-gray-600"
        >
          ← Triagens
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {code === 'SORTING_OPERATION_NOT_FOUND'
            ? 'Triagem não encontrada.'
            : 'Não foi possível carregar a triagem. Verifique suas permissões.'}
        </div>
      </div>
    );
  }

  if (!op) return null;

  const isConcluida = op.status === 'CONCLUIDA';
  const showCancelButton = isConcluida && canCancelSorting(user);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={() => navigate('/sorting')}
            className="mb-2 text-sm text-gray-400 hover:text-gray-600"
          >
            ← Triagens
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">
              Triagem — {op.subcategory.name}
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASSES[op.status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {STATUS_LABELS[op.status] ?? op.status}
            </span>
          </div>
        </div>

        {showCancelButton && !showCancelForm && (
          <button
            type="button"
            onClick={() => setShowCancelForm(true)}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Cancelar triagem
          </button>
        )}
      </div>

      {/* Cancel notice (after successful cancel) */}
      {op.status === 'CANCELADA' && op.cancelReason && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="font-medium">Motivo do cancelamento:</span> {op.cancelReason}
          {op.cancelledBy && (
            <span className="ml-2 text-red-500">
              por {op.cancelledBy.email}
              {op.cancelledAt &&
                ` em ${new Date(op.cancelledAt).toLocaleString('pt-BR')}`}
            </span>
          )}
        </div>
      )}

      {/* Cancel form (inline confirmation) */}
      {showCancelForm && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h3 className="text-sm font-semibold text-red-800 mb-1">Confirmar cancelamento</h3>
          <p className="text-xs text-red-600 mb-4">
            O cancelamento é irreversível. Os saldos bruto e pronto serão estornados via evento.
          </p>

          {cancelError && (
            <div className="mb-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-700">
              {cancelError}
            </div>
          )}

          <form onSubmit={handleCancelSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-red-700 mb-1">
                Motivo do cancelamento *
              </label>
              <textarea
                className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                rows={3}
                placeholder="Descreva o motivo do cancelamento..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={cancelMut.isPending}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelMut.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
              <button
                type="button"
                disabled={cancelMut.isPending}
                onClick={() => {
                  setShowCancelForm(false);
                  setCancelReason('');
                  setCancelError(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Voltar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary card */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Resumo</h2>
        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="block text-xs text-gray-500">Material bruto</span>
            <span className="font-medium text-gray-800">{op.subcategory.name}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-500">Unidade</span>
            <span className="font-medium text-gray-800">{op.unit.symbol}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-500">Quantidade processada</span>
            <span className="font-mono font-semibold text-gray-800">
              {op.processedQuantity} {op.unit.symbol}
            </span>
          </div>
          <div>
            <span className="block text-xs text-gray-500">Responsável</span>
            <span className="font-medium text-gray-800">{op.user.email}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-500">Data</span>
            <span className="font-medium text-gray-800">
              {new Date(op.createdAt).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* Outputs */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Material pronto gerado{' '}
          <span className="text-gray-400 font-normal">({op.outputs.length} item{op.outputs.length !== 1 ? 's' : ''})</span>
        </h2>
        {op.outputs.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum output registrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Subcategoria</th>
                <th className="px-3 py-2 text-right">Quantidade</th>
                <th className="px-3 py-2 text-left">Unidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {op.outputs.map((out: SortingOutput) => (
                <tr key={out.id}>
                  <td className="px-3 py-2 font-medium text-gray-800">{out.subcategory.name}</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-700">{out.quantity}</td>
                  <td className="px-3 py-2 text-gray-500">{out.unit.symbol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Rejects */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Rejeitos e perdas{' '}
          <span className="text-gray-400 font-normal">({op.rejects.length} item{op.rejects.length !== 1 ? 's' : ''})</span>
        </h2>
        {op.rejects.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum rejeito ou perda registrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Subcategoria</th>
                <th className="px-3 py-2 text-right">Quantidade</th>
                <th className="px-3 py-2 text-left">Unidade</th>
                <th className="px-3 py-2 text-left">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {op.rejects.map((rej: SortingReject) => (
                <tr
                  key={rej.id}
                  className={rej.type === 'PERDA_INERENTE' ? 'bg-grafite-50' : ''}
                >
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${REJECT_TYPE_CLASSES[rej.type] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {REJECT_TYPE_LABELS[rej.type] ?? rej.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {rej.subcategory?.name ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-700">{rej.quantity}</td>
                  <td className="px-3 py-2 text-gray-500">{rej.unit.symbol}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {rej.description ?? <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
